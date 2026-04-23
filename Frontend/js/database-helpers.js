(function initStockdDatabase(globalScope) {
  function toSafeString(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return typeof value === "string" ? value : String(value);
  }

  function toNumber(value, fallback = 0) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    const parsed = Number(toSafeString(value).trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toDateKey(value) {
    const raw = toSafeString(value).trim();
    if (!raw) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString().slice(0, 10);
  }

  function addDays(dateKey, days) {
    const safeDateKey = toDateKey(dateKey);
    if (!safeDateKey) {
      return null;
    }

    const date = new Date(`${safeDateKey}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function getDatePartsInTimeZone(value, timeZone = "UTC") {
    const date = value instanceof Date ? value : new Date(toSafeString(value).trim());
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return null;
    }

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);

    const map = {};
    parts.forEach((part) => {
      if (part.type !== "literal") {
        map[part.type] = part.value;
      }
    });

    const weekdayIndex = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    }[map.weekday] ?? null;

    if (!map.year || !map.month || !map.day) {
      return null;
    }

    return {
      dateKey: `${map.year}-${map.month}-${map.day}`,
      hour: toNumber(map.hour),
      weekdayIndex,
    };
  }

  function getBusinessDateKey(value = new Date(), timeZone = "America/New_York") {
    const parts = getDatePartsInTimeZone(value, timeZone);
    return parts ? parts.dateKey : null;
  }

  function buildAnalysisWindow(options = {}) {
    const currentDateKey = toDateKey(options.currentDateKey);
    const latestAvailableDateKey = toDateKey(options.latestAvailableDateKey);
    const safeWindowDays = Math.max(1, Math.floor(toNumber(options.windowDays, 1)));
    const useCurrentWindow = options.useCurrentWindow !== false;

    if (useCurrentWindow && currentDateKey) {
      return {
        startDate: addDays(currentDateKey, -(safeWindowDays - 1)),
        endDate: currentDateKey,
        anchor: "current",
        usedFallback: false,
        windowDays: safeWindowDays,
      };
    }

    if (latestAvailableDateKey) {
      return {
        startDate: addDays(latestAvailableDateKey, -(safeWindowDays - 1)),
        endDate: latestAvailableDateKey,
        anchor: "latest_available",
        usedFallback: currentDateKey !== latestAvailableDateKey,
        windowDays: safeWindowDays,
      };
    }

    if (currentDateKey) {
      return {
        startDate: addDays(currentDateKey, -(safeWindowDays - 1)),
        endDate: currentDateKey,
        anchor: "current",
        usedFallback: false,
        windowDays: safeWindowDays,
      };
    }

    return null;
  }

  function shouldExcludeMenuEntry(name, category) {
    const safeName = toSafeString(name).trim().toLowerCase();
    const safeCategory = toSafeString(category).trim().toLowerCase();
    return safeName.startsWith("__") || safeCategory.includes("test");
  }

  function buildSalesTrend(rows) {
    const byDate = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const businessDate = toDateKey(row && row.business_date);
      if (!businessDate) {
        return;
      }

      if (!byDate.has(businessDate)) {
        byDate.set(businessDate, {
          date: businessDate,
          revenue: 0,
          orders: 0,
        });
      }

      const current = byDate.get(businessDate);
      current.revenue += toNumber(row && row.net_sales);
      current.orders += toNumber(row && row.qty);
    });

    return Array.from(byDate.values()).sort((left, right) => left.date.localeCompare(right.date));
  }

  function buildTopSellerStats(rows, options = {}) {
    const settings = options || {};
    const limit = typeof settings.limit === "number" ? settings.limit : null;
    const excludeTests = settings.excludeTests !== false;
    const itemMap = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const menuItemId = toSafeString(row && row.menu_item_id).trim();
      if (!menuItemId) {
        return;
      }

      const embeddedItem = row && typeof row.menu_items === "object" ? row.menu_items : null;
      const name = toSafeString(embeddedItem && embeddedItem.name).trim() || "Unknown";
      const category = toSafeString(embeddedItem && embeddedItem.category).trim();

      if (excludeTests && shouldExcludeMenuEntry(name, category)) {
        return;
      }

      if (!itemMap.has(menuItemId)) {
        itemMap.set(menuItemId, {
          id: menuItemId,
          name,
          category,
          totalQty: 0,
          totalSales: 0,
        });
      }

      const current = itemMap.get(menuItemId);
      current.totalQty += toNumber(row && row.qty);
      current.totalSales += toNumber(row && row.net_sales);
    });

    const results = Array.from(itemMap.values())
      .map((item) => ({
        ...item,
        avgUnitPrice: item.totalQty > 0
          ? Number((item.totalSales / item.totalQty).toFixed(2))
          : 0,
      }))
      .sort((left, right) => right.totalQty - left.totalQty);

    return limit === null ? results : results.slice(0, limit);
  }

  function buildCategoryStats(rows, options = {}) {
    const settings = options || {};
    const excludeTests = settings.excludeTests !== false;
    const categoryMap = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const embeddedItem = row && typeof row.menu_items === "object" ? row.menu_items : null;
      const name = toSafeString(embeddedItem && embeddedItem.name).trim() || "Unknown";
      const category = toSafeString(embeddedItem && embeddedItem.category).trim() || "Other";

      if (excludeTests && shouldExcludeMenuEntry(name, category)) {
        return;
      }

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          name: category,
          sales: 0,
          qty: 0,
        });
      }

      const current = categoryMap.get(category);
      current.sales += toNumber(row && row.net_sales);
      current.qty += toNumber(row && row.qty);
    });

    return Array.from(categoryMap.values()).sort((left, right) => right.sales - left.sales);
  }

  function buildRecentSalesDays(rows, options = {}) {
    const settings = options || {};
    const limit = typeof settings.limit === "number" ? settings.limit : null;
    const maxDate = toDateKey(settings.maxDate);
    const byDate = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const businessDate = toDateKey(row && row.business_date);
      const menuItemId = toSafeString(row && row.menu_item_id).trim();
      if (!businessDate || !menuItemId) {
        return;
      }

      if (maxDate && businessDate > maxDate) {
        return;
      }

      if (!byDate.has(businessDate)) {
        byDate.set(businessDate, {
          date: businessDate,
          qty: 0,
          sales: 0,
          itemIds: new Set(),
        });
      }

      const current = byDate.get(businessDate);
      current.qty += toNumber(row && row.qty);
      current.sales += toNumber(row && row.net_sales);
      current.itemIds.add(menuItemId);
    });

    const results = Array.from(byDate.values())
      .map((entry) => ({
        date: entry.date,
        qty: Number(entry.qty.toFixed(2)),
        sales: Number(entry.sales.toFixed(2)),
        itemCount: entry.itemIds.size,
      }))
      .sort((left, right) => right.date.localeCompare(left.date));

    return limit === null ? results : results.slice(0, limit);
  }

  function buildPricingSignalSummary(itemPerformance, options = {}) {
    const settings = options || {};
    const minItems = Math.max(1, Math.floor(toNumber(settings.minItems, 4)));
    const minActiveDays = Math.max(1, Math.floor(toNumber(settings.minActiveDays, 3)));
    const minTotalUnits = Math.max(1, Math.floor(toNumber(settings.minTotalUnits, 20)));

    const safeItems = (Array.isArray(itemPerformance) ? itemPerformance : [])
      .map((item) => ({
        id: toSafeString(item && item.id).trim(),
        name: toSafeString(item && item.name).trim() || "Unknown item",
        category: toSafeString(item && item.category).trim() || "Other",
        totalQuantity: toNumber(item && item.totalQuantity),
        totalRevenue: toNumber(item && item.totalRevenue),
        currentPrice: Number(toNumber(item && item.currentPrice).toFixed(2)),
        orderCount: Math.max(0, Math.floor(toNumber(item && item.orderCount))),
        dayCount: Math.max(0, Math.floor(toNumber(item && item.dayCount))),
      }))
      .filter((item) =>
        item.id &&
        item.totalQuantity > 0 &&
        item.currentPrice > 0 &&
        !shouldExcludeMenuEntry(item.name, item.category)
      );

    const uniquePricePoints = Array.from(new Set(
      safeItems.map((item) => Number(item.currentPrice.toFixed(2))),
    )).sort((left, right) => left - right);

    const categoryMap = new Map();
    let maxActiveDays = 0;
    let totalUnits = 0;
    let totalRevenue = 0;

    safeItems.forEach((item) => {
      totalUnits += item.totalQuantity;
      totalRevenue += item.totalRevenue;
      maxActiveDays = Math.max(maxActiveDays, item.dayCount);

      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, []);
      }

      categoryMap.get(item.category).push(item);
    });

    const categoryStats = Array.from(categoryMap.entries()).map(([category, items]) => {
      const prices = items.map((item) => item.currentPrice);
      const quantities = items.map((item) => item.totalQuantity);
      return {
        category,
        itemCount: items.length,
        avgPrice: Number((prices.reduce((sum, value) => sum + value, 0) / items.length).toFixed(2)),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        avgQuantity: Number((quantities.reduce((sum, value) => sum + value, 0) / items.length).toFixed(2)),
      };
    });

    let readiness = {
      state: "ready",
      title: "Recommendations available",
      message: "",
      code: "ready",
    };

    if (safeItems.length === 0) {
      readiness = {
        state: "insufficient_data",
        title: "No recent item sales found",
        message: "Not enough recent item sales are available in this window to evaluate pricing.",
        code: "no_sales_rows",
      };
    } else if (safeItems.length < minItems) {
      readiness = {
        state: "insufficient_data",
        title: "Not enough item coverage yet",
        message: `Only ${safeItems.length} selling item${safeItems.length === 1 ? "" : "s"} appeared in this window. Stockd needs a broader mix before pricing recommendations are reliable.`,
        code: "too_few_items",
      };
    } else if (maxActiveDays < minActiveDays) {
      readiness = {
        state: "insufficient_data",
        title: "Need a few more active sales days",
        message: `This window only has ${maxActiveDays} active sales day${maxActiveDays === 1 ? "" : "s"} for pricing analysis. Stockd waits for a little more day-to-day coverage before recommending changes.`,
        code: "too_few_days",
      };
    } else if (totalUnits < minTotalUnits) {
      readiness = {
        state: "insufficient_data",
        title: "Not enough sales volume yet",
        message: `This window only contains ${Math.round(totalUnits)} sold units. Stockd needs a bit more recent volume before suggesting price moves confidently.`,
        code: "too_few_units",
      };
    } else if (uniquePricePoints.length < 2) {
      const singlePrice = uniquePricePoints[0];
      const priceLabel = Number.isFinite(singlePrice) ? `$${singlePrice.toFixed(2)}` : "the same price";
      readiness = {
        state: "insufficient_data",
        title: "Price movement is not justified yet",
        message: `We have recent sales data, but every selling item in this window is currently at ${priceLabel}. Stockd needs real price variation before it can recommend dynamic pricing changes confidently.`,
        code: "no_price_diversity",
      };
    }

    return {
      items: safeItems,
      itemCount: safeItems.length,
      totalUnits: Number(totalUnits.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      maxActiveDays,
      uniquePricePoints,
      uniquePriceCount: uniquePricePoints.length,
      categoryStats,
      readiness,
    };
  }

  function buildPricingRecommendations(itemPerformance, options = {}) {
    const summary = buildPricingSignalSummary(itemPerformance, options);
    if (summary.readiness.state !== "ready") {
      return [];
    }

    const items = summary.items;
    const overallAvgQuantity = items.reduce((sum, item) => sum + item.totalQuantity, 0) / items.length;
    const categoryMap = new Map();

    items.forEach((item) => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, []);
      }
      categoryMap.get(item.category).push(item);
    });

    const recommendations = [];

    items.forEach((item) => {
      const peers = categoryMap.get(item.category) || [];
      if (peers.length < 2) {
        return;
      }

      const categoryAvgPrice = peers.reduce((sum, peer) => sum + peer.currentPrice, 0) / peers.length;
      const categoryAvgQuantity = peers.reduce((sum, peer) => sum + peer.totalQuantity, 0) / peers.length;
      const categoryMinPrice = Math.min(...peers.map((peer) => peer.currentPrice));
      const categoryMaxPrice = Math.max(...peers.map((peer) => peer.currentPrice));

      const quantityRatio = categoryAvgQuantity > 0 ? item.totalQuantity / categoryAvgQuantity : 1;
      const priceDelta = Number((item.currentPrice - categoryAvgPrice).toFixed(2));
      const hasMeaningfulPriceGap = Math.abs(priceDelta) >= 0.5;

      let recommendation = null;

      if (
        hasMeaningfulPriceGap &&
        quantityRatio >= 1.35 &&
        item.currentPrice <= categoryAvgPrice - 0.5
      ) {
        const targetPrice = Math.min(categoryAvgPrice, item.currentPrice + Math.max(0.25, Math.abs(priceDelta) * 0.5));
        recommendation = {
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          currentPrice: item.currentPrice,
          suggestedPrice: Number(targetPrice.toFixed(2)),
          priceChange: Number((targetPrice - item.currentPrice).toFixed(2)),
          percentChange: Math.round(((targetPrice - item.currentPrice) / item.currentPrice) * 100),
          action: "increase",
          actionIcon: "↗",
          reason: `Strong recent demand against lower-priced peers in ${item.category}.`,
          confidence: quantityRatio >= 1.6 ? "high" : "medium",
          risk: "low",
          metrics: {
            unitsSold: item.totalQuantity,
            revenue: item.totalRevenue,
            orders: item.orderCount,
          },
        };
      } else if (
        hasMeaningfulPriceGap &&
        quantityRatio <= 0.7 &&
        item.currentPrice >= categoryAvgPrice + 0.5
      ) {
        const targetPrice = Math.max(categoryAvgPrice, item.currentPrice - Math.max(0.25, Math.abs(priceDelta) * 0.5));
        recommendation = {
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          currentPrice: item.currentPrice,
          suggestedPrice: Number(targetPrice.toFixed(2)),
          priceChange: Number((targetPrice - item.currentPrice).toFixed(2)),
          percentChange: Math.round(((targetPrice - item.currentPrice) / item.currentPrice) * 100),
          action: "decrease",
          actionIcon: "↘",
          reason: `Trailing similar ${item.category.toLowerCase()} items at a higher price point.`,
          confidence: quantityRatio <= 0.5 ? "high" : "medium",
          risk: "medium",
          metrics: {
            unitsSold: item.totalQuantity,
            revenue: item.totalRevenue,
            orders: item.orderCount,
          },
        };
      } else if (
        categoryMaxPrice > categoryMinPrice &&
        item.totalQuantity >= overallAvgQuantity * 1.5 &&
        item.currentPrice === categoryMaxPrice
      ) {
        recommendation = {
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          currentPrice: item.currentPrice,
          suggestedPrice: item.currentPrice,
          priceChange: 0,
          percentChange: 0,
          action: "hold",
          actionIcon: "=",
          reason: `Recent demand is strong even at the top of the ${item.category.toLowerCase()} price range.`,
          confidence: "medium",
          risk: "low",
          metrics: {
            unitsSold: item.totalQuantity,
            revenue: item.totalRevenue,
            orders: item.orderCount,
          },
        };
      }

      if (recommendation) {
        if (recommendation.action !== "hold" && recommendation.currentPrice > 0) {
          const maxAllowedChange = Number((recommendation.currentPrice * 0.12).toFixed(2));
          if (Math.abs(recommendation.priceChange) > maxAllowedChange) {
            const adjustedPriceChange = recommendation.priceChange > 0 ? maxAllowedChange : -maxAllowedChange;
            recommendation.priceChange = adjustedPriceChange;
            recommendation.suggestedPrice = Number((recommendation.currentPrice + adjustedPriceChange).toFixed(2));
            recommendation.percentChange = Math.round((adjustedPriceChange / recommendation.currentPrice) * 100);
          }
        }

        recommendations.push(recommendation);
      }
    });

    return recommendations
      .sort((left, right) => {
        if (left.action !== right.action) {
          if (left.action === "increase") return -1;
          if (right.action === "increase") return 1;
        }

        return toNumber(right.metrics && right.metrics.revenue) - toNumber(left.metrics && left.metrics.revenue);
      })
      .slice(0, 5);
  }

  function buildDashboardForecastData(input = {}) {
    const forecastRows = Array.isArray(input.forecastRows) ? input.forecastRows : [];
    const salesRows = Array.isArray(input.salesRows) ? input.salesRows : [];
    const referenceDate = toDateKey(input.referenceDate) || toDateKey(new Date()) || null;
    const tomorrowDate = referenceDate ? addDays(referenceDate, 1) : null;

    const salesByItem = new Map();
    let latestSalesDate = null;

    salesRows.forEach((row) => {
      const menuItemId = toSafeString(row && row.menu_item_id).trim();
      const businessDate = toDateKey(row && row.business_date);
      const embeddedItem = row && typeof row.menu_items === "object" ? row.menu_items : null;

      if (!menuItemId || !businessDate) {
        return;
      }

      if (!latestSalesDate || businessDate > latestSalesDate) {
        latestSalesDate = businessDate;
      }

      if (!salesByItem.has(menuItemId)) {
        salesByItem.set(menuItemId, {
          menu_item_id: menuItemId,
          name: toSafeString(embeddedItem && embeddedItem.name).trim() || "Unknown",
          category: toSafeString(embeddedItem && embeddedItem.category).trim(),
          totalQty: 0,
          totalSales: 0,
          saleDates: new Set(),
        });
      }

      const current = salesByItem.get(menuItemId);
      current.totalQty += toNumber(row && row.qty);
      current.totalSales += toNumber(row && row.net_sales);
      current.saleDates.add(businessDate);
    });

    const forecastByDate = new Map();
    const menuItems = [];

    forecastRows.forEach((row) => {
      const forecastDate = toDateKey(row && row.forecast_date);
      const menuItemId = toSafeString(row && row.menu_item_id).trim();
      const qty = toNumber(row && row.qty);
      const embeddedItem = row && typeof row.menu_items === "object" ? row.menu_items : null;
      const salesEntry = salesByItem.get(menuItemId);
      const name = toSafeString((embeddedItem && embeddedItem.name) || (salesEntry && salesEntry.name)).trim() || "Unknown";
      const category = toSafeString((embeddedItem && embeddedItem.category) || (salesEntry && salesEntry.category)).trim();

      if (!forecastDate || !menuItemId) {
        return;
      }

      const totalQty = salesEntry ? salesEntry.totalQty : 0;
      const totalSales = salesEntry ? salesEntry.totalSales : 0;
      const saleDays = salesEntry ? salesEntry.saleDates.size : 0;
      const avgUnitPrice = totalQty > 0 ? totalSales / totalQty : 0;
      const avgDailySales = saleDays > 0 ? totalQty / saleDays : 0;

      if (!forecastByDate.has(forecastDate)) {
        forecastByDate.set(forecastDate, {
          date: forecastDate,
          revenue: 0,
        });
      }

      const forecastDay = forecastByDate.get(forecastDate);
      forecastDay.revenue += qty * avgUnitPrice;

      if (tomorrowDate && forecastDate === tomorrowDate) {
        menuItems.push({
          menu_item_id: menuItemId,
          forecast_date: forecastDate,
          name,
          category,
          price: Number(avgUnitPrice.toFixed(2)),
          avg_daily_sales: Number(avgDailySales.toFixed(2)),
          forecast_tomorrow: Number(qty.toFixed(2)),
          forecast_revenue: Number((qty * avgUnitPrice).toFixed(2)),
        });
      }
    });

    const dailyRevenue = Array.from(forecastByDate.values())
      .map((entry) => ({
        date: entry.date,
        revenue: Number(entry.revenue.toFixed(2)),
      }))
      .sort((left, right) => left.date.localeCompare(right.date));

    menuItems.sort((left, right) => {
      if (right.forecast_tomorrow !== left.forecast_tomorrow) {
        return right.forecast_tomorrow - left.forecast_tomorrow;
      }
      return left.name.localeCompare(right.name);
    });

    return {
      source: "forecast_items",
      reference_date: referenceDate,
      tomorrow_date: tomorrowDate,
      latest_sales_date: latestSalesDate,
      menu_items: menuItems,
      daily_revenue: dailyRevenue,
    };
  }

  function parseInventoryCountNote(note) {
    const match = toSafeString(note).match(
      /Physical count:\s*([+-]?\d+(?:\.\d+)?)\s*(?:→|->)\s*([+-]?\d+(?:\.\d+)?)(.*)$/i,
    );

    if (!match) {
      return null;
    }

    return {
      previousQty: toNumber(match[1], null),
      actualQty: toNumber(match[2], null),
      suffix: toSafeString(match[3]).trim(),
    };
  }

  function getCountVariancePercent(previousQty, delta) {
    const safePrevious = toNumber(previousQty, null);
    const safeDelta = toNumber(delta, null);

    if (safePrevious === null || safeDelta === null) {
      return null;
    }

    if (safePrevious === 0) {
      return safeDelta === 0 ? 0 : null;
    }

    return Number(((Math.abs(safeDelta) / Math.abs(safePrevious)) * 100).toFixed(2));
  }

  function summarizeCountMetrics(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    let accurateCount = 0;
    let varianceSampleCount = 0;
    let totalVariance = 0;
    let needsAttention = 0;
    let worstDiscrepancy = null;
    const perfectItems = new Set();

    safeRows.forEach((row) => {
      const delta = toNumber(row && row.qty_delta);
      const parsed = parseInventoryCountNote(row && row.note);
      const variance = parsed ? getCountVariancePercent(parsed.previousQty, delta) : null;
      const ingredientName = toSafeString(row && row.ingredients && row.ingredients.name).trim();

      if (variance !== null) {
        varianceSampleCount += 1;
        totalVariance += variance;

        if (variance <= 5) {
          accurateCount += 1;
        }

        if (variance > 10) {
          needsAttention += 1;
        }
      }

      if (delta === 0 && ingredientName) {
        perfectItems.add(ingredientName);
      }

      if (!worstDiscrepancy || Math.abs(delta) > Math.abs(toNumber(worstDiscrepancy.qty_delta))) {
        worstDiscrepancy = row;
      }
    });

    return {
      totalCounts: safeRows.length,
      accuracyRate: varianceSampleCount > 0
        ? Number(((accurateCount / varianceSampleCount) * 100).toFixed(1))
        : 0,
      avgDiscrepancy: varianceSampleCount > 0
        ? Number((totalVariance / varianceSampleCount).toFixed(1))
        : 0,
      needsAttention,
      varianceSampleCount,
      perfectItems: Array.from(perfectItems),
      lastCount: safeRows[0] || null,
      worstDiscrepancy,
    };
  }

  const api = {
    addDays,
    buildAnalysisWindow,
    buildCategoryStats,
    buildDashboardForecastData,
    buildPricingRecommendations,
    buildPricingSignalSummary,
    buildRecentSalesDays,
    buildSalesTrend,
    buildTopSellerStats,
    getBusinessDateKey,
    getCountVariancePercent,
    getDatePartsInTimeZone,
    parseInventoryCountNote,
    summarizeCountMetrics,
    toDateKey,
    toNumber,
    toSafeString,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.StockdDatabase = api;
})(typeof window !== "undefined" ? window : globalThis);
