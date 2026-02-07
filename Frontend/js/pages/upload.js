/* ============================================================
   Upload Page — Daily CSV upload (ItemSelectionDetails + OrderDetails)
   ============================================================ */
const UploadPage = {
  render() {
    return `
      <div class="page-header">
        <h1>Upload Sales</h1>
        <p>Upload daily Toast CSV reports to update inventory and analytics</p>
      </div>

      <div class="tabs">
        <button class="tab-btn active" data-tab="item-upload">Item Sales (Inventory)</button>
        <button class="tab-btn" data-tab="order-upload">Order Details (Analytics)</button>
      </div>

      <div class="tab-panel active" id="tab-item-upload">
        <div class="card" style="margin-bottom:20px">
          <div class="card-label">Toast ItemSelectionDetails CSV</div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
            This feeds the consumption engine. Each row becomes a sales record that drives inventory tracking.
          </p>
          <div class="file-drop" id="item-drop">
            <div class="file-drop-text">Drop ItemSelectionDetails CSV here</div>
            <div class="file-drop-hint">or click to browse</div>
            <input type="file" id="item-file" accept=".csv" style="display:none">
          </div>
          <div id="item-preview" style="margin-top:12px;"></div>
          <button class="btn btn-primary hidden" id="item-upload-btn" style="margin-top:12px;">Upload & Process</button>
          <div id="item-result" style="margin-top:12px;"></div>
        </div>
      </div>

      <div class="tab-panel" id="tab-order-upload">
        <div class="card" style="margin-bottom:20px">
          <div class="card-label">Toast OrderDetails CSV</div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
            This feeds the analytics dashboard. Order-level data: revenue, tips, service type, server info.
          </p>
          <div class="file-drop" id="order-drop">
            <div class="file-drop-text">Drop OrderDetails CSV here</div>
            <div class="file-drop-hint">or click to browse</div>
            <input type="file" id="order-file" accept=".csv" style="display:none">
          </div>
          <div id="order-preview" style="margin-top:12px;"></div>
          <button class="btn btn-primary hidden" id="order-upload-btn" style="margin-top:12px;">Upload Orders</button>
          <div id="order-result" style="margin-top:12px;"></div>
        </div>
      </div>
    `;
  },

  init() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      });
    });

    // --- Item Sales Upload ---
    let itemRows = [];
    setupFileDrop('item-drop', 'item-file', (file) => {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete(result) {
        const rows = result.data.filter(r => r['Void?'] !== 'True' && r['Menu Item']);
        const agg = {};
        rows.forEach(r => {
          const dp = (r['Order Date'] || '').split(' ')[0].split('/');
          if (dp.length < 3) return;
          const bdate = `${dp[2]}-${dp[0].padStart(2,'0')}-${dp[1].padStart(2,'0')}`;
          const key = `${bdate}|${r['Menu Item']}`;
          if (!agg[key]) agg[key] = { business_date: bdate, menu_item_name: r['Menu Item'], category: r['Sales Category'] || '', qty: 0, net_sales: 0, source: 'toast' };
          agg[key].qty += parseFloat(r['Qty'] || 1);
          agg[key].net_sales += parseFloat(r['Net Price'] || 0);
        });
        itemRows = Object.values(agg);
        const dates = [...new Set(itemRows.map(r => r.business_date))].sort();
        document.getElementById('item-preview').innerHTML = `
          <span class="badge badge--info">${itemRows.length} rows</span>
          <span class="badge badge--info">${dates.length} dates</span>
          <span class="badge badge--info">${dates[0]} to ${dates[dates.length-1]}</span>
        `;
        document.getElementById('item-upload-btn').classList.remove('hidden');
      }});
    });

    document.getElementById('item-upload-btn').addEventListener('click', async () => {
      const btn = document.getElementById('item-upload-btn');
      btn.disabled = true; btn.textContent = 'Processing...';
      try {
        const { data, error } = await supabase.rpc('ingest_daily_sales', { p_rows: itemRows });
        if (error) throw new Error(error.message);

        // Run daily close for each date
        const dates = [...new Set(itemRows.map(r => r.business_date))];
        let closed = 0;
        for (const d of dates) {
          const { data: cd } = await supabase.rpc('run_daily_close', { p_business_date: d });
          if (cd && cd.status === 'success') closed++;
        }

        document.getElementById('item-result').innerHTML = `
          <div class="badge badge--ok">Success: ${data.rows_processed} rows ingested, ${closed} dates closed</div>
        `;
        toast(`Uploaded ${data.rows_processed} rows, closed ${closed} dates`, 'success');
      } catch (e) {
        document.getElementById('item-result').innerHTML = `<div class="badge badge--danger">${e.message}</div>`;
        toast(e.message, 'error');
      }
      btn.disabled = false; btn.textContent = 'Upload & Process';
    });

    // --- Order Details Upload ---
    let orderRows = [];
    setupFileDrop('order-drop', 'order-file', (file) => {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete(result) {
        orderRows = result.data.filter(r => r['Voided'] !== 'True').map(r => {
          const opened = r['Opened'] || '';
          const dp = opened.split(' ')[0].split('/');
          const bdate = dp.length >= 3 ? `${dp[2]}-${dp[0].padStart(2,'0')}-${dp[1].padStart(2,'0')}` : null;
          return {
            business_date: bdate,
            order_id: r['Order Id'],
            opened_at: parseToastDate(r['Opened']),
            closed_at: parseToastDate(r['Closed']),
            num_guests: parseInt(r['# of Guests']) || 0,
            server_name: r['Server'] || null,
            dining_area: r['Dining Area'] || null,
            service_period: r['Service'] || null,
            dining_option: r['Dining Options'] || null,
            order_source: r['Order Source'] || null,
            discount_amount: parseFloat(r['Discount Amount']) || 0,
            subtotal: parseFloat(r['Amount']) || 0,
            tax: parseFloat(r['Tax']) || 0,
            tip: parseFloat(r['Tip']) || 0,
            gratuity: parseFloat(r['Gratuity']) || 0,
            total: parseFloat(r['Total']) || 0,
            voided: false
          };
        }).filter(r => r.business_date);

        document.getElementById('order-preview').innerHTML = `
          <span class="badge badge--info">${orderRows.length} orders</span>
        `;
        document.getElementById('order-upload-btn').classList.remove('hidden');
      }});
    });

    document.getElementById('order-upload-btn').addEventListener('click', async () => {
      const btn = document.getElementById('order-upload-btn');
      btn.disabled = true; btn.textContent = 'Uploading...';
      try {
        const { data, error } = await supabase.rpc('ingest_daily_orders', { p_rows: orderRows });
        if (error) throw new Error(error.message);
        document.getElementById('order-result').innerHTML = `
          <div class="badge badge--ok">Success: ${data.rows_processed} orders ingested</div>
        `;
        toast(`Uploaded ${data.rows_processed} orders`, 'success');
      } catch (e) {
        document.getElementById('order-result').innerHTML = `<div class="badge badge--danger">${e.message}</div>`;
        toast(e.message, 'error');
      }
      btn.disabled = false; btn.textContent = 'Upload Orders';
    });
  }
};

// --- Helpers ---
function setupFileDrop(dropId, fileId, onFile) {
  const drop = document.getElementById(dropId);
  const inp = document.getElementById(fileId);
  drop.addEventListener('click', () => inp.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('dragover'); if (e.dataTransfer.files.length) onFile(e.dataTransfer.files[0]); });
  inp.addEventListener('change', () => { if (inp.files.length) onFile(inp.files[0]); });
}

function parseToastDate(str) {
  if (!str) return null;
  const [datePart, timePart] = str.split(' ');
  const [mm, dd, yyyy] = datePart.split('/');
  return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}T${timePart}`;
}
