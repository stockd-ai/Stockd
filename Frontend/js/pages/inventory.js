/* ============================================================
   Inventory Ops — Receive + Count
   ============================================================ */
const InventoryPage = {
  render() {
    return `
      <div class="page-header">
        <h1>Inventory Operations</h1>
        <p>Receive deliveries and correct stock via physical counts</p>
      </div>

      <div class="tabs">
        <button class="tab-btn active" data-tab="receive-tab">Receive Delivery</button>
        <button class="tab-btn" data-tab="count-tab">Physical Count</button>
      </div>

      <div class="tab-panel active" id="tab-receive-tab">
        <div class="card">
          <div class="card-label">Receive Inventory</div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
            Record a delivery. Adds stock and creates an audit record.
          </p>
          <div class="form-row">
            <div class="form-group">
              <label>Ingredient</label>
              <select id="recv-ingredient"><option value="">Loading...</option></select>
            </div>
            <div class="form-group">
              <label>Quantity</label>
              <input type="number" id="recv-qty" min="0.01" step="0.01" placeholder="e.g. 50">
            </div>
          </div>
          <div class="form-group">
            <label>Note (optional)</label>
            <input type="text" id="recv-note" placeholder="e.g. Weekly delivery from Sysco">
          </div>
          <button class="btn btn-primary" id="recv-btn">Receive</button>
          <div id="recv-result" style="margin-top:12px;"></div>
        </div>
      </div>

      <div class="tab-panel" id="tab-count-tab">
        <div class="card">
          <div class="card-label">Physical Count</div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
            Enter the actual counted quantity. The system calculates and records the adjustment.
          </p>
          <div class="form-row">
            <div class="form-group">
              <label>Ingredient</label>
              <select id="count-ingredient"><option value="">Loading...</option></select>
            </div>
            <div class="form-group">
              <label>Current On Hand</label>
              <input type="text" id="count-current" readonly placeholder="Select ingredient">
            </div>
            <div class="form-group">
              <label>Actual Count</label>
              <input type="number" id="count-qty" min="0" step="0.01" placeholder="Actual qty">
            </div>
          </div>
          <button class="btn btn-primary" id="count-btn">Submit Count</button>
          <div id="count-result" style="margin-top:12px;"></div>
        </div>
      </div>
    `;
  },

  async init() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      });
    });

    // Load ingredients
    const { data: ings } = await supabase.from('ingredients').select('id, name, unit').order('name');

    const options = '<option value="">-- Select --</option>' +
      ings.map(i => `<option value="${i.id}" data-unit="${i.unit}">${i.name} (${i.unit})</option>`).join('');

    document.getElementById('recv-ingredient').innerHTML = options;
    document.getElementById('count-ingredient').innerHTML = options;

    // Count: show current on-hand when ingredient changes
    document.getElementById('count-ingredient').addEventListener('change', async (e) => {
      const id = e.target.value;
      if (!id) { document.getElementById('count-current').value = ''; return; }
      const { data } = await supabase.from('inventory_on_hand').select('qty_on_hand').eq('ingredient_id', id).single();
      document.getElementById('count-current').value = data ? fmt(data.qty_on_hand) : '0 (no record)';
    });

    // Receive
    document.getElementById('recv-btn').addEventListener('click', async () => {
      const id = document.getElementById('recv-ingredient').value;
      const qty = parseFloat(document.getElementById('recv-qty').value);
      const note = document.getElementById('recv-note').value || null;
      if (!id || !qty) { toast('Select ingredient and enter qty', 'error'); return; }

      const { data, error } = await supabase.rpc('receive_inventory', {
        p_ingredient_id: id, p_qty: qty, p_note: note
      });
      if (error) { toast(error.message, 'error'); return; }
      if (data.status === 'error') { toast(data.message, 'error'); return; }

      document.getElementById('recv-result').innerHTML = `
        <span class="badge badge--ok">Received ${qty}. New on-hand: ${fmt(data.new_qty_on_hand)}</span>
      `;
      toast(`Received ${qty} units`, 'success');
      document.getElementById('recv-qty').value = '';
      document.getElementById('recv-note').value = '';
    });

    // Count
    document.getElementById('count-btn').addEventListener('click', async () => {
      const id = document.getElementById('count-ingredient').value;
      const qty = parseFloat(document.getElementById('count-qty').value);
      if (!id || isNaN(qty)) { toast('Select ingredient and enter actual qty', 'error'); return; }

      const { data, error } = await supabase.rpc('count_inventory', {
        p_ingredient_id: id, p_actual_qty: qty
      });
      if (error) { toast(error.message, 'error'); return; }
      if (data.status === 'error') { toast(data.message, 'error'); return; }

      const delta = data.delta >= 0 ? '+' + data.delta : data.delta;
      document.getElementById('count-result').innerHTML = `
        <span class="badge badge--ok">Adjusted: ${data.previous_qty} &rarr; ${data.new_qty_on_hand} (${delta})</span>
      `;
      toast(`Count recorded (delta: ${delta})`, 'success');
      document.getElementById('count-current').value = fmt(data.new_qty_on_hand);
      document.getElementById('count-qty').value = '';
    });
  }
};
