import fs from "node:fs/promises";
import path from "node:path";
import {
  CURRENCY_TOLERANCE,
  QTY_TOLERANCE,
  addDays,
  approxEqual,
  buildAnalysis,
  buildApplyMarkdown,
  comparePreVerification,
  createServiceClient,
  ensureDir,
  fetchAllRows,
  parseArgs,
  roundCurrency,
  shiftIsoByDays,
  writeJson,
  writeMarkdown,
} from "./database-cleanup-lib.mjs";

const BATCH_SIZE = 100;
const UPSERT_RETRY_DELAYS_MS = [250, 750, 1500];
const SALES_TEMP_SHIFT_PADDING_DAYS = 10_000;
const VALID_STAGES = new Set(["full", "kiosk-only", "shift-only"]);

function printUsage() {
  console.log(`Usage:
  node scripts/database-cleanup-apply.mjs --analysis logs/database-cleanup/latest/analysis.json --stage kiosk-only --apply
  node scripts/database-cleanup-apply.mjs --analysis logs/database-cleanup/latest/analysis.json --stage full --apply
`);
}

async function loadAnalysis(analysisPath) {
  const raw = await fs.readFile(analysisPath, "utf8");
  return JSON.parse(raw);
}

async function upsertById(client, table, rows) {
  if (!rows.length) {
    return;
  }

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);
    let lastError = null;

    for (let attempt = 0; attempt <= UPSERT_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const { error } = await client.from(table).upsert(batch, {
          onConflict: "id",
          ignoreDuplicates: false,
        });

        if (error) {
          throw error;
        }

        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt === UPSERT_RETRY_DELAYS_MS.length) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, UPSERT_RETRY_DELAYS_MS[attempt]));
      }
    }

    if (lastError) {
      throw new Error(`${table} upsert failed: ${lastError.message || lastError}`);
    }
  }
}

async function writeBackup(dirPath, name, rows, backups) {
  const filePath = path.join(dirPath, `${name}.json`);
  await writeJson(filePath, {
    exported_at: new Date().toISOString(),
    rows,
  });
  backups.push({
    name,
    path: filePath,
    rows: rows.length,
  });
}

function buildSalesAdjustmentMaps(salesAdjustments) {
  const oldByKey = new Map();
  const newByKey = new Map();

  for (const adjustment of salesAdjustments) {
    const oldKey = `${adjustment.old_business_date}|||${adjustment.menu_item_id}`;
    const newKey = `${adjustment.new_business_date}|||${adjustment.menu_item_id}`;

    const oldBucket = oldByKey.get(oldKey) || {
      business_date: adjustment.old_business_date,
      menu_item_id: adjustment.menu_item_id,
      qty: 0,
      net_sales: 0,
    };
    oldBucket.qty += Number(adjustment.qty);
    oldBucket.net_sales += Number(adjustment.net_sales);
    oldByKey.set(oldKey, oldBucket);

    const newBucket = newByKey.get(newKey) || {
      business_date: adjustment.new_business_date,
      menu_item_id: adjustment.menu_item_id,
      qty: 0,
      net_sales: 0,
    };
    newBucket.qty += Number(adjustment.qty);
    newBucket.net_sales += Number(adjustment.net_sales);
    newByKey.set(newKey, newBucket);
  }

  return { oldByKey, newByKey };
}

function buildTouchedSalesKeys(salesAdjustments) {
  const keys = new Set();
  for (const adjustment of salesAdjustments) {
    keys.add(`${adjustment.old_business_date}|||${adjustment.menu_item_id}`);
    keys.add(`${adjustment.new_business_date}|||${adjustment.menu_item_id}`);
  }
  return keys;
}

function resolveOldSalesBucketRow(oldKey, bucket, salesRowMap) {
  const exact = salesRowMap.get(oldKey);
  if (exact) {
    return {
      key: oldKey,
      row: exact,
      resolution: "exact",
    };
  }

  const [oldBusinessDate, menuItemId] = oldKey.split("|||");
  const candidateKeys = [addDays(oldBusinessDate, 1), addDays(oldBusinessDate, -1)]
    .filter(Boolean)
    .map((businessDate) => `${businessDate}|||${menuItemId}`);

  const candidates = candidateKeys
    .map((key) => {
      const row = salesRowMap.get(key);
      return row ? { key, row } : null;
    })
    .filter(Boolean)
    .filter(
      ({ row }) =>
        row.source === "api" &&
        approxEqual(Number(row.qty), bucket.qty, QTY_TOLERANCE) &&
        approxEqual(Number(row.net_sales), bucket.net_sales, CURRENCY_TOLERANCE),
    );

  if (candidates.length === 1) {
    return {
      ...candidates[0],
      resolution: "adjacent_exact_match",
    };
  }

  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const analysisPath = typeof args.analysis === "string" ? path.resolve(args.analysis) : null;
  const apply = args.apply === true;
  const stage = typeof args.stage === "string" ? args.stage : "full";

  if (!analysisPath || !apply || !VALID_STAGES.has(stage)) {
    console.error("Refusing to run without both --analysis <path> and --apply.");
    printUsage();
    process.exit(1);
  }

  const analysis = await loadAnalysis(analysisPath);
  const supabase = createServiceClient();

  const currentAnalysis = await buildAnalysis({
    supabase,
    timeZone: analysis.time_zone,
    targetMode: analysis.target_mode,
    targetDate: analysis.target_date,
  });
  const comparison = comparePreVerification(analysis, currentAnalysis);
  if (!comparison.ok) {
    throw new Error(
      `Live data no longer matches the analysis file:\n- ${comparison.mismatches.join("\n- ")}`,
    );
  }

  if (stage === "shift-only" && analysis.kiosk_orders.eligible_anomalies.length > 0) {
    throw new Error(
      "Refusing shift-only execution because the analysis still contains unrepaired kiosk anomalies.",
    );
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = typeof args["output-dir"] === "string"
    ? path.resolve(args["output-dir"])
    : stage === "kiosk-only"
      ? path.join(path.dirname(path.dirname(analysisPath)), "stage1-kiosk-repair")
      : stage === "shift-only"
        ? path.join(path.dirname(path.dirname(analysisPath)), "stage2-forward-shift")
        : path.join(path.dirname(analysisPath), `apply-${runId}`);
  const backupDir = path.join(outputDir, "backup");
  await ensureDir(backupDir);

  const [
    fullDailyOrders,
    fullSalesRows,
    fullConsumeTxns,
    appConfigRows,
  ] = await Promise.all([
    fetchAllRows(
      supabase,
      "daily_orders",
      "*",
      {
        orders: [
          { column: "business_date", ascending: true },
          { column: "id", ascending: true },
        ],
      },
    ),
    fetchAllRows(
      supabase,
      "sales_line_items",
      "*",
      {
        orders: [
          { column: "business_date", ascending: true },
          { column: "id", ascending: true },
        ],
      },
    ),
    fetchAllRows(
      supabase,
      "inventory_txns",
      "*",
      {
        filter: (query) => query.eq("txn_type", "CONSUME"),
        orders: [
          { column: "created_at", ascending: true },
          { column: "id", ascending: true },
        ],
      },
    ),
    fetchAllRows(
      supabase,
      "app_config",
      "*",
      { filter: (query) => query.eq("key", "onboarding") },
    ),
  ]);

  const kioskOrderIds = new Set(
    analysis.kiosk_orders.eligible_anomalies.map((row) => row.order_id),
  );
  const inventoryTxnIds = new Set(
    analysis.kiosk_orders.eligible_anomalies.flatMap((row) => row.related_inventory_txn_ids),
  );
  const touchedSalesKeys = buildTouchedSalesKeys(analysis.sales_adjustments);
  const dailyOrderMap = new Map(fullDailyOrders.map((row) => [row.order_id, { ...row }]));
  const consumeTxnMap = new Map(fullConsumeTxns.map((row) => [row.id, { ...row }]));
  const salesRowMap = new Map(
    fullSalesRows.map((row) => [`${row.business_date}|||${row.menu_item_id}`, { ...row }]),
  );
  const { oldByKey, newByKey } = buildSalesAdjustmentMaps(analysis.sales_adjustments);
  const oldBucketResolutions = new Map();
  const fallbackResolutions = [];

  for (const [oldKey, bucket] of oldByKey.entries()) {
    const resolution = resolveOldSalesBucketRow(oldKey, bucket, salesRowMap);
    if (!resolution) {
      throw new Error(`Could not resolve sales_line_items aggregate row for ${oldKey}.`);
    }
    oldBucketResolutions.set(oldKey, resolution);
    if (resolution.resolution !== "exact") {
      fallbackResolutions.push({
        old_key: oldKey,
        resolved_key: resolution.key,
        resolution: resolution.resolution,
      });
    }
  }

  const salesBackupKeys = new Set(touchedSalesKeys);
  for (const resolution of oldBucketResolutions.values()) {
    salesBackupKeys.add(resolution.key);
  }

  const backups = [];
  await writeBackup(
    backupDir,
    "affected-kiosk-daily-orders",
    fullDailyOrders.filter((row) => kioskOrderIds.has(row.order_id)),
    backups,
  );
  await writeBackup(
    backupDir,
    "affected-kiosk-consume-transactions",
    fullConsumeTxns.filter((row) => inventoryTxnIds.has(row.id)),
    backups,
  );
  await writeBackup(
    backupDir,
    "affected-sales-line-items",
    fullSalesRows.filter((row) => salesBackupKeys.has(`${row.business_date}|||${row.menu_item_id}`)),
    backups,
  );
  if (stage !== "kiosk-only") {
    await writeBackup(
      backupDir,
      "full-shift-daily-orders",
      fullDailyOrders.filter((row) => row.business_date),
      backups,
    );
    await writeBackup(
      backupDir,
      "full-shift-sales-line-items",
      fullSalesRows.filter((row) => row.business_date),
      backups,
    );
    await writeBackup(
      backupDir,
      "full-shift-consume-transactions",
      fullConsumeTxns.filter((row) => row.business_date),
      backups,
    );
    await writeBackup(
      backupDir,
      "app-config-onboarding",
      appConfigRows,
      backups,
    );
  }

  const changes = {
    kiosk_daily_orders_updated: 0,
    kiosk_inventory_txns_updated: 0,
    sales_line_items_fallback_rows_used: 0,
    sales_line_items_updated: 0,
    sales_line_items_inserted: 0,
    sales_line_items_deleted: 0,
    shift_daily_orders_updated: 0,
    shift_sales_line_items_updated: 0,
    shift_inventory_txns_updated: 0,
    app_config_updated: false,
  };

  const skipped = analysis.kiosk_orders.ambiguous_rows.map((row) => ({
    order_id: row.order_id,
    reason: row.ambiguous_reasons.join("; "),
  }));

  if (stage !== "shift-only") {
    for (const order of analysis.kiosk_orders.eligible_anomalies) {
      const existingOrder = dailyOrderMap.get(order.order_id);
      if (!existingOrder) {
        throw new Error(`Missing daily_orders row for ${order.order_id}.`);
      }

      existingOrder.business_date = order.corrected_business_date;
      changes.kiosk_daily_orders_updated += 1;

      for (const txnId of order.related_inventory_txn_ids) {
        const txn = consumeTxnMap.get(txnId);
        if (!txn) {
          throw new Error(`Missing inventory_txns row ${txnId} for ${order.order_id}.`);
        }
        txn.business_date = order.corrected_business_date;
        changes.kiosk_inventory_txns_updated += 1;
      }
    }

    for (const [key, bucket] of oldByKey.entries()) {
      const resolution = oldBucketResolutions.get(key);
      const current = resolution?.row || null;
      if (!current) {
        throw new Error(`Missing sales_line_items aggregate row for ${key}.`);
      }
      if (resolution.resolution !== "exact") {
        changes.sales_line_items_fallback_rows_used += 1;
      }

      const newQty = Number(current.qty) - bucket.qty;
      const newSales = Number(current.net_sales) - bucket.net_sales;
      if (newQty < -QTY_TOLERANCE || newSales < -CURRENCY_TOLERANCE) {
        throw new Error(`Aggregate row ${key} would go negative during kiosk correction.`);
      }

      if (approxEqual(newQty, 0, QTY_TOLERANCE) && approxEqual(newSales, 0, CURRENCY_TOLERANCE)) {
        const { error } = await supabase.from("sales_line_items").delete().eq("id", current.id);
        if (error) {
          throw new Error(`Failed deleting sales_line_items ${current.id}: ${error.message}`);
        }
        salesRowMap.delete(resolution.key);
        changes.sales_line_items_deleted += 1;
        continue;
      }

      current.qty = newQty;
      current.net_sales = roundCurrency(newSales);
      const { error } = await supabase
        .from("sales_line_items")
        .update({
          qty: current.qty,
          net_sales: current.net_sales,
        })
        .eq("id", current.id);

      if (error) {
        throw new Error(`Failed updating sales_line_items ${current.id}: ${error.message}`);
      }

      changes.sales_line_items_updated += 1;
    }

    for (const [key, bucket] of newByKey.entries()) {
      const current = salesRowMap.get(key);
      if (current) {
        current.qty = Number(current.qty) + bucket.qty;
        current.net_sales = roundCurrency(Number(current.net_sales) + bucket.net_sales);

        const { error } = await supabase
          .from("sales_line_items")
          .update({
            qty: current.qty,
            net_sales: current.net_sales,
          })
          .eq("id", current.id);

        if (error) {
          throw new Error(`Failed updating sales_line_items ${current.id}: ${error.message}`);
        }
        changes.sales_line_items_updated += 1;
        continue;
      }

      const insertRow = {
        business_date: bucket.business_date,
        menu_item_id: bucket.menu_item_id,
        qty: bucket.qty,
        net_sales: roundCurrency(bucket.net_sales),
        source: "api",
      };

      const { data, error } = await supabase
        .from("sales_line_items")
        .insert(insertRow)
        .select("*")
        .single();

      if (error) {
        throw new Error(`Failed inserting sales_line_items ${key}: ${error.message}`);
      }

      salesRowMap.set(key, data);
      changes.sales_line_items_inserted += 1;
    }

    const correctedDailyOrders = analysis.kiosk_orders.eligible_anomalies
      .map((order) => dailyOrderMap.get(order.order_id))
      .filter(Boolean);
    await upsertById(supabase, "daily_orders", correctedDailyOrders);

    const correctedConsumeTxns = [...inventoryTxnIds]
      .map((txnId) => consumeTxnMap.get(txnId))
      .filter(Boolean);
    await upsertById(supabase, "inventory_txns", correctedConsumeTxns);
  }

  if (stage !== "kiosk-only") {
    const shiftDeltaDays = analysis.proposed_repair.shift_delta_days;
    const shiftedDailyOrders = [...dailyOrderMap.values()]
      .filter((row) => row.business_date)
      .map((row) => ({
        ...row,
        business_date: addDays(row.business_date, shiftDeltaDays),
        opened_at: shiftIsoByDays(row.opened_at, shiftDeltaDays, analysis.time_zone),
        closed_at: shiftIsoByDays(row.closed_at, shiftDeltaDays, analysis.time_zone),
      }));
    await upsertById(supabase, "daily_orders", shiftedDailyOrders);
    changes.shift_daily_orders_updated = shiftedDailyOrders.length;

    const salesTempShiftRows = [...salesRowMap.values()]
      .filter((row) => row.business_date)
      .map((row) => ({
        ...row,
        business_date: addDays(row.business_date, shiftDeltaDays + SALES_TEMP_SHIFT_PADDING_DAYS),
      }));
    await upsertById(supabase, "sales_line_items", salesTempShiftRows);

    const shiftedSalesRows = [...salesRowMap.values()]
      .filter((row) => row.business_date)
      .map((row) => ({
        ...row,
        business_date: addDays(row.business_date, shiftDeltaDays),
      }));
    await upsertById(supabase, "sales_line_items", shiftedSalesRows);
    changes.shift_sales_line_items_updated = shiftedSalesRows.length;

    const shiftedConsumeTxns = [...consumeTxnMap.values()]
      .filter((row) => row.business_date)
      .map((row) => ({
        ...row,
        business_date: addDays(row.business_date, shiftDeltaDays),
      }));
    await upsertById(supabase, "inventory_txns", shiftedConsumeTxns);
    changes.shift_inventory_txns_updated = shiftedConsumeTxns.length;

    const onboarding = appConfigRows[0] || null;
    if (onboarding) {
      const nextValue = {
        ...(onboarding.value || {}),
        history_start_date: addDays(onboarding.value?.history_start_date, shiftDeltaDays),
        history_end_date: addDays(onboarding.value?.history_end_date, shiftDeltaDays),
      };

      const { error } = await supabase
        .from("app_config")
        .update({
          value: nextValue,
          updated_at: new Date().toISOString(),
        })
        .eq("key", "onboarding");

      if (error) {
        throw new Error(`Failed updating app_config onboarding: ${error.message}`);
      }

      changes.app_config_updated = true;
    }
  }

  const report = {
    stage,
    started_at: runId,
    finished_at: new Date().toISOString(),
    applied: true,
    analysis_file: analysisPath,
    backups,
    changes,
    fallback_resolutions: fallbackResolutions,
    skipped,
  };

  await writeJson(path.join(outputDir, "apply-summary.json"), report);
  await writeMarkdown(path.join(outputDir, "apply-summary.md"), buildApplyMarkdown(report));

  console.log(JSON.stringify({
    applied: true,
    stage,
    output_dir: outputDir,
    changes,
    fallback_resolutions: fallbackResolutions,
    skipped,
  }, null, 2));
}

main().catch((error) => {
  console.error("database-cleanup-apply failed:");
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
