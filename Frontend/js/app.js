/* ============================================================
   Tony's Pizza - Inventory Manager (Single-file app)
   ============================================================ */
(function () {
  'use strict';

  // --- CONFIG ---
  var SUPABASE_URL = 'https://ifycpxtpyysuthnknptl.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmeWNweHRweXlzdXRobmtucHRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NzAwMDksImV4cCI6MjA4NjA0NjAwOX0.RO2F6bLvbo34ZGRDpjbv8NrsHtmkX_D9mtXTVb0ErhY';

  // --- Supabase client ---
  var sb;
  try {
    var lib = window.supabase;
    if (!lib) throw new Error('Supabase CDN not loaded');
    sb = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    document.getElementById('login-loading').innerHTML =
      '<h1>Error</h1><p style="color:#ef4444;">Could not load Supabase: ' + e.message + '</p>';
    return;
  }

  // --- DOM refs ---
  var $shell = document.getElementById('app-shell');
  var $loginPage = document.getElementById('login-page');
  var $onboardingPage = document.getElementById('onboarding-page');
  var $pageContainer = document.getElementById('page-container');
  var $toastContainer = document.getElementById('toast-container');

  // --- Helpers ---
  function fmt(n, decimals) {
    if (decimals === undefined) decimals = 1;
    if (n === null || n === undefined) return '--';
    return Number(n).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function fmtDollars(n) {
    if (n === null || n === undefined) return '--';
    return '$' + Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function toast(message, type) {
    type = type || 'info';
    var el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.textContent = message;
    $toastContainer.appendChild(el);
    setTimeout(function () { el.remove(); }, 4000);
  }

  function setupFileDrop(dropId, fileId, onFile) {
    var drop = document.getElementById(dropId);
    var inp = document.getElementById(fileId);
    if (!drop || !inp) return;
    drop.addEventListener('click', function () { inp.click(); });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('dragover'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('dragover'); });
    drop.addEventListener('drop', function (e) {
      e.preventDefault(); drop.classList.remove('dragover');
      if (e.dataTransfer.files.length) onFile(e.dataTransfer.files[0]);
    });
    inp.addEventListener('change', function () { if (inp.files.length) onFile(inp.files[0]); });
  }

  function parseToastDate(str) {
    if (!str) return null;
    var parts = str.split(' ');
    var dp = parts[0].split('/');
    if (dp.length < 3) return null;
    return dp[2] + '-' + dp[0].padStart(2, '0') + '-' + dp[1].padStart(2, '0') + 'T' + (parts[1] || '00:00:00');
  }

  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      });
    });
  }

  /* ============================================================
     LOGIN PAGE
     ============================================================ */
  function renderLogin() {
    $loginPage.innerHTML = '\
      <div class="login-card">\
        <h1>&#127829; Tony\'s Pizza</h1>\
        <p class="subtitle">Inventory Management System</p>\
        <form id="login-form">\
          <div class="form-group">\
            <label>Email</label>\
            <input type="email" id="login-email" value="demo@tonys.pizza" required>\
          </div>\
          <div class="form-group">\
            <label>Password</label>\
            <input type="password" id="login-password" value="TonysPizza2026!" required>\
          </div>\
          <button type="submit" class="btn btn-primary" style="width:100%" id="login-btn">Sign In</button>\
          <div class="login-error" id="login-error"></div>\
          <div class="demo-hint">Demo credentials pre-filled. Just click Sign In.</div>\
        </form>\
      </div>';

    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = document.getElementById('login-btn');
      var errEl = document.getElementById('login-error');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Signing in...';
      errEl.textContent = '';

      sb.auth.signInWithPassword({
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-password').value
      }).then(function (res) {
        if (res.error) {
          errEl.textContent = res.error.message;
          btn.disabled = false;
          btn.textContent = 'Sign In';
          return;
        }
        checkAuth();
      });
    });
  }

  /* ============================================================
     ONBOARDING PAGE
     ============================================================ */
  function renderOnboarding() {
    $onboardingPage.innerHTML = '\
      <div class="onboarding-card">\
        <h1>Welcome to Tony\'s Pizza</h1>\
        <p>Upload your sales history CSV to get started.</p>\
        <div class="step-indicator">\
          <div class="step-dot active" id="step-1"></div>\
          <div class="step-dot" id="step-2"></div>\
          <div class="step-dot" id="step-3"></div>\
        </div>\
        <div id="onboarding-step1">\
          <div class="file-drop" id="onboarding-drop">\
            <div class="file-drop-text">Drop your ItemSelectionDetails CSV here</div>\
            <div class="file-drop-hint">or click to browse</div>\
            <input type="file" id="onboarding-file" accept=".csv" style="display:none">\
          </div>\
          <div id="onboarding-preview" style="margin-top:16px;"></div>\
          <button class="btn btn-primary hidden" id="onboarding-confirm" style="margin-top:16px;width:100%">Start Processing</button>\
        </div>\
        <div id="onboarding-step2" class="hidden">\
          <div class="progress-bar"><div class="progress-fill" id="onboarding-progress"></div></div>\
          <div id="onboarding-status">Preparing data...</div>\
        </div>\
        <div id="onboarding-step3" class="hidden">\
          <div style="font-size:48px;margin-bottom:16px;">&#9989;</div>\
          <h2>Setup Complete!</h2>\
          <div id="onboarding-result" style="margin:16px 0;color:var(--text-secondary);font-size:14px;"></div>\
          <button class="btn btn-primary" id="onboarding-go" style="width:100%">Go to Dashboard</button>\
        </div>\
      </div>';

    var parsedRows = [];

    setupFileDrop('onboarding-drop', 'onboarding-file', function (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (result) {
          var rows = result.data.filter(function (r) { return r['Void?'] !== 'True' && r['Menu Item']; });
          var agg = {};
          rows.forEach(function (r) {
            var dp = (r['Order Date'] || '').split(' ')[0].split('/');
            if (dp.length < 3) return;
            var bdate = dp[2] + '-' + dp[0].padStart(2, '0') + '-' + dp[1].padStart(2, '0');
            var key = bdate + '|' + r['Menu Item'];
            if (!agg[key]) agg[key] = { business_date: bdate, menu_item_name: r['Menu Item'], category: r['Sales Category'] || '', qty: 0, net_sales: 0, source: 'toast' };
            agg[key].qty += parseFloat(r['Qty'] || 1);
            agg[key].net_sales += parseFloat(r['Net Price'] || 0);
          });
          parsedRows = Object.values(agg);
          var dates = []; var seen = {};
          parsedRows.forEach(function (r) { if (!seen[r.business_date]) { seen[r.business_date] = true; dates.push(r.business_date); } });
          dates.sort();
          document.getElementById('onboarding-preview').innerHTML =
            '<div class="card" style="text-align:left"><div class="card-label">CSV Preview</div>' +
            '<div style="font-size:14px;color:var(--text-primary);"><strong>' + rows.length + '</strong> line items &rarr; <strong>' + parsedRows.length + '</strong> aggregated rows<br>' +
            '<strong>' + dates.length + '</strong> dates: ' + dates[0] + ' to ' + dates[dates.length - 1] + '<br>' +
            '<strong>' + new Set(parsedRows.map(function (r) { return r.menu_item_name; })).size + '</strong> unique menu items</div></div>';
          document.getElementById('onboarding-confirm').classList.remove('hidden');
        }
      });
    });

    document.getElementById('onboarding-confirm').addEventListener('click', function () {
      document.getElementById('onboarding-step1').classList.add('hidden');
      document.getElementById('onboarding-step2').classList.remove('hidden');
      document.getElementById('step-1').className = 'step-dot done';
      document.getElementById('step-2').className = 'step-dot active';

      var progress = document.getElementById('onboarding-progress');
      var status = document.getElementById('onboarding-status');
      var BATCH = 500;
      var totalBatches = Math.ceil(parsedRows.length / BATCH);

      (async function () {
        try {
          for (var i = 0; i < totalBatches; i++) {
            var batch = parsedRows.slice(i * BATCH, (i + 1) * BATCH);
            status.textContent = 'Ingesting batch ' + (i + 1) + ' of ' + totalBatches + '...';
            progress.style.width = ((i + 1) / (totalBatches + 2) * 100) + '%';
            var res = await sb.rpc('ingest_daily_sales', { p_rows: batch });
            if (res.error) throw new Error(res.error.message);
          }
          status.textContent = 'Recording onboarding...';
          progress.style.width = ((totalBatches + 1) / (totalBatches + 2) * 100) + '%';
          await sb.rpc('complete_onboarding_ingest');
          status.textContent = 'Processing consumption...';
          progress.style.width = '95%';
          var closeRes = await sb.rpc('run_bulk_close');
          progress.style.width = '100%';
          document.getElementById('onboarding-step2').classList.add('hidden');
          document.getElementById('onboarding-step3').classList.remove('hidden');
          document.getElementById('step-2').className = 'step-dot done';
          document.getElementById('step-3').className = 'step-dot done';
          if (closeRes.data) {
            document.getElementById('onboarding-result').textContent =
              closeRes.data.dates_processed + ' dates processed, ' + closeRes.data.total_consume_txns + ' consumption records.';
          }
        } catch (err) {
          status.textContent = 'Error: ' + err.message;
          status.style.color = 'var(--danger)';
        }
      })();
    });

    var goBtn = document.getElementById('onboarding-go');
    if (goBtn) goBtn.addEventListener('click', function () { checkAuth(); });
  }

  /* ============================================================
     DASHBOARD PAGE
     ============================================================ */
  function renderDashboard() {
    $pageContainer.innerHTML = '\
      <div class="page-header"><h1>Dashboard</h1><p>Real-time inventory status and alerts</p></div>\
      <div class="card-grid" id="dash-cards"><div class="card"><div class="loading-state"><span class="spinner"></span></div></div></div>\
      <div class="table-wrap"><div class="table-title">Inventory Snapshot</div>\
      <div id="dash-table"><div class="loading-state"><span class="spinner"></span> Loading...</div></div></div>';

    sb.rpc('get_inventory_snapshot').then(function (res) {
      if (res.error) { toast(res.error.message, 'error'); return; }
      var snap = res.data || [];
      var critical = snap.filter(function (r) { return r.status === 'critical'; }).length;
      var reorder = snap.filter(function (r) { return r.status === 'reorder_soon'; }).length;
      var ok = snap.filter(function (r) { return r.status === 'ok'; }).length;
      var totalValue = snap.reduce(function (s, r) { return s + (r.qty_on_hand * (r.unit_cost || 0)); }, 0);

      document.getElementById('dash-cards').innerHTML =
        '<div class="card card--danger"><div class="card-label">Critical</div><div class="card-value">' + critical + '</div><div class="card-sub">need immediate restock</div></div>' +
        '<div class="card card--warning"><div class="card-label">Reorder Soon</div><div class="card-value">' + reorder + '</div><div class="card-sub">running low</div></div>' +
        '<div class="card card--success"><div class="card-label">OK</div><div class="card-value">' + ok + '</div><div class="card-sub">at healthy levels</div></div>' +
        '<div class="card card--info"><div class="card-label">Inventory Value</div><div class="card-value">' + fmtDollars(totalValue) + '</div><div class="card-sub">' + snap.length + ' ingredients tracked</div></div>';

      if (!snap.length) {
        document.getElementById('dash-table').innerHTML = '<p style="padding:20px;color:var(--text-muted)">No inventory data yet.</p>';
        return;
      }
      var rows = snap.map(function (r) {
        return '<tr><td><strong>' + r.name + '</strong></td><td class="num">' + fmt(r.qty_on_hand) + '</td><td>' + r.unit + '</td>' +
          '<td class="num">' + fmt(r.avg_daily_usage) + '</td><td class="num">' + (r.days_of_supply !== null ? fmt(r.days_of_supply) + 'd' : '--') + '</td>' +
          '<td class="num">' + fmt(r.reorder_point, 0) + '</td><td class="num">' + fmtDollars(r.unit_cost) + '</td>' +
          '<td><span class="badge badge--' + r.status + '">' + r.status.replace('_', ' ') + '</span></td></tr>';
      }).join('');
      document.getElementById('dash-table').innerHTML =
        '<table><thead><tr><th>Ingredient</th><th>On Hand</th><th>Unit</th><th>Avg/Day</th><th>Days Supply</th><th>Reorder Pt</th><th>Cost/Unit</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';
    });
  }

  /* ============================================================
     UPLOAD PAGE
     ============================================================ */
  function renderUpload() {
    $pageContainer.innerHTML = '\
      <div class="page-header"><h1>Upload Sales</h1><p>Upload daily Toast CSV reports</p></div>\
      <div class="tabs">\
        <button class="tab-btn active" data-tab="item-upload">Item Sales (Inventory)</button>\
        <button class="tab-btn" data-tab="order-upload">Order Details (Analytics)</button>\
      </div>\
      <div class="tab-panel active" id="tab-item-upload">\
        <div class="card" style="margin-bottom:20px"><div class="card-label">Toast ItemSelectionDetails CSV</div>\
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Feeds the consumption engine and inventory tracking.</p>\
        <div class="file-drop" id="item-drop"><div class="file-drop-text">Drop ItemSelectionDetails CSV here</div><div class="file-drop-hint">or click to browse</div>\
        <input type="file" id="item-file" accept=".csv" style="display:none"></div>\
        <div id="item-preview" style="margin-top:12px;"></div>\
        <button class="btn btn-primary hidden" id="item-upload-btn" style="margin-top:12px;">Upload &amp; Process</button>\
        <div id="item-result" style="margin-top:12px;"></div></div>\
      </div>\
      <div class="tab-panel" id="tab-order-upload">\
        <div class="card" style="margin-bottom:20px"><div class="card-label">Toast OrderDetails CSV</div>\
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Feeds the analytics dashboard with order-level data.</p>\
        <div class="file-drop" id="order-drop"><div class="file-drop-text">Drop OrderDetails CSV here</div><div class="file-drop-hint">or click to browse</div>\
        <input type="file" id="order-file" accept=".csv" style="display:none"></div>\
        <div id="order-preview" style="margin-top:12px;"></div>\
        <button class="btn btn-primary hidden" id="order-upload-btn" style="margin-top:12px;">Upload Orders</button>\
        <div id="order-result" style="margin-top:12px;"></div></div>\
      </div>';

    initTabs();
    var itemRows = [];
    setupFileDrop('item-drop', 'item-file', function (file) {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: function (result) {
        var rows = result.data.filter(function (r) { return r['Void?'] !== 'True' && r['Menu Item']; });
        var agg = {};
        rows.forEach(function (r) {
          var dp = (r['Order Date'] || '').split(' ')[0].split('/');
          if (dp.length < 3) return;
          var bdate = dp[2] + '-' + dp[0].padStart(2, '0') + '-' + dp[1].padStart(2, '0');
          var key = bdate + '|' + r['Menu Item'];
          if (!agg[key]) agg[key] = { business_date: bdate, menu_item_name: r['Menu Item'], category: r['Sales Category'] || '', qty: 0, net_sales: 0, source: 'toast' };
          agg[key].qty += parseFloat(r['Qty'] || 1);
          agg[key].net_sales += parseFloat(r['Net Price'] || 0);
        });
        itemRows = Object.values(agg);
        var dates = []; var seen = {};
        itemRows.forEach(function (r) { if (!seen[r.business_date]) { seen[r.business_date] = true; dates.push(r.business_date); } });
        dates.sort();
        document.getElementById('item-preview').innerHTML =
          '<span class="badge badge--info">' + itemRows.length + ' rows</span> <span class="badge badge--info">' + dates.length + ' dates</span> <span class="badge badge--info">' + dates[0] + ' to ' + dates[dates.length - 1] + '</span>';
        document.getElementById('item-upload-btn').classList.remove('hidden');
      }});
    });

    document.getElementById('item-upload-btn').addEventListener('click', function () {
      var btn = document.getElementById('item-upload-btn');
      btn.disabled = true; btn.textContent = 'Processing...';
      sb.rpc('ingest_daily_sales', { p_rows: itemRows }).then(function (res) {
        if (res.error) { toast(res.error.message, 'error'); btn.disabled = false; btn.textContent = 'Upload & Process'; return; }
        var dates = []; var seen = {};
        itemRows.forEach(function (r) { if (!seen[r.business_date]) { seen[r.business_date] = true; dates.push(r.business_date); } });
        var closed = 0; var i = 0;
        function closeNext() {
          if (i >= dates.length) {
            document.getElementById('item-result').innerHTML = '<div class="badge badge--ok">Success: ' + res.data.rows_processed + ' rows ingested, ' + closed + ' dates closed</div>';
            toast('Uploaded ' + res.data.rows_processed + ' rows', 'success');
            btn.disabled = false; btn.textContent = 'Upload & Process';
            return;
          }
          sb.rpc('run_daily_close', { p_business_date: dates[i] }).then(function (cr) {
            if (cr.data && cr.data.status === 'success') closed++;
            i++; closeNext();
          });
        }
        closeNext();
      });
    });

    var orderRows = [];
    setupFileDrop('order-drop', 'order-file', function (file) {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: function (result) {
        orderRows = result.data.filter(function (r) { return r['Voided'] !== 'True'; }).map(function (r) {
          var opened = r['Opened'] || '';
          var dp = opened.split(' ')[0].split('/');
          var bdate = dp.length >= 3 ? dp[2] + '-' + dp[0].padStart(2, '0') + '-' + dp[1].padStart(2, '0') : null;
          return {
            business_date: bdate, order_id: r['Order Id'], opened_at: parseToastDate(r['Opened']), closed_at: parseToastDate(r['Closed']),
            num_guests: parseInt(r['# of Guests']) || 0, server_name: r['Server'] || null, dining_area: r['Dining Area'] || null,
            service_period: r['Service'] || null, dining_option: r['Dining Options'] || null, order_source: r['Order Source'] || null,
            discount_amount: parseFloat(r['Discount Amount']) || 0, subtotal: parseFloat(r['Amount']) || 0,
            tax: parseFloat(r['Tax']) || 0, tip: parseFloat(r['Tip']) || 0, gratuity: parseFloat(r['Gratuity']) || 0,
            total: parseFloat(r['Total']) || 0, voided: false
          };
        }).filter(function (r) { return r.business_date; });
        document.getElementById('order-preview').innerHTML = '<span class="badge badge--info">' + orderRows.length + ' orders</span>';
        document.getElementById('order-upload-btn').classList.remove('hidden');
      }});
    });

    document.getElementById('order-upload-btn').addEventListener('click', function () {
      var btn = document.getElementById('order-upload-btn');
      btn.disabled = true; btn.textContent = 'Uploading...';
      sb.rpc('ingest_daily_orders', { p_rows: orderRows }).then(function (res) {
        if (res.error) { toast(res.error.message, 'error'); } else {
          document.getElementById('order-result').innerHTML = '<div class="badge badge--ok">Success: ' + res.data.rows_processed + ' orders ingested</div>';
          toast('Uploaded ' + res.data.rows_processed + ' orders', 'success');
        }
        btn.disabled = false; btn.textContent = 'Upload Orders';
      });
    });
  }

  /* ============================================================
     INVENTORY OPS PAGE
     ============================================================ */
  function renderInventory() {
    $pageContainer.innerHTML = '\
      <div class="page-header"><h1>Inventory Operations</h1><p>Receive deliveries and correct stock via physical counts</p></div>\
      <div class="tabs"><button class="tab-btn active" data-tab="receive-tab">Receive Delivery</button><button class="tab-btn" data-tab="count-tab">Physical Count</button></div>\
      <div class="tab-panel active" id="tab-receive-tab"><div class="card"><div class="card-label">Receive Inventory</div>\
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Record a delivery. Adds stock and creates an audit record.</p>\
        <div class="form-row"><div class="form-group"><label>Ingredient</label><select id="recv-ingredient"><option>Loading...</option></select></div>\
        <div class="form-group"><label>Quantity</label><input type="number" id="recv-qty" min="0.01" step="0.01" placeholder="e.g. 50"></div></div>\
        <div class="form-group"><label>Note (optional)</label><input type="text" id="recv-note" placeholder="e.g. Weekly delivery from Sysco"></div>\
        <button class="btn btn-primary" id="recv-btn">Receive</button><div id="recv-result" style="margin-top:12px;"></div></div></div>\
      <div class="tab-panel" id="tab-count-tab"><div class="card"><div class="card-label">Physical Count</div>\
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Enter actual counted quantity. System calculates the adjustment.</p>\
        <div class="form-row"><div class="form-group"><label>Ingredient</label><select id="count-ingredient"><option>Loading...</option></select></div>\
        <div class="form-group"><label>Current On Hand</label><input type="text" id="count-current" readonly placeholder="Select ingredient"></div>\
        <div class="form-group"><label>Actual Count</label><input type="number" id="count-qty" min="0" step="0.01" placeholder="Actual qty"></div></div>\
        <button class="btn btn-primary" id="count-btn">Submit Count</button><div id="count-result" style="margin-top:12px;"></div></div></div>';

    initTabs();

    sb.from('ingredients').select('id, name, unit').order('name').then(function (res) {
      var ings = res.data || [];
      var options = '<option value="">-- Select --</option>' + ings.map(function (i) { return '<option value="' + i.id + '">' + i.name + ' (' + i.unit + ')</option>'; }).join('');
      document.getElementById('recv-ingredient').innerHTML = options;
      document.getElementById('count-ingredient').innerHTML = options;
    });

    document.getElementById('count-ingredient').addEventListener('change', function (e) {
      var id = e.target.value;
      if (!id) { document.getElementById('count-current').value = ''; return; }
      sb.from('inventory_on_hand').select('qty_on_hand').eq('ingredient_id', id).single().then(function (res) {
        document.getElementById('count-current').value = res.data ? fmt(res.data.qty_on_hand) : '0 (no record)';
      });
    });

    document.getElementById('recv-btn').addEventListener('click', function () {
      var id = document.getElementById('recv-ingredient').value;
      var qty = parseFloat(document.getElementById('recv-qty').value);
      var note = document.getElementById('recv-note').value || null;
      if (!id || !qty) { toast('Select ingredient and enter qty', 'error'); return; }
      sb.rpc('receive_inventory', { p_ingredient_id: id, p_qty: qty, p_note: note }).then(function (res) {
        if (res.error) { toast(res.error.message, 'error'); return; }
        if (res.data.status === 'error') { toast(res.data.message, 'error'); return; }
        document.getElementById('recv-result').innerHTML = '<span class="badge badge--ok">Received ' + qty + '. New on-hand: ' + fmt(res.data.new_qty_on_hand) + '</span>';
        toast('Received ' + qty + ' units', 'success');
        document.getElementById('recv-qty').value = '';
        document.getElementById('recv-note').value = '';
      });
    });

    document.getElementById('count-btn').addEventListener('click', function () {
      var id = document.getElementById('count-ingredient').value;
      var qty = parseFloat(document.getElementById('count-qty').value);
      if (!id || isNaN(qty)) { toast('Select ingredient and enter actual qty', 'error'); return; }
      sb.rpc('count_inventory', { p_ingredient_id: id, p_actual_qty: qty }).then(function (res) {
        if (res.error) { toast(res.error.message, 'error'); return; }
        if (res.data.status === 'error') { toast(res.data.message, 'error'); return; }
        var delta = res.data.delta >= 0 ? '+' + res.data.delta : res.data.delta;
        document.getElementById('count-result').innerHTML = '<span class="badge badge--ok">Adjusted: ' + res.data.previous_qty + ' &rarr; ' + res.data.new_qty_on_hand + ' (' + delta + ')</span>';
        toast('Count recorded (delta: ' + delta + ')', 'success');
        document.getElementById('count-current').value = fmt(res.data.new_qty_on_hand);
        document.getElementById('count-qty').value = '';
      });
    });
  }

  /* ============================================================
     FORECAST PAGE
     ============================================================ */
  function renderForecast() {
    $pageContainer.innerHTML = '\
      <div class="page-header"><h1>7-Day Forecast</h1><p>Predicted ingredient needs based on day-of-week sales averages</p></div>\
      <div class="card" style="margin-bottom:20px;"><div class="form-row" style="align-items:end;">\
        <div class="form-group" style="margin-bottom:0;"><label>Reference Date</label><input type="date" id="fc-date" value="2016-01-01"></div>\
        <div style="margin-bottom:0;"><button class="btn btn-primary" id="fc-generate">Generate Forecast</button></div></div></div>\
      <div class="card-grid" id="fc-cards"></div>\
      <div class="table-wrap"><div class="table-title">Ingredient Forecast</div>\
      <div id="fc-table"><div class="loading-state"><span class="spinner"></span> Loading...</div></div></div>';

    loadForecast();

    document.getElementById('fc-generate').addEventListener('click', function () {
      var btn = document.getElementById('fc-generate');
      var refDate = document.getElementById('fc-date').value;
      if (!refDate) { toast('Pick a date', 'error'); return; }
      btn.disabled = true; btn.textContent = 'Generating...';
      sb.rpc('generate_forecast', { p_days_ahead: 7, p_reference_date: refDate }).then(function (res) {
        if (res.error) toast(res.error.message, 'error');
        else toast('Generated ' + res.data.item_forecasts + ' item + ' + res.data.ingredient_forecasts + ' ingredient forecasts', 'success');
        btn.disabled = false; btn.textContent = 'Generate Forecast';
        loadForecast();
      });
    });
  }

  function loadForecast() {
    var refDate = document.getElementById('fc-date').value || '2016-01-01';
    sb.rpc('get_forecast', { p_reference_date: refDate }).then(function (res) {
      if (res.error) { toast(res.error.message, 'error'); return; }
      var fc = res.data || [];
      var shortfalls = fc.filter(function (r) { return r.shortfall > 0; });
      var totalNeeded = fc.reduce(function (s, r) { return s + r.qty_needed; }, 0);
      var dates = []; var seen = {};
      fc.forEach(function (r) { if (!seen[r.forecast_date]) { seen[r.forecast_date] = true; dates.push(r.forecast_date); } });

      document.getElementById('fc-cards').innerHTML =
        '<div class="card card--info"><div class="card-label">Forecast Period</div><div class="card-value">' + dates.length + ' days</div><div class="card-sub">' + (dates[0] || 'N/A') + ' to ' + (dates[dates.length - 1] || 'N/A') + '</div></div>' +
        '<div class="card card--danger"><div class="card-label">Shortfalls</div><div class="card-value">' + shortfalls.length + '</div><div class="card-sub">of ' + fc.length + ' combos</div></div>' +
        '<div class="card card--warning"><div class="card-label">Total Need</div><div class="card-value">' + fmt(totalNeeded, 0) + '</div><div class="card-sub">across all ingredients</div></div>';

      if (!fc.length) {
        document.getElementById('fc-table').innerHTML = '<p style="padding:20px;color:var(--text-muted);">No forecast data. Click Generate Forecast.</p>';
        return;
      }
      var rows = fc.map(function (r) {
        return '<tr><td>' + r.forecast_date + '</td><td><strong>' + r.name + '</strong></td><td class="num">' + fmt(r.qty_needed) + '</td><td class="num">' + fmt(r.qty_on_hand) + '</td>' +
          '<td class="num">' + fmt(r.shortfall) + '</td><td>' + r.unit + '</td>' +
          '<td>' + (r.shortfall > 0 ? '<span class="badge badge--danger">Short</span>' : '<span class="badge badge--ok">OK</span>') + '</td></tr>';
      }).join('');
      document.getElementById('fc-table').innerHTML =
        '<table><thead><tr><th>Date</th><th>Ingredient</th><th>Needed</th><th>On Hand</th><th>Shortfall</th><th>Unit</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';
    });
  }

  /* ============================================================
     ANALYTICS PAGE
     ============================================================ */
  function renderAnalytics() {
    $pageContainer.innerHTML = '\
      <div class="page-header"><h1>Analytics</h1><p>Revenue, orders, and service performance</p></div>\
      <div class="card" style="margin-bottom:20px;"><div class="form-row" style="align-items:end;">\
        <div class="form-group" style="margin-bottom:0;"><label>Business Date</label><input type="date" id="analytics-date" value="2015-12-31"></div>\
        <div style="margin-bottom:0;"><button class="btn btn-primary" id="analytics-load">Load Analytics</button></div></div></div>\
      <div class="card-grid" id="analytics-cards"><div class="card"><div class="loading-state"><span class="spinner"></span></div></div></div>\
      <div id="analytics-breakdowns" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;"></div>';

    loadAnalytics();
    document.getElementById('analytics-load').addEventListener('click', loadAnalytics);
  }

  function loadAnalytics() {
    var dateVal = document.getElementById('analytics-date').value || null;
    var params = dateVal ? { p_business_date: dateVal } : {};
    sb.rpc('get_daily_analytics', params).then(function (res) {
      if (res.error) { toast(res.error.message, 'error'); return; }
      var data = res.data;
      if (!data || data.status === 'no_data') {
        document.getElementById('analytics-cards').innerHTML = '<div class="card"><div class="card-label">No Data</div><div class="card-value">--</div><div class="card-sub">No orders for this date.</div></div>';
        document.getElementById('analytics-breakdowns').innerHTML = '';
        return;
      }
      document.getElementById('analytics-cards').innerHTML =
        '<div class="card card--info"><div class="card-label">Total Revenue</div><div class="card-value">' + fmtDollars(data.total_revenue) + '</div><div class="card-sub">' + data.business_date + '</div></div>' +
        '<div class="card card--success"><div class="card-label">Orders</div><div class="card-value">' + data.total_orders + '</div><div class="card-sub">Avg ' + fmtDollars(data.avg_order_value) + '/order</div></div>' +
        '<div class="card card--warning"><div class="card-label">Guests</div><div class="card-value">' + data.total_guests + '</div><div class="card-sub">Avg ' + fmt(data.avg_guests_per_order) + '/order</div></div>' +
        '<div class="card card--info"><div class="card-label">Tips</div><div class="card-value">' + fmtDollars(data.total_tips) + '</div><div class="card-sub">Discounts: ' + fmtDollars(data.total_discounts) + '</div></div>';

      var bd = '';
      if (data.by_service_period && data.by_service_period.length) {
        bd += '<div class="table-wrap"><div class="table-title">By Service Period</div><table><thead><tr><th>Period</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>' +
          data.by_service_period.map(function (r) { return '<tr><td>' + r.period + '</td><td class="num">' + r.orders + '</td><td class="num">' + fmtDollars(r.revenue) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
      if (data.by_dining_option && data.by_dining_option.length) {
        bd += '<div class="table-wrap"><div class="table-title">By Dining Option</div><table><thead><tr><th>Option</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>' +
          data.by_dining_option.map(function (r) { return '<tr><td>' + r.option + '</td><td class="num">' + r.orders + '</td><td class="num">' + fmtDollars(r.revenue) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
      if (data.by_server && data.by_server.length) {
        bd += '<div class="table-wrap" style="grid-column:1/-1;"><div class="table-title">Server Performance</div><table><thead><tr><th>Server</th><th>Orders</th><th>Revenue</th><th>Tips</th></tr></thead><tbody>' +
          data.by_server.map(function (r) { return '<tr><td><strong>' + r.server + '</strong></td><td class="num">' + r.orders + '</td><td class="num">' + fmtDollars(r.revenue) + '</td><td class="num">' + fmtDollars(r.tips) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
      if (data.by_hour && data.by_hour.length) {
        bd += '<div class="table-wrap" style="grid-column:1/-1;"><div class="table-title">Orders by Hour</div><table><thead><tr><th>Hour</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>' +
          data.by_hour.map(function (r) { return '<tr><td>' + String(Math.floor(r.hour)).padStart(2, '0') + ':00</td><td class="num">' + r.orders + '</td><td class="num">' + fmtDollars(r.revenue) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
      document.getElementById('analytics-breakdowns').innerHTML = bd;
    });
  }

  /* ============================================================
     ADMIN PAGE
     ============================================================ */
  function renderAdmin() {
    $pageContainer.innerHTML = '\
      <div class="page-header"><h1>Admin</h1><p>Manage menu items, ingredients, and recipes</p></div>\
      <div class="tabs"><button class="tab-btn active" data-tab="admin-menu">Menu Items</button><button class="tab-btn" data-tab="admin-ingredients">Ingredients</button><button class="tab-btn" data-tab="admin-bom">BOM / Recipes</button></div>\
      <div class="tab-panel active" id="tab-admin-menu">\
        <div class="card" style="margin-bottom:16px;"><div class="card-label">Add / Edit Menu Item</div>\
        <div class="form-row"><div class="form-group"><label>Name</label><input type="text" id="mi-name" placeholder="e.g. BBQ Chicken Pizza"></div>\
        <div class="form-group"><label>Category</label><input type="text" id="mi-category" placeholder="e.g. Chicken"></div>\
        <div style="display:flex;align-items:end;padding-bottom:16px;"><button class="btn btn-primary btn-sm" id="mi-save">Add Item</button></div></div></div>\
        <div class="table-wrap"><div class="table-title">Menu Items <span id="mi-count" style="font-weight:400;color:var(--text-muted);font-size:13px;"></span></div>\
        <div id="mi-table"><div class="loading-state"><span class="spinner"></span></div></div></div>\
      </div>\
      <div class="tab-panel" id="tab-admin-ingredients">\
        <div class="card" style="margin-bottom:16px;"><div class="card-label">Add / Edit Ingredient</div>\
        <div class="form-row"><div class="form-group"><label>Name</label><input type="text" id="ing-name" placeholder="e.g. Goat Cheese"></div>\
        <div class="form-group"><label>Unit</label><select id="ing-unit"><option value="oz">oz</option><option value="g">g</option><option value="lb">lb</option><option value="each">each</option></select></div>\
        <div class="form-group"><label>Reorder Pt</label><input type="number" id="ing-reorder" value="20" min="0"></div>\
        <div class="form-group"><label>Lead Time (days)</label><input type="number" id="ing-lead" value="2" min="0"></div>\
        <div class="form-group"><label>Cost/Unit ($)</label><input type="number" id="ing-cost" value="0.10" min="0" step="0.01"></div></div>\
        <button class="btn btn-primary btn-sm" id="ing-save">Add Ingredient</button></div>\
        <div class="table-wrap"><div class="table-title">Ingredients <span id="ing-count" style="font-weight:400;color:var(--text-muted);font-size:13px;"></span></div>\
        <div id="ing-table"><div class="loading-state"><span class="spinner"></span></div></div></div>\
      </div>\
      <div class="tab-panel" id="tab-admin-bom">\
        <div class="card" style="margin-bottom:16px;"><div class="card-label">Recipe Builder</div>\
        <div class="form-row"><div class="form-group"><label>Menu Item</label><select id="bom-menu-item"><option value="">Loading...</option></select></div>\
        <div style="display:flex;align-items:end;padding-bottom:16px;"><button class="btn btn-secondary btn-sm" id="bom-load">View Recipe</button></div></div></div>\
        <div id="bom-recipe" style="margin-bottom:16px;"></div>\
        <div class="card" style="margin-bottom:16px;"><div class="card-label">Add Ingredient to Recipe</div>\
        <div class="form-row"><div class="form-group"><label>Ingredient</label><select id="bom-ingredient"><option value="">Loading...</option></select></div>\
        <div class="form-group"><label>Qty Per Item</label><input type="number" id="bom-qty" min="0.01" step="0.01" placeholder="oz per pizza"></div>\
        <div style="display:flex;align-items:end;padding-bottom:16px;"><button class="btn btn-primary btn-sm" id="bom-save">Add to Recipe</button></div></div></div>\
      </div>';

    initTabs();
    adminLoadMenuItems();
    adminLoadIngredients();
    adminLoadBomDropdowns();

    document.getElementById('mi-save').addEventListener('click', function () {
      var name = document.getElementById('mi-name').value.trim();
      var category = document.getElementById('mi-category').value.trim();
      if (!name) { toast('Name is required', 'error'); return; }
      sb.rpc('upsert_menu_item', { p_name: name, p_category: category || null }).then(function (res) {
        if (res.data.status === 'error') { toast(res.data.message, 'error'); return; }
        toast('Menu item ' + res.data.action + ': ' + res.data.name, 'success');
        document.getElementById('mi-name').value = '';
        document.getElementById('mi-category').value = '';
        adminLoadMenuItems(); adminLoadBomDropdowns();
      });
    });

    document.getElementById('ing-save').addEventListener('click', function () {
      var name = document.getElementById('ing-name').value.trim();
      if (!name) { toast('Name is required', 'error'); return; }
      sb.rpc('upsert_ingredient', {
        p_name: name, p_unit: document.getElementById('ing-unit').value,
        p_reorder_point: parseFloat(document.getElementById('ing-reorder').value) || 0,
        p_lead_time_days: parseInt(document.getElementById('ing-lead').value) || 1,
        p_unit_cost: parseFloat(document.getElementById('ing-cost').value) || 0
      }).then(function (res) {
        if (res.data.status === 'error') { toast(res.data.message, 'error'); return; }
        toast('Ingredient ' + res.data.action + ': ' + res.data.name, 'success');
        document.getElementById('ing-name').value = '';
        adminLoadIngredients(); adminLoadBomDropdowns();
      });
    });

    document.getElementById('bom-load').addEventListener('click', adminLoadBomRecipe);
    document.getElementById('bom-save').addEventListener('click', function () {
      var miId = document.getElementById('bom-menu-item').value;
      var ingId = document.getElementById('bom-ingredient').value;
      var qty = parseFloat(document.getElementById('bom-qty').value);
      if (!miId || !ingId || !qty) { toast('Fill all fields', 'error'); return; }
      sb.rpc('upsert_bom_entry', { p_menu_item_id: miId, p_ingredient_id: ingId, p_qty_per_item: qty }).then(function (res) {
        if (res.data.status === 'error') { toast(res.data.message, 'error'); return; }
        toast('Added ' + res.data.ingredient + ' to ' + res.data.menu_item, 'success');
        document.getElementById('bom-qty').value = '';
        adminLoadBomRecipe();
      });
    });
  }

  function adminLoadMenuItems() {
    sb.from('menu_items').select('id, name, category, active').order('name').then(function (res) {
      var items = res.data || [];
      document.getElementById('mi-count').textContent = '(' + items.length + ')';
      var rows = items.map(function (r) {
        return '<tr><td>' + r.name + '</td><td>' + (r.category || '--') + '</td><td>' + (r.active ? '<span class="badge badge--ok">Active</span>' : '<span class="badge badge--unknown">Inactive</span>') + '</td></tr>';
      }).join('');
      document.getElementById('mi-table').innerHTML = '<table><thead><tr><th>Name</th><th>Category</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';
    });
  }

  function adminLoadIngredients() {
    sb.from('ingredients').select('id, name, unit, reorder_point, lead_time_days, unit_cost').order('name').then(function (res) {
      var ings = res.data || [];
      document.getElementById('ing-count').textContent = '(' + ings.length + ')';
      var rows = ings.map(function (r) {
        return '<tr><td>' + r.name + '</td><td>' + r.unit + '</td><td class="num">' + r.reorder_point + '</td><td class="num">' + r.lead_time_days + 'd</td><td class="num">' + fmtDollars(r.unit_cost) + '</td></tr>';
      }).join('');
      document.getElementById('ing-table').innerHTML = '<table><thead><tr><th>Name</th><th>Unit</th><th>Reorder Pt</th><th>Lead Time</th><th>Cost/Unit</th></tr></thead><tbody>' + rows + '</tbody></table>';
    });
  }

  function adminLoadBomDropdowns() {
    sb.from('menu_items').select('id, name').order('name').then(function (res) {
      document.getElementById('bom-menu-item').innerHTML = '<option value="">-- Select Menu Item --</option>' + (res.data || []).map(function (i) { return '<option value="' + i.id + '">' + i.name + '</option>'; }).join('');
    });
    sb.from('ingredients').select('id, name').order('name').then(function (res) {
      document.getElementById('bom-ingredient').innerHTML = '<option value="">-- Select Ingredient --</option>' + (res.data || []).map(function (i) { return '<option value="' + i.id + '">' + i.name + '</option>'; }).join('');
    });
  }

  function adminLoadBomRecipe() {
    var miId = document.getElementById('bom-menu-item').value;
    if (!miId) { toast('Select a menu item first', 'error'); return; }
    sb.rpc('get_bom_for_item', { p_menu_item_id: miId }).then(function (res) {
      if (res.data.status === 'error') { toast(res.data.message, 'error'); return; }
      var d = res.data;
      if (!d.ingredients.length) {
        document.getElementById('bom-recipe').innerHTML = '<div class="card"><p style="color:var(--text-muted);">No ingredients linked to ' + d.menu_item_name + ' yet.</p></div>';
        return;
      }
      var rows = d.ingredients.map(function (r) {
        return '<tr><td>' + r.ingredient_name + '</td><td class="num">' + r.qty_per_item + '</td><td>' + r.unit + '</td><td class="num">' + fmtDollars(r.unit_cost) + '</td><td class="num">' + fmtDollars(r.cost_per_item) + '</td>' +
          '<td><button class="btn btn-danger btn-sm" data-mi="' + miId + '" data-ing="' + r.ingredient_id + '">Remove</button></td></tr>';
      }).join('');
      document.getElementById('bom-recipe').innerHTML =
        '<div class="table-wrap"><div class="table-title">' + d.menu_item_name + ' &mdash; Total Cost: ' + fmtDollars(d.total_cost) + '</div>' +
        '<table><thead><tr><th>Ingredient</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Line Cost</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';

      document.querySelectorAll('#bom-recipe .btn-danger').forEach(function (btn) {
        btn.addEventListener('click', function () {
          sb.rpc('delete_bom_entry', { p_menu_item_id: btn.dataset.mi, p_ingredient_id: btn.dataset.ing }).then(function (res) {
            if (res.data.status === 'error') { toast(res.data.message, 'error'); return; }
            toast('Removed from recipe', 'success');
            adminLoadBomRecipe();
          });
        });
      });
    });
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  var routes = {
    dashboard: renderDashboard,
    upload: renderUpload,
    inventory: renderInventory,
    forecast: renderForecast,
    analytics: renderAnalytics,
    admin: renderAdmin
  };

  function getHash() {
    return (location.hash || '#/dashboard').replace('#/', '') || 'dashboard';
  }

  function handleRoute() {
    var page = getHash();
    var fn = routes[page];
    if (!fn) { location.hash = '#/dashboard'; return; }
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.classList.toggle('active', a.dataset.page === page);
    });
    fn();
  }

  /* ============================================================
     AUTH
     ============================================================ */
  function checkAuth() {
    sb.auth.getSession().then(function (res) {
      var session = res.data.session;
      if (!session) {
        $shell.classList.add('hidden');
        $onboardingPage.classList.add('hidden');
        $loginPage.classList.remove('hidden');
        renderLogin();
        return;
      }

      // Check onboarding
      sb.rpc('get_onboarding_status').then(function (statusRes) {
        var status = statusRes.data;
        if (status && !status.setup_complete) {
          $shell.classList.add('hidden');
          $loginPage.classList.add('hidden');
          $onboardingPage.classList.remove('hidden');
          renderOnboarding();
          return;
        }
        $loginPage.classList.add('hidden');
        $onboardingPage.classList.add('hidden');
        $shell.classList.remove('hidden');
        handleRoute();
      });
    });
  }

  // Logout
  document.getElementById('btn-logout').addEventListener('click', function () {
    sb.auth.signOut().then(function () {
      toast('Signed out', 'info');
      checkAuth();
    });
  });

  // Hash change
  window.addEventListener('hashchange', function () {
    if (!$shell.classList.contains('hidden')) handleRoute();
  });

  // Boot
  checkAuth();

})();
