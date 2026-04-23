import fs from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_TIME_ZONE,
  addDays,
  approxEqual,
  buildAnalysis,
  buildVerificationMarkdown,
  comparePreVerification,
  CURRENCY_TOLERANCE,
  createServiceClient,
  ensureDir,
  fetchAllRows,
  parseArgs,
  QTY_TOLERANCE,
  toDateKeyInTimeZone,
  writeJson,
  writeMarkdown,
} from "./database-cleanup-lib.mjs";

const VALID_STAGES = new Set(["full", "kiosk-only", "shift-only"]);

function printUsage() {
  console.log(`Usage:
  node scripts/database-cleanup-verify.mjs --analysis <analysis.json> --mode pre
  node scripts/database-cleanup-verify.mjs --analysis <analysis.json> --mode post --stage kiosk-only
  node scripts/database-cleanup-verify.mjs --analysis <analysis.json> --mode post --stage full
`);
}

async function loadAnalysis(analysisPath) {
  const raw = await fs.readFile(analysisPath, "utf8");
  return JSON.parse(raw);
}

async function loadBackupRows(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.rows) ? parsed.rows : [];
}

async function buildPostVerificationReport(
  analysis,
  supabase,
  stage = "full",
  verificationDir = null,
) {
  const dailyOrders = await fetchAllRows(
    supabase,
    "daily_orders",
    "order_id, business_date, opened_at, closed_at, subtotal, total, order_source, voided",
    {
      order: { column: "order_id", ascending: true },
    },
  );
  const salesRows = await fetchAllRows(
    supabase,
    "sales_line_items",
    "id, business_date, menu_item_id, qty, net_sales",
    {
      order: { column: "id", ascending: true },
    },
  );
  const consumeTxns = await fetchAllRows(
    supabase,
    "inventory_txns",
    "id, business_date, note, qty_delta, txn_type",
    {
      filter: (query) => query.eq("txn_type", "CONSUME"),
      order: { column: "id", ascending: true },
    },
  );
  const appConfigRows = await fetchAllRows(
    supabase,
    "app_config",
    "key, value",
    {
      filter: (query) => query.eq("key", "onboarding"),
    },
  );
  const onboarding = appConfigRows[0] || null;

  const mismatches = [];
  const expectedDailyOrderCount = analysis.current_state.daily_orders.count;
  const expectedConsumeCount = analysis.current_state.inventory_txns_consume.count;

  if (dailyOrders.length !== expectedDailyOrderCount) {
    mismatches.push(
      `daily_orders count changed unexpectedly (${dailyOrders.length} != ${expectedDailyOrderCount})`,
    );
  }
  if (consumeTxns.length !== expectedConsumeCount) {
    mismatches.push(
      `inventory_txns CONSUME count changed unexpectedly (${consumeTxns.length} != ${expectedConsumeCount})`,
    );
  }

  const expectedOverallMaxDate =
    stage === "kiosk-only"
      ? analysis.proposed_repair.corrected_max_order_date
      : analysis.proposed_repair.shift_target_date;
  const expectedHistoryStart =
    stage === "kiosk-only"
      ? analysis.current_state.app_config.history_start_date
      : addDays(
        analysis.current_state.app_config.history_start_date,
        analysis.proposed_repair.shift_delta_days,
      );
  const expectedHistoryEnd =
    stage === "kiosk-only"
      ? analysis.current_state.app_config.history_end_date
      : addDays(
        analysis.current_state.app_config.history_end_date,
        analysis.proposed_repair.shift_delta_days,
      );

  if ((onboarding?.value?.history_start_date || null) !== expectedHistoryStart) {
    mismatches.push("app_config history_start_date does not match the expected post-stage value.");
  }
  if ((onboarding?.value?.history_end_date || null) !== expectedHistoryEnd) {
    mismatches.push("app_config history_end_date does not match the expected post-stage value.");
  }

  const actualMaxDate = dailyOrders
    .filter((row) => !row.voided && row.business_date)
    .map((row) => row.business_date)
    .sort()
    .slice(-1)[0] || null;
  if (actualMaxDate !== expectedOverallMaxDate) {
    mismatches.push(
      `Max business_date after ${stage} should be ${expectedOverallMaxDate}, found ${actualMaxDate}.`,
    );
  }

  const dailyOrdersById = new Map(dailyOrders.map((row) => [row.order_id, row]));
  const expectedKioskRows = analysis.kiosk_orders.all_rows;
  const expectedCorrectionByOrderId = new Map(
    analysis.kiosk_orders.eligible_anomalies.map((row) => [row.order_id, row.corrected_business_date]),
  );
  for (const order of expectedKioskRows) {
    const repaired = dailyOrdersById.get(order.order_id);
    if (!repaired) {
      mismatches.push(`Missing repaired kiosk order ${order.order_id}.`);
      continue;
    }

    const baseBusinessDate =
      expectedCorrectionByOrderId.get(order.order_id) ||
      order.corrected_business_date ||
      order.stored_business_date;
    const expectedBusinessDate =
      stage === "kiosk-only"
        ? baseBusinessDate
        : addDays(
          baseBusinessDate,
          analysis.proposed_repair.shift_delta_days,
        );
    if (repaired.business_date !== expectedBusinessDate) {
      mismatches.push(
        `Kiosk order ${order.order_id} expected business_date ${expectedBusinessDate}, found ${repaired.business_date}.`,
      );
    }

    const actualEasternDate = toDateKeyInTimeZone(
      repaired.opened_at || repaired.closed_at,
      analysis.time_zone,
    );
    if (actualEasternDate && actualEasternDate !== repaired.business_date) {
      mismatches.push(
        `Kiosk order ${order.order_id} still disagrees with ${analysis.time_zone} order day (${actualEasternDate} vs ${repaired.business_date}).`,
      );
    }
  }

  const kioskRowsForMax = analysis.kiosk_orders.eligible_anomalies.length > 0
    ? analysis.kiosk_orders.eligible_anomalies
    : analysis.kiosk_orders.all_rows;
  const actualKioskMaxDate = kioskRowsForMax
    .map((order) => dailyOrdersById.get(order.order_id)?.business_date || null)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null;
  const expectedKioskMaxDate =
    kioskRowsForMax.length === 0
      ? null
      : stage === "kiosk-only"
        ? analysis.kiosk_orders.eligible_anomalies.length > 0
          ? analysis.proposed_repair.corrected_max_order_date
          : analysis.current_state.daily_orders.max_date
        : analysis.proposed_repair.shift_target_date;
  if (expectedKioskMaxDate && actualKioskMaxDate !== expectedKioskMaxDate) {
    mismatches.push(
      `Kiosk-corrected max business_date should be ${expectedKioskMaxDate}, found ${actualKioskMaxDate}.`,
    );
  }

  const orderDatesByOrderId = new Map(
    dailyOrders
      .filter((row) => row.order_id)
      .map((row) => [row.order_id, row.business_date]),
  );
  for (const txn of consumeTxns) {
    const note = txn.note || "";
    const match = /^Order ([^:]+): /.exec(note);
    if (!match) {
      continue;
    }

    const orderDate = orderDatesByOrderId.get(match[1]);
    if (orderDate && txn.business_date !== orderDate) {
      mismatches.push(
        `Inventory consume row ${txn.id} no longer matches order ${match[1]} business_date.`,
      );
      break;
    }
  }

  const totalSales = salesRows.reduce((sum, row) => sum + Number(row.net_sales || 0), 0);
  const totalSalesQty = salesRows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const totalOrdersSubtotal = dailyOrders
    .filter((row) => !row.voided)
    .reduce((sum, row) => sum + Number(row.subtotal || 0), 0);
  if (!approxEqual(
    totalSales,
    analysis.current_state.sales_line_items.total_net_sales,
    CURRENCY_TOLERANCE,
  )) {
    mismatches.push(
      `sales_line_items total net_sales changed unexpectedly (${Number(totalSales.toFixed(2))} != ${analysis.current_state.sales_line_items.total_net_sales}).`,
    );
  }

  if (!approxEqual(
    totalSalesQty,
    analysis.current_state.sales_line_items.total_qty,
    QTY_TOLERANCE,
  )) {
    mismatches.push(
      `sales_line_items total qty changed unexpectedly (${Number(totalSalesQty.toFixed(3))} != ${analysis.current_state.sales_line_items.total_qty}).`,
    );
  }

  if (!approxEqual(
    totalOrdersSubtotal,
    analysis.current_state.daily_orders.non_voided_subtotal_total,
    CURRENCY_TOLERANCE,
  )) {
    mismatches.push(
      `daily_orders subtotal total changed unexpectedly (${Number(totalOrdersSubtotal.toFixed(2))} != ${analysis.current_state.daily_orders.non_voided_subtotal_total}).`,
    );
  }

  let totalConsumeQtyDelta = Number(
    consumeTxns.reduce((sum, row) => sum + Number(row.qty_delta || 0), 0).toFixed(3),
  );
  if (stage === "kiosk-only" && verificationDir) {
    const backupPath = path.join(
      verificationDir,
      "backup",
      "affected-kiosk-consume-transactions.json",
    );
    try {
      const backupRows = await loadBackupRows(backupPath);
      const backupById = new Map(backupRows.map((row) => [row.id, row]));
      const currentAffectedRows = consumeTxns.filter((row) => backupById.has(row.id));
      const backupTotal = Number(
        backupRows.reduce((sum, row) => sum + Number(row.qty_delta || 0), 0).toFixed(3),
      );
      const currentAffectedTotal = Number(
        currentAffectedRows.reduce((sum, row) => sum + Number(row.qty_delta || 0), 0).toFixed(3),
      );

      if (currentAffectedRows.length !== backupRows.length) {
        mismatches.push(
          `Affected kiosk consume row count changed unexpectedly (${currentAffectedRows.length} != ${backupRows.length}).`,
        );
      }
      if (!approxEqual(currentAffectedTotal, backupTotal, QTY_TOLERANCE)) {
        mismatches.push(
          `Affected kiosk consume qty_delta changed unexpectedly (${currentAffectedTotal} != ${backupTotal}).`,
        );
      }
      for (const row of currentAffectedRows) {
        const backupRow = backupById.get(row.id);
        if (!approxEqual(Number(row.qty_delta || 0), Number(backupRow.qty_delta || 0), QTY_TOLERANCE)) {
          mismatches.push(`Affected kiosk consume row ${row.id} changed qty_delta unexpectedly.`);
          break;
        }
      }
    } catch (_error) {
      mismatches.push("Stage backup for affected kiosk consume rows was not available for verification.");
    }
  } else if (!approxEqual(
    totalConsumeQtyDelta,
    analysis.current_state.inventory_txns_consume.total_qty_delta,
    QTY_TOLERANCE,
  )) {
    mismatches.push(
      `inventory_txns CONSUME total qty_delta changed unexpectedly (${totalConsumeQtyDelta} != ${analysis.current_state.inventory_txns_consume.total_qty_delta}).`,
    );
  }

  return {
    mode: "post",
    stage,
    generated_at: new Date().toISOString(),
    ok: mismatches.length === 0,
    mismatches,
    totals: {
      sales_line_items_net_sales: Number(totalSales.toFixed(2)),
      sales_line_items_qty: Number(totalSalesQty.toFixed(3)),
      daily_orders_subtotal: Number(totalOrdersSubtotal.toFixed(2)),
      inventory_txns_consume_qty_delta: Number(totalConsumeQtyDelta.toFixed(3)),
    },
    current_max_business_date: actualMaxDate,
    expected_max_business_date: expectedOverallMaxDate,
    current_kiosk_max_business_date: actualKioskMaxDate,
    expected_kiosk_max_business_date: expectedKioskMaxDate,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const analysisPath = typeof args.analysis === "string" ? path.resolve(args.analysis) : null;
  const mode = typeof args.mode === "string" ? args.mode : "pre";
  const stage = typeof args.stage === "string" ? args.stage : "full";
  const outputDir = typeof args["output-dir"] === "string"
    ? path.resolve(args["output-dir"])
    : path.dirname(analysisPath || ".");

  if (!analysisPath || !["pre", "post"].includes(mode) || !VALID_STAGES.has(stage)) {
    printUsage();
    process.exit(1);
  }

  const analysis = await loadAnalysis(analysisPath);
  const supabase = createServiceClient();
  let report;

  if (mode === "pre") {
    const currentAnalysis = await buildAnalysis({
      supabase,
      timeZone: analysis.time_zone || DEFAULT_TIME_ZONE,
      targetMode: analysis.target_mode,
      targetDate: analysis.target_date,
    });
    const comparison = comparePreVerification(analysis, currentAnalysis);
    report = {
      mode: "pre",
      stage,
      generated_at: new Date().toISOString(),
      ok: comparison.ok,
      mismatches: comparison.mismatches,
      expected: comparison.expected,
      current: comparison.current,
    };
  } else {
    report = await buildPostVerificationReport(analysis, supabase, stage, outputDir);
  }

  await ensureDir(outputDir);
  const baseName = mode === "post"
    ? stage === "kiosk-only"
      ? "post-verification-stage1-kiosk"
      : stage === "shift-only"
        ? "post-verification-stage2-shift"
        : "post-verification"
    : "pre-verification";

  await writeJson(path.join(outputDir, `${baseName}.json`), report);
  await writeMarkdown(path.join(outputDir, `${baseName}.md`), buildVerificationMarkdown(report));

  console.log(JSON.stringify({
    mode: report.mode,
    stage,
    ok: report.ok,
    mismatches: report.mismatches,
  }, null, 2));

  if (!report.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("database-cleanup-verify failed:");
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
