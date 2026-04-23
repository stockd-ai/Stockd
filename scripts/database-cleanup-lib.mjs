import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

export const DEFAULT_TIME_ZONE = "America/New_York";
export const DEFAULT_TARGET_MODE = "latest-complete-day";
export const KIOSK_PRICE_PER_ITEM = 12.99;
export const CURRENCY_TOLERANCE = 0.02;
export const QTY_TOLERANCE = 0.001;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function stableSortObject(value) {
  if (Array.isArray(value)) {
    return value.map(stableSortObject);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = stableSortObject(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

export function resolveRepoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

export function loadRuntimeEnv() {
  const candidates = [
    resolveRepoPath(".env"),
    resolveRepoPath(".env.local"),
    resolveRepoPath(".vercel", ".env.production.local"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate, override: false });
    }
  }
}

export function requireEnv(...names) {
  loadRuntimeEnv();

  const values = {};
  for (const name of names) {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    values[name] = value;
  }
  return values;
}

export function createServiceClient() {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = requireEnv(
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
  );

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const trimmed = token.slice(2);
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex >= 0) {
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      args[key] = value === "" ? true : value;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[trimmed] = true;
      continue;
    }

    args[trimmed] = next;
    index += 1;
  }

  return args;
}

export async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(
    filePath,
    `${JSON.stringify(stableSortObject(value), null, 2)}\n`,
    "utf8",
  );
}

export async function writeMarkdown(filePath, markdown) {
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(filePath, markdown, "utf8");
}

export function toDateKeyInTimeZone(value, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

export function parseDateKey(dateKey) {
  if (typeof dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function toDateKey(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

export function addDays(dateKey, days) {
  const date = parseDateKey(dateKey);
  if (!date || !Number.isFinite(days)) {
    return null;
  }

  date.setUTCDate(date.getUTCDate() + Number(days));
  return date.toISOString().slice(0, 10);
}

export function diffDateKeys(laterDateKey, earlierDateKey) {
  const later = parseDateKey(laterDateKey);
  const earlier = parseDateKey(earlierDateKey);
  if (!later || !earlier) {
    return null;
  }

  return Math.round((later.getTime() - earlier.getTime()) / 86_400_000);
}

function getTimeZoneParts(date, timeZone = DEFAULT_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function getTimeZoneOffsetMinutes(date, timeZone = DEFAULT_TIME_ZONE) {
  const zonedParts = getTimeZoneParts(date, timeZone);
  const zonedUtcMillis = Date.UTC(
    zonedParts.year,
    zonedParts.month - 1,
    zonedParts.day,
    zonedParts.hour,
    zonedParts.minute,
    zonedParts.second,
    date.getUTCMilliseconds(),
  );
  return Math.round((zonedUtcMillis - date.getTime()) / 60_000);
}

export function shiftIsoByDays(isoValue, days, timeZone = DEFAULT_TIME_ZONE) {
  if (!isoValue) {
    return null;
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const zonedParts = getTimeZoneParts(date, timeZone);
  const shiftedLocalDate = new Date(
    Date.UTC(zonedParts.year, zonedParts.month - 1, zonedParts.day),
  );
  shiftedLocalDate.setUTCDate(shiftedLocalDate.getUTCDate() + Number(days));

  const targetUtcMillis = Date.UTC(
    shiftedLocalDate.getUTCFullYear(),
    shiftedLocalDate.getUTCMonth(),
    shiftedLocalDate.getUTCDate(),
    zonedParts.hour,
    zonedParts.minute,
    zonedParts.second,
    date.getUTCMilliseconds(),
  );

  let shifted = new Date(targetUtcMillis);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(shifted, timeZone);
    const candidate = new Date(targetUtcMillis - (offsetMinutes * 60_000));
    if (candidate.getTime() === shifted.getTime()) {
      break;
    }
    shifted = candidate;
  }

  return shifted.toISOString();
}

export function getLatestCompletedBusinessDate(
  timeZone = DEFAULT_TIME_ZONE,
  now = new Date(),
) {
  const currentDateKey = toDateKeyInTimeZone(now, timeZone);
  return addDays(currentDateKey, -1);
}

export function roundCurrency(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function approxEqual(left, right, tolerance = QTY_TOLERANCE) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

export async function fetchAllRows(client, table, columns, options = {}) {
  const pageSize = options.pageSize || 1_000;
  const rows = [];
  let from = 0;

  while (true) {
    let query = client.from(table).select(columns);

    if (typeof options.filter === "function") {
      query = options.filter(query);
    }

    if (Array.isArray(options.orders)) {
      for (const orderSpec of options.orders) {
        query = query.order(orderSpec.column, {
          ascending: orderSpec.ascending !== false,
          nullsFirst: orderSpec.nullsFirst,
        });
      }
    } else if (options.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending !== false,
        nullsFirst: options.order.nullsFirst,
      });
    }

    query = query.range(from, from + pageSize - 1);

    const { data, error } = await query;
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

function parseOrderNote(note) {
  const match = /^Order ([^:]+): (.+)$/.exec(note || "");
  if (!match) {
    return null;
  }
  return {
    orderId: match[1],
    menuItemName: match[2],
  };
}

function buildGapSummary(dateKeys) {
  const uniqueDates = [...new Set((dateKeys || []).filter(Boolean))].sort();
  let largestGap = null;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previousDate = uniqueDates[index - 1];
    const currentDate = uniqueDates[index];
    const diffDays = diffDateKeys(currentDate, previousDate);

    if (diffDays !== null && diffDays > 1) {
      const gap = {
        from: previousDate,
        to: currentDate,
        diff_days: diffDays,
        missing_days: diffDays - 1,
      };

      if (!largestGap || gap.missing_days > largestGap.missing_days) {
        largestGap = gap;
      }
    }
  }

  return {
    distinct_dates: uniqueDates.length,
    min_date: uniqueDates[0] || null,
    max_date: uniqueDates[uniqueDates.length - 1] || null,
    largest_interior_gap: largestGap,
  };
}

function buildMenuAndBomMaps(menuItems, bomRows) {
  const menuIdsByName = new Map();
  const menuById = new Map();
  const bomByMenuId = new Map();

  for (const item of menuItems) {
    menuById.set(item.id, item);
    const bucket = menuIdsByName.get(item.name) || [];
    bucket.push(item.id);
    menuIdsByName.set(item.name, bucket);
  }

  for (const row of bomRows) {
    const bucket = bomByMenuId.get(row.menu_item_id) || [];
    bucket.push(row);
    bomByMenuId.set(row.menu_item_id, bucket);
  }

  return { menuIdsByName, menuById, bomByMenuId };
}

function groupKioskConsumeTxns(consumeTxns) {
  const byOrderId = new Map();

  for (const txn of consumeTxns) {
    const parsed = parseOrderNote(txn.note);
    if (!parsed || !parsed.orderId.startsWith("KIOSK-")) {
      continue;
    }

    if (!byOrderId.has(parsed.orderId)) {
      byOrderId.set(parsed.orderId, new Map());
    }

    const byMenu = byOrderId.get(parsed.orderId);
    const menuBucket = byMenu.get(parsed.menuItemName) || [];
    menuBucket.push(txn);
    byMenu.set(parsed.menuItemName, menuBucket);
  }

  return byOrderId;
}

function buildKioskOrderAnalysis({
  kioskOrders,
  consumeTxns,
  menuItems,
  bomRows,
  timeZone,
}) {
  const { menuIdsByName, bomByMenuId } = buildMenuAndBomMaps(menuItems, bomRows);
  const consumeByOrderId = groupKioskConsumeTxns(consumeTxns);
  const eligibleAnomalies = [];
  const ambiguousRows = [];
  const allRows = [];
  const deltaBuckets = {};

  for (const order of kioskOrders) {
    const orderMenus = consumeByOrderId.get(order.order_id) || new Map();
    const correctedBusinessDate = toDateKeyInTimeZone(
      order.opened_at || order.closed_at || order.created_at,
      timeZone,
    );
    const storedBusinessDate = order.business_date;
    const deltaDays = correctedBusinessDate && storedBusinessDate
      ? diffDateKeys(storedBusinessDate, correctedBusinessDate)
      : null;

    const reasons = [];
    const reconstructedItems = [];
    const relatedInventoryTxnIds = [];
    let reconstructedSubtotal = 0;

    if (orderMenus.size === 0) {
      reasons.push("missing_order_linked_inventory_txns");
    }

    for (const [menuItemName, menuTxns] of orderMenus.entries()) {
      const matchingMenuIds = menuIdsByName.get(menuItemName) || [];
      if (matchingMenuIds.length !== 1) {
        reasons.push(`menu_lookup_ambiguous:${menuItemName}:${matchingMenuIds.length}`);
        continue;
      }

      const menuItemId = matchingMenuIds[0];
      const bomForItem = bomByMenuId.get(menuItemId) || [];
      if (bomForItem.length === 0) {
        reasons.push(`missing_bom:${menuItemName}`);
        continue;
      }

      const bomByIngredientId = new Map(
        bomForItem.map((row) => [row.ingredient_id, Number(row.qty_per_item)]),
      );

      const impliedQtys = [];
      for (const txn of menuTxns) {
        relatedInventoryTxnIds.push(txn.id);
        const qtyPerItem = bomByIngredientId.get(txn.ingredient_id);
        if (!qtyPerItem || qtyPerItem <= 0) {
          reasons.push(`ingredient_not_in_bom:${menuItemName}:${txn.ingredient_id}`);
          continue;
        }
        impliedQtys.push(Math.abs(Number(txn.qty_delta)) / qtyPerItem);
      }

      if (impliedQtys.length === 0) {
        reasons.push(`no_implied_quantity:${menuItemName}`);
        continue;
      }

      const firstQty = impliedQtys[0];
      const quantitiesConsistent = impliedQtys.every((qty) => approxEqual(qty, firstQty, QTY_TOLERANCE));
      const roundedQty = Math.round(firstQty);

      if (!quantitiesConsistent || !approxEqual(firstQty, roundedQty, QTY_TOLERANCE)) {
        reasons.push(`inconsistent_implied_quantity:${menuItemName}:${impliedQtys.join(",")}`);
        continue;
      }

      const lineSales = roundCurrency(roundedQty * KIOSK_PRICE_PER_ITEM);
      reconstructedSubtotal = roundCurrency(reconstructedSubtotal + lineSales);

      reconstructedItems.push({
        menu_item_id: menuItemId,
        menu_item_name: menuItemName,
        qty: roundedQty,
        line_sales: lineSales,
        unit_price: KIOSK_PRICE_PER_ITEM,
        inventory_txn_ids: menuTxns.map((txn) => txn.id),
      });
    }

    const subtotalMatches = approxEqual(
      reconstructedSubtotal,
      Number(order.subtotal || 0),
      CURRENCY_TOLERANCE,
    );
    if (!subtotalMatches) {
      reasons.push(
        `subtotal_mismatch:${reconstructedSubtotal.toFixed(2)}!=${Number(order.subtotal || 0).toFixed(2)}`,
      );
    }

    const analysisRow = {
      order_id: order.order_id,
      stored_business_date: storedBusinessDate,
      corrected_business_date: correctedBusinessDate,
      delta_days: deltaDays,
      opened_at: order.opened_at,
      closed_at: order.closed_at,
      created_at: order.created_at,
      subtotal: Number(order.subtotal || 0),
      total: Number(order.total || 0),
      related_inventory_txn_count: relatedInventoryTxnIds.length,
      related_inventory_txn_ids: relatedInventoryTxnIds,
      reconstructed_items: reconstructedItems,
      reconstructed_subtotal: reconstructedSubtotal,
      subtotal_matches: subtotalMatches,
      ambiguous_reasons: reasons,
      eligible_for_repair:
        Boolean(correctedBusinessDate) &&
        Boolean(storedBusinessDate) &&
        correctedBusinessDate !== storedBusinessDate &&
        reasons.length === 0,
    };

    allRows.push(analysisRow);

    if (deltaDays !== null) {
      const bucketKey = String(deltaDays);
      deltaBuckets[bucketKey] = (deltaBuckets[bucketKey] || 0) + 1;
    }

    if (analysisRow.eligible_for_repair) {
      eligibleAnomalies.push(analysisRow);
    } else if (correctedBusinessDate && storedBusinessDate && correctedBusinessDate !== storedBusinessDate) {
      ambiguousRows.push(analysisRow);
    }
  }

  return {
    total_orders: kioskOrders.length,
    delta_buckets: deltaBuckets,
    all_rows: allRows,
    eligible_anomalies: eligibleAnomalies.sort((left, right) => left.order_id.localeCompare(right.order_id)),
    ambiguous_rows: ambiguousRows.sort((left, right) => left.order_id.localeCompare(right.order_id)),
  };
}

function buildSalesAdjustments(eligibleAnomalies) {
  return eligibleAnomalies.flatMap((order) =>
    order.reconstructed_items.map((item) => ({
      order_id: order.order_id,
      old_business_date: order.stored_business_date,
      new_business_date: order.corrected_business_date,
      menu_item_id: item.menu_item_id,
      menu_item_name: item.menu_item_name,
      qty: item.qty,
      net_sales: item.line_sales,
    })),
  );
}

function summarizeSalesImpact(salesRows, salesAdjustments) {
  const currentRowsByKey = new Map();
  for (const row of salesRows) {
    currentRowsByKey.set(`${row.business_date}|||${row.menu_item_id}`, row);
  }

  const oldBuckets = new Map();
  const touchedKeys = new Set();
  const oldKeys = new Set();
  const newKeys = new Set();

  for (const adjustment of salesAdjustments) {
    const oldKey = `${adjustment.old_business_date}|||${adjustment.menu_item_id}`;
    const newKey = `${adjustment.new_business_date}|||${adjustment.menu_item_id}`;
    touchedKeys.add(oldKey);
    touchedKeys.add(newKey);
    oldKeys.add(oldKey);
    newKeys.add(newKey);

    const oldBucket = oldBuckets.get(oldKey) || {
      qty: 0,
      net_sales: 0,
    };
    oldBucket.qty += Number(adjustment.qty);
    oldBucket.net_sales += Number(adjustment.net_sales);
    oldBuckets.set(oldKey, oldBucket);
  }

  let deleteCandidates = 0;
  for (const [oldKey, bucket] of oldBuckets.entries()) {
    const current = currentRowsByKey.get(oldKey);
    if (!current) {
      continue;
    }

    const remainingQty = Number(current.qty) - bucket.qty;
    const remainingSales = Number(current.net_sales) - bucket.net_sales;
    if (approxEqual(remainingQty, 0, QTY_TOLERANCE) && approxEqual(remainingSales, 0, CURRENCY_TOLERANCE)) {
      deleteCandidates += 1;
    }
  }

  const insertKeys = [...newKeys].filter((key) => !currentRowsByKey.has(key));
  const existingTouchedKeys = [...touchedKeys].filter((key) => currentRowsByKey.has(key));

  return {
    aggregate_rows_touched: touchedKeys.size,
    existing_rows_touched: existingTouchedKeys.length,
    rows_to_insert: insertKeys.length,
    rows_that_may_delete: deleteCandidates,
    touched_keys: [...touchedKeys].sort(),
  };
}

function summarizeCurrentState({
  dailyOrders,
  salesRows,
  consumeTxns,
  appConfig,
}) {
  const orderDates = dailyOrders
    .filter((row) => !row.voided)
    .map((row) => row.business_date)
    .filter(Boolean);
  const salesDates = salesRows.map((row) => row.business_date).filter(Boolean);
  const consumeDates = consumeTxns.map((row) => row.business_date).filter(Boolean);

  return {
    daily_orders: {
      count: dailyOrders.length,
      non_voided_subtotal_total: roundCurrency(
        dailyOrders
          .filter((row) => !row.voided)
          .reduce((sum, row) => sum + Number(row.subtotal || 0), 0),
      ),
      ...buildGapSummary(orderDates),
    },
    sales_line_items: {
      count: salesRows.length,
      total_qty: Number(
        salesRows.reduce((sum, row) => sum + Number(row.qty || 0), 0).toFixed(3),
      ),
      total_net_sales: roundCurrency(
        salesRows.reduce((sum, row) => sum + Number(row.net_sales || 0), 0),
      ),
      ...buildGapSummary(salesDates),
    },
    inventory_txns_consume: {
      count: consumeTxns.length,
      total_qty_delta: Number(
        consumeTxns.reduce((sum, row) => sum + Number(row.qty_delta || 0), 0).toFixed(3),
      ),
      ...buildGapSummary(consumeDates),
    },
    app_config: {
      onboarding_present: Boolean(appConfig),
      history_start_date: appConfig?.value?.history_start_date || null,
      history_end_date: appConfig?.value?.history_end_date || null,
    },
  };
}

function buildProposedRepair({
  dailyOrders,
  kioskAnalysis,
  salesRows,
  salesImpact,
  consumeTxns,
  appConfig,
  timeZone,
  targetMode,
  targetDate,
}) {
  const correctedOrderDates = dailyOrders
    .filter((row) => !row.voided)
    .map((row) => {
      const kioskFix = kioskAnalysis.eligible_anomalies.find((candidate) => candidate.order_id === row.order_id);
      return kioskFix ? kioskFix.corrected_business_date : row.business_date;
    })
    .filter(Boolean);

  const correctedMaxOrderDate = correctedOrderDates.sort().slice(-1)[0] || null;
  const shiftTargetDate =
    targetMode === "explicit-date"
      ? targetDate
      : getLatestCompletedBusinessDate(timeZone);
  const shiftDeltaDays =
    correctedMaxOrderDate && shiftTargetDate
      ? diffDateKeys(shiftTargetDate, correctedMaxOrderDate)
      : null;

  return {
    corrected_max_order_date: correctedMaxOrderDate,
    shift_target_date: shiftTargetDate,
    shift_delta_days: shiftDeltaDays,
    impacted_rows: {
      kiosk_correction: {
        daily_orders: kioskAnalysis.eligible_anomalies.length,
        sales_line_items: salesImpact.aggregate_rows_touched,
        inventory_txns_consume: kioskAnalysis.eligible_anomalies.reduce(
          (count, row) => count + row.related_inventory_txn_count,
          0,
        ),
        app_config: 0,
      },
      full_forward_shift: {
        daily_orders: dailyOrders.filter((row) => row.business_date).length,
        sales_line_items: salesRows.filter((row) => row.business_date).length,
        inventory_txns_consume: consumeTxns.filter((row) => row.business_date).length,
        app_config:
          appConfig?.value?.history_start_date || appConfig?.value?.history_end_date ? 1 : 0,
      },
      sales_line_items_detail: salesImpact,
    },
  };
}

export async function buildAnalysis({
  supabase,
  timeZone = DEFAULT_TIME_ZONE,
  targetMode = DEFAULT_TARGET_MODE,
  targetDate = null,
  now = new Date(),
}) {
  const [
    dailyOrders,
    salesRows,
    consumeTxns,
    menuItems,
    bomRows,
    appConfigRows,
  ] = await Promise.all([
    fetchAllRows(
      supabase,
      "daily_orders",
      "id, order_id, business_date, opened_at, closed_at, created_at, subtotal, total, order_source, voided",
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
      "id, business_date, menu_item_id, qty, net_sales, source",
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
      "id, business_date, created_at, ingredient_id, qty_delta, note, txn_type",
      {
        filter: (query) => query.eq("txn_type", "CONSUME"),
        orders: [
          { column: "created_at", ascending: true },
          { column: "id", ascending: true },
        ],
      },
    ),
    fetchAllRows(supabase, "menu_items", "id, name", {
      order: { column: "name", ascending: true },
    }),
    fetchAllRows(supabase, "bom", "menu_item_id, ingredient_id, qty_per_item"),
    fetchAllRows(supabase, "app_config", "key, value", {
      filter: (query) => query.eq("key", "onboarding"),
    }),
  ]);

  const appConfig = appConfigRows[0] || null;
  const kioskOrders = dailyOrders.filter(
    (row) => row.order_source === "kiosk" && !row.voided,
  );
  const kioskAnalysis = buildKioskOrderAnalysis({
    kioskOrders,
    consumeTxns,
    menuItems,
    bomRows,
    timeZone,
  });
  const salesAdjustments = buildSalesAdjustments(kioskAnalysis.eligible_anomalies);
  const salesImpact = summarizeSalesImpact(salesRows, salesAdjustments);
  const currentState = summarizeCurrentState({
    dailyOrders,
    salesRows,
    consumeTxns,
    appConfig,
  });
  const proposedRepair = buildProposedRepair({
    dailyOrders,
    kioskAnalysis,
    salesRows,
    salesImpact,
    consumeTxns,
    appConfig,
    timeZone,
    targetMode,
    targetDate,
  });

  return {
    generated_at: now.toISOString(),
    project_ref: fs.existsSync(resolveRepoPath("supabase", ".temp", "project-ref"))
      ? fs.readFileSync(resolveRepoPath("supabase", ".temp", "project-ref"), "utf8").trim()
      : null,
    time_zone: timeZone,
    target_mode: targetMode,
    target_date: targetDate,
    current_state: currentState,
    kiosk_orders: kioskAnalysis,
    sales_adjustments: salesAdjustments,
    proposed_repair: proposedRepair,
    notes: [
      "sales_line_items.source = 'api' is mixed kiosk plus demo-backfill data, so all historical repair work stays per-order.",
      "RECEIVE and COUNT inventory transactions are excluded from the forward shift because they do not carry business_date and are unrelated to order-day continuity.",
    ],
  };
}

function pickAnalysisSnapshot(analysis) {
  return {
    time_zone: analysis.time_zone,
    target_mode: analysis.target_mode,
    target_date: analysis.target_date,
    current_state: {
      daily_orders: analysis.current_state.daily_orders,
      sales_line_items: analysis.current_state.sales_line_items,
      inventory_txns_consume: analysis.current_state.inventory_txns_consume,
      app_config: analysis.current_state.app_config,
    },
    kiosk_orders: {
      total_orders: analysis.kiosk_orders.total_orders,
      delta_buckets: analysis.kiosk_orders.delta_buckets,
      eligible_anomalies: analysis.kiosk_orders.eligible_anomalies.map((row) => ({
        order_id: row.order_id,
        stored_business_date: row.stored_business_date,
        corrected_business_date: row.corrected_business_date,
        delta_days: row.delta_days,
        related_inventory_txn_count: row.related_inventory_txn_count,
        subtotal: row.subtotal,
        reconstructed_subtotal: row.reconstructed_subtotal,
      })),
      ambiguous_rows: analysis.kiosk_orders.ambiguous_rows.map((row) => ({
        order_id: row.order_id,
        stored_business_date: row.stored_business_date,
        corrected_business_date: row.corrected_business_date,
        ambiguous_reasons: row.ambiguous_reasons,
      })),
    },
    proposed_repair: analysis.proposed_repair,
  };
}

export function comparePreVerification(expectedAnalysis, currentAnalysis) {
  const expected = pickAnalysisSnapshot(expectedAnalysis);
  const current = pickAnalysisSnapshot(currentAnalysis);
  const mismatches = [];
  const stableExpectedCurrentState = JSON.stringify(stableSortObject(expected.current_state));
  const stableCurrentCurrentState = JSON.stringify(stableSortObject(current.current_state));
  const stableExpectedKiosk = JSON.stringify(stableSortObject(expected.kiosk_orders));
  const stableCurrentKiosk = JSON.stringify(stableSortObject(current.kiosk_orders));
  const stableExpectedRepair = JSON.stringify(stableSortObject(expected.proposed_repair));
  const stableCurrentRepair = JSON.stringify(stableSortObject(current.proposed_repair));

  if (stableExpectedCurrentState !== stableCurrentCurrentState) {
    mismatches.push("Current-state counts or date ranges changed since analysis was generated.");
  }

  if (stableExpectedKiosk !== stableCurrentKiosk) {
    mismatches.push("Kiosk anomaly set changed since analysis was generated.");
  }

  if (stableExpectedRepair !== stableCurrentRepair) {
    mismatches.push("Proposed repair delta or impacted-row counts changed since analysis was generated.");
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    expected,
    current,
  };
}

export function buildAnalysisMarkdown(analysis) {
  const kioskRows = analysis.kiosk_orders.eligible_anomalies
    .slice(0, 10)
    .map(
      (row) =>
        `| ${row.order_id} | ${row.stored_business_date} | ${row.corrected_business_date} | ${row.delta_days} | ${row.related_inventory_txn_count} |`,
    )
    .join("\n");

  return [
    "# Database Cleanup Analysis",
    "",
    `- Generated at: ${analysis.generated_at}`,
    `- Project ref: ${analysis.project_ref || "unknown"}`,
    `- Business timezone: ${analysis.time_zone}`,
    `- Target mode: ${analysis.target_mode}`,
    `- Proposed shift target: ${analysis.proposed_repair.shift_target_date}`,
    `- Proposed shift delta: ${analysis.proposed_repair.shift_delta_days} day(s)`,
    "",
    "## Current State",
    "",
    `- Daily orders: ${analysis.current_state.daily_orders.count} rows (${analysis.current_state.daily_orders.min_date} → ${analysis.current_state.daily_orders.max_date})`,
    `- Daily orders subtotal total: ${analysis.current_state.daily_orders.non_voided_subtotal_total}`,
    `- Sales line items: ${analysis.current_state.sales_line_items.count} rows (${analysis.current_state.sales_line_items.min_date} → ${analysis.current_state.sales_line_items.max_date})`,
    `- Sales line items qty total: ${analysis.current_state.sales_line_items.total_qty}`,
    `- Sales line items net sales total: ${analysis.current_state.sales_line_items.total_net_sales}`,
    `- Consume inventory transactions: ${analysis.current_state.inventory_txns_consume.count} rows`,
    `- Consume inventory qty_delta total: ${analysis.current_state.inventory_txns_consume.total_qty_delta}`,
    `- Onboarding history window: ${analysis.current_state.app_config.history_start_date || "null"} → ${analysis.current_state.app_config.history_end_date || "null"}`,
    "",
    "## Kiosk Anomalies",
    "",
    `- Kiosk orders found: ${analysis.kiosk_orders.total_orders}`,
    `- Eligible anomalies: ${analysis.kiosk_orders.eligible_anomalies.length}`,
    `- Ambiguous rows: ${analysis.kiosk_orders.ambiguous_rows.length}`,
    "",
    "| Order ID | Stored Date | Corrected ET Date | Delta Days | Linked Consume Rows |",
    "| --- | --- | --- | ---: | ---: |",
    kioskRows || "| none | — | — | — | — |",
    "",
    "## Impacted Rows",
    "",
    `- Kiosk correction — daily_orders: ${analysis.proposed_repair.impacted_rows.kiosk_correction.daily_orders}`,
    `- Kiosk correction — sales_line_items: ${analysis.proposed_repair.impacted_rows.kiosk_correction.sales_line_items}`,
    `- Kiosk correction — inventory_txns CONSUME: ${analysis.proposed_repair.impacted_rows.kiosk_correction.inventory_txns_consume}`,
    `- Forward shift — daily_orders: ${analysis.proposed_repair.impacted_rows.full_forward_shift.daily_orders}`,
    `- Forward shift — sales_line_items: ${analysis.proposed_repair.impacted_rows.full_forward_shift.sales_line_items}`,
    `- Forward shift — inventory_txns CONSUME: ${analysis.proposed_repair.impacted_rows.full_forward_shift.inventory_txns_consume}`,
    "",
    "## Notes",
    "",
    ...analysis.notes.map((note) => `- ${note}`),
    "",
  ].join("\n");
}

export function buildVerificationMarkdown(report) {
  return [
    `# ${report.mode === "post" ? "Post-Repair" : "Pre-Repair"} Verification`,
    "",
    `- Generated at: ${report.generated_at}`,
    `- Result: ${report.ok ? "PASS" : "FAIL"}`,
    "",
    "## Checks",
    "",
    ...(report.mismatches.length > 0
      ? report.mismatches.map((mismatch) => `- ${mismatch}`)
      : ["- All verification checks passed."]),
    "",
  ].join("\n");
}

export function buildApplyMarkdown(report) {
  return [
    "# Database Cleanup Apply Summary",
    "",
    `- Started at: ${report.started_at}`,
    `- Finished at: ${report.finished_at}`,
    `- Applied: ${report.applied ? "yes" : "no"}`,
    `- Analysis file: ${report.analysis_file}`,
    "",
    "## Backups",
    "",
    ...report.backups.map((backup) => `- ${backup.name}: ${backup.path} (${backup.rows} row(s))`),
    "",
    "## Changes",
    "",
    `- Kiosk daily_orders updated: ${report.changes.kiosk_daily_orders_updated}`,
    `- Kiosk inventory_txns updated: ${report.changes.kiosk_inventory_txns_updated}`,
    `- sales_line_items updated: ${report.changes.sales_line_items_updated}`,
    `- sales_line_items inserted: ${report.changes.sales_line_items_inserted}`,
    `- sales_line_items deleted: ${report.changes.sales_line_items_deleted}`,
    `- Forward-shift daily_orders updated: ${report.changes.shift_daily_orders_updated}`,
    `- Forward-shift sales_line_items updated: ${report.changes.shift_sales_line_items_updated}`,
    `- Forward-shift inventory_txns updated: ${report.changes.shift_inventory_txns_updated}`,
    `- app_config updated: ${report.changes.app_config_updated ? "yes" : "no"}`,
    "",
    "## Skipped Rows",
    "",
    ...(report.skipped.length > 0
      ? report.skipped.map((row) => `- ${row.order_id}: ${row.reason}`)
      : ["- None"]),
    "",
  ].join("\n");
}
