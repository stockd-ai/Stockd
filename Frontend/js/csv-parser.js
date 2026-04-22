// ═══════════════════════════════════════════════
// js/csv-parser.js — Toast CSV → ingest_daily_sales payload
// Load AFTER PapaParse CDN script
// ═══════════════════════════════════════════════

const stockdSecurity = (() => {
  if (typeof window !== 'undefined' && window.StockdSecurity) {
    return window.StockdSecurity;
  }
  if (typeof require === 'function') {
    try {
      return require('./security-utils.js');
    } catch (err) {
      // Ignore in browser builds.
    }
  }
  return {};
})();

const sanitizeCsvCell = stockdSecurity.sanitizeCsvCell || (value => String(value || '').trim());

function parseDecimal(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeToastRecord(record) {
  const rawDate = sanitizeCsvCell(record['Order Date'], 40).split(' ')[0];
  let businessDate = null;

  if (rawDate) {
    const [mm, dd, yyyy] = rawDate.split('/');
    if (mm && dd && yyyy) {
      businessDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
  }

  return {
    business_date: businessDate,
    menu_item_name: sanitizeCsvCell(record['Menu Item'], 120),
    category: sanitizeCsvCell(record['Sales Category'], 80),
    qty: parseDecimal(record['Qty']),
    net_sales: parseDecimal(record['Net Price']),
    is_void: sanitizeCsvCell(record['Void?'], 16).toLowerCase() === 'true'
  };
}

/**
 * Parse a Toast ItemSelectionDetails CSV and return
 * rows aggregated by (business_date, menu_item) ready
 * for the ingest_daily_sales RPC.
 *
 * @param {File} file
 * @returns {Promise<{ rows: Array, stats: Object }>}
 */
function parseToastCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const raw = results.data;
        const normalized = raw.map(normalizeToastRecord);
        const nonVoid = normalized.filter(r => !r.is_void);

        // Filter voids
        const valid = nonVoid.filter(r => r.business_date && r.menu_item_name);

        // Group by (date, menu_item)
        const grouped = {};
        valid.forEach(r => {
          const key = `${r.business_date}|${r.menu_item_name}`;
          if (!grouped[key]) {
            grouped[key] = {
              business_date: r.business_date,
              menu_item_name: r.menu_item_name,
              category: r.category,
              qty: 0,
              net_sales: 0,
              source: 'toast'
            };
          }
          grouped[key].qty += r.qty;
          grouped[key].net_sales += r.net_sales;
        });

        const rows = Object.values(grouped).map(r => ({
          ...r,
          qty: Math.round(r.qty * 100) / 100,
          net_sales: Math.round(r.net_sales * 100) / 100
        }));

        const dates = [...new Set(rows.map(r => r.business_date))].sort();
        const items = [...new Set(rows.map(r => r.menu_item_name))];

        resolve({
          rows,
          stats: {
            rawRows: raw.length,
            voidsFiltered: raw.length - nonVoid.length,
            aggregatedRows: rows.length,
            uniqueItems: items.length,
            uniqueCategories: [...new Set(rows.map(r => r.category))].length,
            startDate: dates[0] || null,
            endDate: dates[dates.length - 1] || null,
            totalDays: dates.length,
            totalQty: rows.reduce((s, r) => s + r.qty, 0),
            totalSales: rows.reduce((s, r) => s + r.net_sales, 0)
          }
        });
      },
      error(err) { reject(new Error('CSV parse error: ' + err.message)); }
    });
  });
}

/** Split array into chunks */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Ingest parsed rows into Supabase in batches.
 * @param {Array} rows - Aggregated rows from parseToastCSV
 * @param {Function} onProgress - callback(processed, total)
 * @returns {Promise<{totalProcessed, totalItemsCreated}>}
 */
async function ingestBatched(rows, onProgress) {
  const BATCH = 500;
  const batches = chunk(rows, BATCH);
  let totalProcessed = 0;
  let totalItemsCreated = 0;

  for (let i = 0; i < batches.length; i++) {
    const { data, error } = await sb.rpc('ingest_daily_sales', { p_rows: batches[i] });
    if (error) throw new Error(`Batch ${i+1} failed: ${error.message}`);

    totalProcessed += data.rows_processed || batches[i].length;
    totalItemsCreated += data.menu_items_created || 0;
    if (onProgress) onProgress(totalProcessed, rows.length);
  }

  return { totalProcessed, totalItemsCreated };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    chunk,
    ingestBatched,
    normalizeToastRecord,
    parseToastCSV
  };
}
