#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const {
  addDays,
  buildAnalysisWindow,
  buildPricingRecommendations,
  buildPricingSignalSummary,
  buildRecentSalesDays,
  getBusinessDateKey,
  getDatePartsInTimeZone,
} = require("../Frontend/js/database-helpers.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const BUSINESS_TIMEZONE = "America/New_York";
const ORDER_PREFIX = "__demo_seed__analytics_";
const WINDOW_DAYS = 7;
const FORECAST_DAYS = 8;
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, "logs", "demo-seeding", "latest");

const MENU_BLUEPRINT = [
  { name: "The Southwest Chicken Pizza (L)", category: "Chicken", unitPrice: 11.49 },
  { name: "The Barbecue Chicken Pizza (L)", category: "Chicken", unitPrice: 13.99 },
  { name: "The California Chicken Pizza (L)", category: "Chicken", unitPrice: 13.99 },
  { name: "The Thai Chicken Pizza (L)", category: "Chicken", unitPrice: 14.49 },
  { name: "The Pepperoni Pizza (L)", category: "Classic", unitPrice: 12.99 },
  { name: "The Greek Pizza (L)", category: "Classic", unitPrice: 12.99 },
  { name: "The Green Garden Pizza (M)", category: "Veggie", unitPrice: 12.49 },
];

const BASE_ORDER_TEMPLATES = [
  {
    key: "lunch_sw_pep",
    servicePeriod: "Lunch",
    diningOption: "Dine In",
    orderSource: "In store",
    diningArea: "Front",
    serverName: "Mia",
    numGuests: 2,
    hour: 11,
    minute: 20,
    items: [
      { name: "The Southwest Chicken Pizza (L)", qty: 1 },
      { name: "The Pepperoni Pizza (L)", qty: 1 },
    ],
  },
  {
    key: "lunch_sw_green",
    servicePeriod: "Lunch",
    diningOption: "Takeout",
    orderSource: "Online",
    diningArea: null,
    serverName: "Leo",
    numGuests: 2,
    hour: 11,
    minute: 55,
    items: [
      { name: "The Southwest Chicken Pizza (L)", qty: 1 },
      { name: "The Green Garden Pizza (M)", qty: 1 },
    ],
  },
  {
    key: "lunch_bbq_greek",
    servicePeriod: "Lunch",
    diningOption: "Dine In",
    orderSource: "In store",
    diningArea: "Patio",
    serverName: "Sofia",
    numGuests: 3,
    hour: 12,
    minute: 30,
    items: [
      { name: "The Barbecue Chicken Pizza (L)", qty: 1 },
      { name: "The Greek Pizza (L)", qty: 1 },
    ],
  },
  {
    key: "dinner_sw2_pep",
    servicePeriod: "Dinner",
    diningOption: "Dine In",
    orderSource: "In store",
    diningArea: "Back",
    serverName: "Carlos",
    numGuests: 4,
    hour: 17,
    minute: 10,
    items: [
      { name: "The Southwest Chicken Pizza (L)", qty: 2 },
      { name: "The Pepperoni Pizza (L)", qty: 1 },
    ],
  },
  {
    key: "dinner_sw_cal_greek",
    servicePeriod: "Dinner",
    diningOption: "Dine In",
    orderSource: "In store",
    diningArea: "Front",
    serverName: "Emma",
    numGuests: 3,
    hour: 17,
    minute: 50,
    items: [
      { name: "The Southwest Chicken Pizza (L)", qty: 1 },
      { name: "The California Chicken Pizza (L)", qty: 1 },
      { name: "The Greek Pizza (L)", qty: 1 },
    ],
  },
  {
    key: "dinner_sw_thai_pep",
    servicePeriod: "Dinner",
    diningOption: "Delivery",
    orderSource: "Online",
    diningArea: null,
    serverName: "Ava",
    numGuests: 3,
    hour: 18,
    minute: 20,
    items: [
      { name: "The Southwest Chicken Pizza (L)", qty: 1 },
      { name: "The Thai Chicken Pizza (L)", qty: 1 },
      { name: "The Pepperoni Pizza (L)", qty: 1 },
    ],
  },
  {
    key: "dinner_sw_cal_green",
    servicePeriod: "Dinner",
    diningOption: "Takeout",
    orderSource: "Online",
    diningArea: null,
    serverName: "Noah",
    numGuests: 4,
    hour: 19,
    minute: 5,
    items: [
      { name: "The Southwest Chicken Pizza (L)", qty: 1 },
      { name: "The California Chicken Pizza (L)", qty: 1 },
      { name: "The Green Garden Pizza (M)", qty: 1 },
    ],
  },
];

const EXTRA_TEMPLATES_BY_WEEKDAY = {
  5: [
    {
      key: "fri_dinner_sw_pep_greek",
      servicePeriod: "Dinner",
      diningOption: "Dine In",
      orderSource: "In store",
      diningArea: "Patio",
      serverName: "Mia",
      numGuests: 4,
      hour: 20,
      minute: 0,
      items: [
        { name: "The Southwest Chicken Pizza (L)", qty: 1 },
        { name: "The Pepperoni Pizza (L)", qty: 1 },
        { name: "The Greek Pizza (L)", qty: 1 },
      ],
    },
    {
      key: "fri_dinner_cal_pep_green",
      servicePeriod: "Dinner",
      diningOption: "Takeout",
      orderSource: "Online",
      diningArea: null,
      serverName: "Leo",
      numGuests: 3,
      hour: 20,
      minute: 35,
      items: [
        { name: "The California Chicken Pizza (L)", qty: 1 },
        { name: "The Pepperoni Pizza (L)", qty: 1 },
        { name: "The Green Garden Pizza (M)", qty: 1 },
      ],
    },
  ],
  6: [
    {
      key: "sat_dinner_sw_bbq_greek",
      servicePeriod: "Dinner",
      diningOption: "Dine In",
      orderSource: "In store",
      diningArea: "Front",
      serverName: "Sofia",
      numGuests: 5,
      hour: 20,
      minute: 10,
      items: [
        { name: "The Southwest Chicken Pizza (L)", qty: 1 },
        { name: "The Barbecue Chicken Pizza (L)", qty: 1 },
        { name: "The Greek Pizza (L)", qty: 1 },
      ],
    },
    {
      key: "sat_dinner_sw2_cal",
      servicePeriod: "Dinner",
      diningOption: "Delivery",
      orderSource: "Online",
      diningArea: null,
      serverName: "Ava",
      numGuests: 4,
      hour: 20,
      minute: 45,
      items: [
        { name: "The Southwest Chicken Pizza (L)", qty: 2 },
        { name: "The California Chicken Pizza (L)", qty: 1 },
      ],
    },
  ],
  4: [
    {
      key: "thu_dinner_sw_bbq_pep",
      servicePeriod: "Dinner",
      diningOption: "Dine In",
      orderSource: "In store",
      diningArea: "Back",
      serverName: "Carlos",
      numGuests: 4,
      hour: 19,
      minute: 40,
      items: [
        { name: "The Southwest Chicken Pizza (L)", qty: 1 },
        { name: "The Barbecue Chicken Pizza (L)", qty: 1 },
        { name: "The Pepperoni Pizza (L)", qty: 1 },
      ],
    },
  ],
};

function parseArgs(argv) {
  const args = {
    apply: false,
    cleanupOnly: false,
    dryRun: false,
    outputDir: DEFAULT_OUTPUT_DIR,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--apply") {
      args.apply = true;
    } else if (value === "--cleanup-only") {
      args.cleanupOnly = true;
    } else if (value === "--dry-run") {
      args.dryRun = true;
    } else if (value === "--output-dir" && argv[index + 1]) {
      args.outputDir = path.resolve(REPO_ROOT, argv[index + 1]);
      index += 1;
    }
  }

  if (!args.apply) {
    args.dryRun = true;
  }

  return args;
}

function loadEnv() {
  const candidates = [
    path.join(REPO_ROOT, ".vercel", ".env.production.local"),
    path.join(REPO_ROOT, ".env"),
  ];

  for (const envPath of candidates) {
    dotenv.config({ path: envPath, override: false });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toEasternUtcIso(dateKey, hour, minute) {
  const localDate = new Date(`${dateKey}T${pad(hour)}:${pad(minute)}:00`);
  return localDate.toISOString();
}

function addMinutes(isoString, minutes) {
  const date = new Date(isoString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function chunk(values, size = 100) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function buildDateRange(endDateKey, days) {
  const dateKeys = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    dateKeys.push(addDays(endDateKey, -offset));
  }
  return dateKeys;
}

function buildDemoPlan(endDateKey, menuByName) {
  const dates = buildDateRange(endDateKey, WINDOW_DAYS);
  const orders = [];

  dates.forEach((dateKey) => {
    const weekdayIndex = getDatePartsInTimeZone(`${dateKey}T12:00:00Z`, BUSINESS_TIMEZONE)?.weekdayIndex ?? new Date(`${dateKey}T12:00:00Z`).getUTCDay();
    const templates = [...BASE_ORDER_TEMPLATES, ...(EXTRA_TEMPLATES_BY_WEEKDAY[weekdayIndex] || [])];

    templates.forEach((template, templateIndex) => {
      const orderId = `${ORDER_PREFIX}${dateKey.replaceAll("-", "")}_${pad(templateIndex + 1)}`;
      const openedAt = toEasternUtcIso(dateKey, template.hour, template.minute);
      const closedAt = addMinutes(openedAt, template.servicePeriod === "Lunch" ? 24 : 34);
      const items = template.items.map((item) => {
        const menuItem = menuByName.get(item.name);
        if (!menuItem) {
          throw new Error(`Menu item "${item.name}" is not available.`);
        }

        const lineTotal = Number((menuItem.unitPrice * item.qty).toFixed(2));
        return {
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          category: menuItem.category,
          qty: item.qty,
          unitPrice: menuItem.unitPrice,
          lineTotal,
        };
      });

      const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
      const tax = Number((subtotal * 0.08).toFixed(2));
      const tipRate = template.diningOption === "Dine In" ? 0.16 : template.diningOption === "Delivery" ? 0.08 : 0;
      const tip = Number((subtotal * tipRate).toFixed(2));
      const total = Number((subtotal + tax + tip).toFixed(2));

      orders.push({
        orderId,
        businessDate: dateKey,
        openedAt,
        closedAt,
        servicePeriod: template.servicePeriod,
        diningOption: template.diningOption,
        orderSource: template.orderSource,
        diningArea: template.diningArea,
        serverName: template.serverName,
        numGuests: template.numGuests,
        subtotal,
        tax,
        tip,
        total,
        items,
      });
    });
  });

  return orders;
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath, value) {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, value, "utf8");
}

async function fetchMenuBlueprint(supabase) {
  const names = MENU_BLUEPRINT.map((item) => item.name);
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, category, active")
    .in("name", names);
  if (error) throw error;

  const menuByName = new Map();
  for (const blueprint of MENU_BLUEPRINT) {
    const row = (data || []).find((item) => item.name === blueprint.name);
    if (!row) {
      throw new Error(`Required demo item "${blueprint.name}" was not found in menu_items.`);
    }

    menuByName.set(blueprint.name, {
      id: row.id,
      name: row.name,
      category: row.category || blueprint.category,
      unitPrice: blueprint.unitPrice,
    });
  }

  const menuIds = Array.from(menuByName.values()).map((item) => item.id);
  const { data: bomRows, error: bomError } = await supabase
    .from("bom")
    .select("menu_item_id, ingredient_id, qty_per_item")
    .in("menu_item_id", menuIds);
  if (bomError) throw bomError;

  const bomByMenuItemId = new Map();
  for (const row of bomRows || []) {
    if (!bomByMenuItemId.has(row.menu_item_id)) {
      bomByMenuItemId.set(row.menu_item_id, []);
    }
    bomByMenuItemId.get(row.menu_item_id).push({
      ingredientId: row.ingredient_id,
      qtyPerItem: Number(row.qty_per_item),
    });
  }

  for (const item of menuByName.values()) {
    if (!bomByMenuItemId.has(item.id) || bomByMenuItemId.get(item.id).length === 0) {
      throw new Error(`Demo item "${item.name}" has no BOM rows, so register_order would not create coherent inventory consumption.`);
    }
  }

  return { menuByName, bomByMenuItemId };
}

async function backupCurrentSlices(supabase, outputDir, context) {
  const backupDir = path.join(outputDir, "backup");
  await ensureDirectory(backupDir);
  const touchedMenuIds = Array.from(new Set(context.orders.flatMap((order) => order.items.map((item) => item.menuItemId))));
  const touchedIngredientIds = Array.from(new Set(
    context.orders.flatMap((order) =>
      order.items.flatMap((item) => (context.bomByMenuItemId.get(item.menuItemId) || []).map((bom) => bom.ingredientId))
    ),
  ));
  const orderIds = context.orders.map((order) => order.orderId);

  const [
    dailyOrders,
    salesRows,
    consumeRows,
    inventoryRows,
    forecastItemRows,
    forecastIngredientRows,
    existingDemoOrders,
  ] = await Promise.all([
    supabase
      .from("daily_orders")
      .select("*")
      .gte("business_date", context.startDate)
      .lte("business_date", context.endDate)
      .order("business_date"),
    supabase
      .from("sales_line_items")
      .select("*, menu_items(name, category)")
      .gte("business_date", context.startDate)
      .lte("business_date", context.endDate)
      .in("menu_item_id", touchedMenuIds)
      .order("business_date"),
    supabase
      .from("inventory_txns")
      .select("*")
      .eq("txn_type", "CONSUME")
      .gte("business_date", context.startDate)
      .lte("business_date", context.endDate)
      .order("business_date"),
    supabase
      .from("inventory_on_hand")
      .select("*")
      .in("ingredient_id", touchedIngredientIds),
    supabase
      .from("forecast_items")
      .select("*")
      .gte("forecast_date", context.referenceDate)
      .lt("forecast_date", addDays(context.referenceDate, FORECAST_DAYS)),
    supabase
      .from("forecast_ingredients")
      .select("*")
      .gte("forecast_date", context.referenceDate)
      .lt("forecast_date", addDays(context.referenceDate, FORECAST_DAYS)),
    supabase
      .from("daily_orders")
      .select("*")
      .in("order_id", orderIds),
  ]);

  for (const response of [dailyOrders, salesRows, consumeRows, inventoryRows, forecastItemRows, forecastIngredientRows, existingDemoOrders]) {
    if (response.error) throw response.error;
  }

  await Promise.all([
    writeJson(path.join(backupDir, "daily_orders_recent_slice.json"), dailyOrders.data || []),
    writeJson(path.join(backupDir, "sales_line_items_recent_slice.json"), salesRows.data || []),
    writeJson(path.join(backupDir, "inventory_txns_consume_recent_slice.json"), consumeRows.data || []),
    writeJson(path.join(backupDir, "inventory_on_hand_touched_ingredients.json"), inventoryRows.data || []),
    writeJson(path.join(backupDir, "forecast_items_recent_slice.json"), forecastItemRows.data || []),
    writeJson(path.join(backupDir, "forecast_ingredients_recent_slice.json"), forecastIngredientRows.data || []),
    writeJson(path.join(backupDir, "existing_demo_orders.json"), existingDemoOrders.data || []),
  ]);

  return {
    backupDir,
    existingDemoOrderCount: (existingDemoOrders.data || []).length,
  };
}

async function updateSalesAggregate(supabase, businessDate, menuItemId, qtyDelta, salesDelta) {
  const { data, error } = await supabase
    .from("sales_line_items")
    .select("id, qty, net_sales")
    .eq("business_date", businessDate)
    .eq("menu_item_id", menuItemId)
    .limit(1);
  if (error) throw error;

  const existing = data && data[0] ? data[0] : null;
  if (!existing) return { updated: 0, deleted: 0, inserted: 0 };

  const nextQty = Number((Number(existing.qty) + qtyDelta).toFixed(3));
  const nextSales = Number((Number(existing.net_sales) + salesDelta).toFixed(2));

  if (nextQty <= 0.0001 || nextSales <= 0.0001) {
    const { error: deleteError } = await supabase.from("sales_line_items").delete().eq("id", existing.id);
    if (deleteError) throw deleteError;
    return { updated: 0, deleted: 1, inserted: 0 };
  }

  const { error: updateError } = await supabase
    .from("sales_line_items")
    .update({ qty: nextQty, net_sales: nextSales })
    .eq("id", existing.id);
  if (updateError) throw updateError;
  return { updated: 1, deleted: 0, inserted: 0 };
}

async function cleanupPriorSeed(supabase, context) {
  const existingOrderIds = context.orders.map((order) => order.orderId);
  const { data: existingOrders, error: existingOrdersError } = await supabase
    .from("daily_orders")
    .select("order_id")
    .in("order_id", existingOrderIds);
  if (existingOrdersError) throw existingOrdersError;

  const existingSet = new Set((existingOrders || []).map((row) => row.order_id));
  const ordersToRemove = context.orders.filter((order) => existingSet.has(order.orderId));
  if (ordersToRemove.length === 0) {
    return {
      removedOrders: 0,
      removedInventoryTxns: 0,
      reversedInventoryIngredients: 0,
      salesRowsUpdated: 0,
      salesRowsDeleted: 0,
    };
  }

  let removedInventoryTxns = 0;
  let reversedInventoryIngredients = 0;
  let salesRowsUpdated = 0;
  let salesRowsDeleted = 0;

  for (const order of ordersToRemove) {
    for (const item of order.items) {
      const salesResult = await updateSalesAggregate(supabase, order.businessDate, item.menuItemId, -item.qty, -item.lineTotal);
      salesRowsUpdated += salesResult.updated;
      salesRowsDeleted += salesResult.deleted;

      const bomRows = context.bomByMenuItemId.get(item.menuItemId) || [];
      for (const bom of bomRows) {
        const qtyToRestore = Number((item.qty * bom.qtyPerItem).toFixed(3));
        const { data: inventoryRow, error: inventoryError } = await supabase
          .from("inventory_on_hand")
          .select("ingredient_id, qty_on_hand")
          .eq("ingredient_id", bom.ingredientId)
          .limit(1);
        if (inventoryError) throw inventoryError;

        if (inventoryRow && inventoryRow[0]) {
          const nextQty = Number((Number(inventoryRow[0].qty_on_hand) + qtyToRestore).toFixed(3));
          const { error: updateInventoryError } = await supabase
            .from("inventory_on_hand")
            .update({ qty_on_hand: nextQty, updated_at: new Date().toISOString() })
            .eq("ingredient_id", bom.ingredientId);
          if (updateInventoryError) throw updateInventoryError;
          reversedInventoryIngredients += 1;
        }
      }

      const note = `Order ${order.orderId}: ${item.menuItemName}`;
      const { data: deletedRows, error: deleteTxnError } = await supabase
        .from("inventory_txns")
        .delete()
        .eq("txn_type", "CONSUME")
        .eq("note", note)
        .select("id");
      if (deleteTxnError) throw deleteTxnError;
      removedInventoryTxns += (deletedRows || []).length;
    }
  }

  for (const ids of chunk(ordersToRemove.map((order) => order.orderId), 100)) {
    const { error: deleteOrdersError } = await supabase
      .from("daily_orders")
      .delete()
      .in("order_id", ids);
    if (deleteOrdersError) throw deleteOrdersError;
  }

  return {
    removedOrders: ordersToRemove.length,
    removedInventoryTxns,
    reversedInventoryIngredients,
    salesRowsUpdated,
    salesRowsDeleted,
  };
}

async function insertDemoOrders(supabase, orders) {
  const results = {
    insertedOrders: 0,
    insertedSalesLines: 0,
    insertedInventoryTxns: 0,
    menuItemsCreated: 0,
  };

  for (const order of orders) {
    const payload = {
      order_id: order.orderId,
      opened_at: order.openedAt,
      closed_at: order.closedAt,
      num_guests: order.numGuests,
      server_name: order.serverName,
      dining_area: order.diningArea,
      service_period: order.servicePeriod,
      dining_option: order.diningOption,
      order_source: order.orderSource,
      subtotal: order.subtotal,
      tax: order.tax,
      tip: order.tip,
      gratuity: 0,
      total: order.total,
      items: order.items.map((item) => ({
        menu_item_name: item.menuItemName,
        qty: item.qty,
        price: item.lineTotal,
        category: item.category,
      })),
    };

    const { data, error } = await supabase.rpc("register_order", {
      p_order_raw: JSON.stringify(payload),
    });
    if (error) throw error;
    if (!data || data.status !== "success") {
      throw new Error(`register_order failed for ${order.orderId}: ${data && data.message ? data.message : "unknown error"}`);
    }

    results.insertedOrders += 1;
    results.insertedSalesLines += order.items.length;
    results.insertedInventoryTxns += Number(data.ingredients_consumed || 0);
    results.menuItemsCreated += Number(data.menu_items_created || 0);
  }

  return results;
}

async function regenerateForecast(supabase, referenceDate) {
  const { data, error } = await supabase.rpc("generate_forecast", {
    p_days_ahead: FORECAST_DAYS,
    p_reference_date: referenceDate,
  });
  if (error) throw error;
  return data;
}

async function collectPostSeedMetrics(supabase, context) {
  const recentSalesWindow = buildAnalysisWindow({
    currentDateKey: context.referenceDate,
    windowDays: 7,
    useCurrentWindow: true,
  });
  const trafficWindow = buildAnalysisWindow({
    currentDateKey: context.referenceDate,
    windowDays: 28,
    useCurrentWindow: true,
  });

  const [recentOrders, recentSales, trafficOrders, forecastRows, trend, inventorySnapshot] = await Promise.all([
    supabase
      .from("daily_orders")
      .select("business_date, opened_at, subtotal, total, order_source, service_period, dining_option")
      .eq("voided", false)
      .gte("business_date", recentSalesWindow.startDate)
      .lte("business_date", recentSalesWindow.endDate)
      .order("business_date"),
    supabase
      .from("sales_line_items")
      .select("business_date, menu_item_id, qty, net_sales, menu_items(name, category)")
      .gte("business_date", recentSalesWindow.startDate)
      .lte("business_date", recentSalesWindow.endDate)
      .order("business_date"),
    supabase
      .from("daily_orders")
      .select("business_date, opened_at")
      .eq("voided", false)
      .gte("business_date", trafficWindow.startDate)
      .lte("business_date", trafficWindow.endDate)
      .not("opened_at", "is", null),
    supabase
      .from("forecast_items")
      .select("forecast_date, menu_item_id, qty")
      .gte("forecast_date", context.referenceDate)
      .lt("forecast_date", addDays(context.referenceDate, FORECAST_DAYS)),
    supabase.rpc("get_revenue_trend", { p_days: 30 }),
    supabase.rpc("get_inventory_snapshot"),
  ]);

  for (const response of [recentOrders, recentSales, trafficOrders, forecastRows, trend, inventorySnapshot]) {
    if (response.error) throw response.error;
  }

  const recentSalesDays = buildRecentSalesDays(recentSales.data || [], { limit: 7, maxDate: recentSalesWindow.endDate });

  const itemMap = new Map();
  for (const sale of recentSales.data || []) {
    const menuItemId = sale.menu_item_id;
    const embedded = sale.menu_items || {};
    if (!menuItemId) continue;
    if (!itemMap.has(menuItemId)) {
      itemMap.set(menuItemId, {
        id: menuItemId,
        name: embedded.name || "Unknown item",
        category: embedded.category || "Other",
        totalQuantity: 0,
        totalRevenue: 0,
        orderCount: 0,
        activeDates: new Set(),
      });
    }
    const current = itemMap.get(menuItemId);
    current.totalQuantity += Number(sale.qty) || 0;
    current.totalRevenue += Number(sale.net_sales) || 0;
    current.orderCount += 1;
    if (sale.business_date) current.activeDates.add(String(sale.business_date));
  }

  const itemPerformance = Array.from(itemMap.values()).map((item) => ({
    ...item,
    currentPrice: item.totalQuantity > 0 ? Number((item.totalRevenue / item.totalQuantity).toFixed(2)) : 0,
    dayCount: item.activeDates.size,
  }));

  const pricingSignalSummary = buildPricingSignalSummary(itemPerformance, {
    minItems: 4,
    minActiveDays: 3,
    minTotalUnits: 20,
  });
  const pricingRecommendations = buildPricingRecommendations(itemPerformance, {
    minItems: 4,
    minActiveDays: 3,
    minTotalUnits: 20,
  });

  const trafficByHour = {};
  for (const order of trafficOrders.data || []) {
    const parts = getDatePartsInTimeZone(order.opened_at, BUSINESS_TIMEZONE);
    if (!parts) continue;
    trafficByHour[parts.hour] = (trafficByHour[parts.hour] || 0) + 1;
  }

  const recentOrderCounts = {};
  for (const order of recentOrders.data || []) {
    recentOrderCounts[order.business_date] = (recentOrderCounts[order.business_date] || 0) + 1;
  }

  return {
    recentSalesWindow,
    trafficWindow,
    recentSalesDays,
    recentOrderCounts,
    pricingSignalSummary,
    pricingRecommendations,
    trafficByHour,
    forecastCount: (forecastRows.data || []).length,
    trendStatus: trend.data,
    inventoryPreview: Array.isArray(inventorySnapshot.data) ? inventorySnapshot.data.slice(0, 8) : [],
  };
}

function buildSummaryMarkdown(summary) {
  const recLines = summary.metrics.pricingRecommendations.map((rec) =>
    `- ${rec.itemName}: ${rec.action} from $${rec.currentPrice.toFixed(2)} to $${rec.suggestedPrice.toFixed(2)} (${rec.reason})`,
  );

  const salesLines = summary.metrics.recentSalesDays.map((day) =>
    `- ${day.date}: ${day.orders ?? day.itemCount ?? 0} items across ${day.qty} sold units and $${day.sales.toFixed(2)} sales`,
  );

  return [
    "# Demo Data Seeding Summary",
    "",
    `- Reference date: ${summary.referenceDate}`,
    `- Seeded window: ${summary.startDate} to ${summary.endDate}`,
    `- Demo orders inserted: ${summary.applyResult.insertedOrders}`,
    `- Sales line item rows affected via register_order: ${summary.applyResult.insertedSalesLines}`,
    `- Inventory consume rows inserted: ${summary.applyResult.insertedInventoryTxns}`,
    `- Forecast rows regenerated: ${summary.forecastResult && summary.forecastResult.item_forecasts ? summary.forecastResult.item_forecasts : 0} item rows`,
    "",
    "## Recent Daily Sales",
    ...salesLines,
    "",
    "## Pricing Readiness",
    `- State: ${summary.metrics.pricingSignalSummary.readiness.state}`,
    `- Code: ${summary.metrics.pricingSignalSummary.readiness.code}`,
    `- Unique price points: ${summary.metrics.pricingSignalSummary.uniquePriceCount}`,
    `- Active sales days: ${summary.metrics.pricingSignalSummary.maxActiveDays}`,
    `- Total units: ${summary.metrics.pricingSignalSummary.totalUnits}`,
    "",
    "## Recommendations",
    ...(recLines.length > 0 ? recLines : ["- No recommendation rows were produced."]),
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = loadEnv();
  const referenceDate = getBusinessDateKey(new Date(), BUSINESS_TIMEZONE);
  const endDate = referenceDate;
  const startDate = addDays(endDate, -(WINDOW_DAYS - 1));
  const outputDir = args.outputDir;

  await ensureDirectory(outputDir);

  const { menuByName, bomByMenuItemId } = await fetchMenuBlueprint(supabase);
  const orders = buildDemoPlan(endDate, menuByName);
  const touchedIngredientIds = Array.from(new Set(
    orders.flatMap((order) => order.items.flatMap((item) => (bomByMenuItemId.get(item.menuItemId) || []).map((bom) => bom.ingredientId))),
  ));

  const context = {
    referenceDate,
    startDate,
    endDate,
    outputDir,
    menuByName,
    bomByMenuItemId,
    orders,
    touchedIngredientIds,
  };

  const backupResult = await backupCurrentSlices(supabase, outputDir, context);

  const aggregatePlan = {};
  for (const order of orders) {
    for (const item of order.items) {
      const key = `${order.businessDate}|||${item.menuItemName}`;
      if (!aggregatePlan[key]) {
        aggregatePlan[key] = {
          businessDate: order.businessDate,
          itemName: item.menuItemName,
          qty: 0,
          netSales: 0,
        };
      }
      aggregatePlan[key].qty += item.qty;
      aggregatePlan[key].netSales = Number((aggregatePlan[key].netSales + item.lineTotal).toFixed(2));
    }
  }

  const preview = {
    referenceDate,
    startDate,
    endDate,
    orderCount: orders.length,
    uniqueMenuItems: Array.from(new Set(orders.flatMap((order) => order.items.map((item) => item.menuItemName)))),
    aggregatePlan: Object.values(aggregatePlan),
    backup: backupResult,
    mode: args.cleanupOnly ? "cleanup-only" : args.apply ? "apply" : "dry-run",
  };

  await writeJson(path.join(outputDir, "preview.json"), preview);

  if (!args.apply && !args.cleanupOnly) {
    console.log(JSON.stringify({
      status: "preview_only",
      referenceDate,
      startDate,
      endDate,
      orderCount: orders.length,
      uniqueItems: preview.uniqueMenuItems.length,
      backupDir: backupResult.backupDir,
    }, null, 2));
    return;
  }

  const cleanupResult = await cleanupPriorSeed(supabase, context);
  if (args.cleanupOnly) {
    await writeJson(path.join(outputDir, "cleanup-summary.json"), cleanupResult);
    console.log(JSON.stringify({ status: "cleanup_complete", cleanupResult, backupDir: backupResult.backupDir }, null, 2));
    return;
  }

  const applyResult = await insertDemoOrders(supabase, orders);
  const forecastResult = await regenerateForecast(supabase, referenceDate);
  const metrics = await collectPostSeedMetrics(supabase, context);

  const summary = {
    referenceDate,
    startDate,
    endDate,
    backupDir: backupResult.backupDir,
    cleanupResult,
    applyResult,
    forecastResult,
    metrics,
  };

  await writeJson(path.join(outputDir, "summary.json"), summary);
  await writeText(path.join(outputDir, "summary.md"), buildSummaryMarkdown(summary));

  console.log(JSON.stringify({
    status: "ok",
    referenceDate,
    startDate,
    endDate,
    backupDir: backupResult.backupDir,
    cleanupResult,
    applyResult,
    forecastResult,
    pricingState: metrics.pricingSignalSummary.readiness,
    recommendationCount: metrics.pricingRecommendations.length,
    recentSalesDays: metrics.recentSalesDays.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
