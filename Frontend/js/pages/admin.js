/* ============================================================
   Admin Page — Menu Items, Ingredients, BOM CRUD
   ============================================================ */
const AdminPage = {
  render() {
    return `
      <div class="page-header">
        <h1>Admin</h1>
        <p>Manage menu items, ingredients, and recipes</p>
      </div>

      <div class="tabs">
        <button class="tab-btn active" data-tab="admin-menu">Menu Items</button>
        <button class="tab-btn" data-tab="admin-ingredients">Ingredients</button>
        <button class="tab-btn" data-tab="admin-bom">BOM / Recipes</button>
      </div>

      <!-- Menu Items Tab -->
      <div class="tab-panel active" id="tab-admin-menu">
        <div class="card" style="margin-bottom:16px;">
          <div class="card-label">Add / Edit Menu Item</div>
          <div class="form-row">
            <div class="form-group">
              <label>Name</label>
              <input type="text" id="mi-name" placeholder="e.g. The BBQ Chicken Pizza (L)">
            </div>
            <div class="form-group">
              <label>Category</label>
              <input type="text" id="mi-category" placeholder="e.g. Chicken">
            </div>
            <div style="display:flex;align-items:end;padding-bottom:16px;">
              <button class="btn btn-primary btn-sm" id="mi-save">Add Item</button>
            </div>
          </div>
          <div id="mi-result" style="margin-top:8px;"></div>
        </div>
        <div class="table-wrap">
          <div class="table-title">Menu Items <span id="mi-count" style="font-weight:400;color:var(--text-muted);font-size:13px;"></span></div>
          <div id="mi-table"><div class="loading-state"><span class="spinner"></span></div></div>
        </div>
      </div>

      <!-- Ingredients Tab -->
      <div class="tab-panel" id="tab-admin-ingredients">
        <div class="card" style="margin-bottom:16px;">
          <div class="card-label">Add / Edit Ingredient</div>
          <div class="form-row">
            <div class="form-group">
              <label>Name</label>
              <input type="text" id="ing-name" placeholder="e.g. Goat Cheese">
            </div>
            <div class="form-group">
              <label>Unit</label>
              <select id="ing-unit">
                <option value="oz">oz</option>
                <option value="g">g</option>
                <option value="lb">lb</option>
                <option value="each">each</option>
              </select>
            </div>
            <div class="form-group">
              <label>Reorder Pt</label>
              <input type="number" id="ing-reorder" value="20" min="0">
            </div>
            <div class="form-group">
              <label>Lead Time (days)</label>
              <input type="number" id="ing-lead" value="2" min="0">
            </div>
            <div class="form-group">
              <label>Cost/Unit ($)</label>
              <input type="number" id="ing-cost" value="0.10" min="0" step="0.01">
            </div>
          </div>
          <button class="btn btn-primary btn-sm" id="ing-save">Add Ingredient</button>
          <div id="ing-result" style="margin-top:8px;"></div>
        </div>
        <div class="table-wrap">
          <div class="table-title">Ingredients <span id="ing-count" style="font-weight:400;color:var(--text-muted);font-size:13px;"></span></div>
          <div id="ing-table"><div class="loading-state"><span class="spinner"></span></div></div>
        </div>
      </div>

      <!-- BOM Tab -->
      <div class="tab-panel" id="tab-admin-bom">
        <div class="card" style="margin-bottom:16px;">
          <div class="card-label">Recipe Builder</div>
          <div class="form-row">
            <div class="form-group">
              <label>Menu Item</label>
              <select id="bom-menu-item"><option value="">Loading...</option></select>
            </div>
            <div style="display:flex;align-items:end;padding-bottom:16px;">
              <button class="btn btn-secondary btn-sm" id="bom-load">View Recipe</button>
            </div>
          </div>
        </div>
        <div id="bom-recipe" style="margin-bottom:16px;"></div>
        <div class="card" id="bom-add-section" class="hidden" style="margin-bottom:16px;">
          <div class="card-label">Add Ingredient to Recipe</div>
          <div class="form-row">
            <div class="form-group">
              <label>Ingredient</label>
              <select id="bom-ingredient"><option value="">Loading...</option></select>
            </div>
            <div class="form-group">
              <label>Qty Per Item</label>
              <input type="number" id="bom-qty" min="0.01" step="0.01" placeholder="oz per pizza">
            </div>
            <div style="display:flex;align-items:end;padding-bottom:16px;">
              <button class="btn btn-primary btn-sm" id="bom-save">Add to Recipe</button>
            </div>
          </div>
          <div id="bom-result" style="margin-top:8px;"></div>
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

    // Load menu items
    await loadMenuItems();
    await loadIngredients();
    await loadBomDropdowns();

    // Add menu item
    document.getElementById('mi-save').addEventListener('click', async () => {
      const name = document.getElementById('mi-name').value.trim();
      const category = document.getElementById('mi-category').value.trim();
      if (!name) { toast('Name is required', 'error'); return; }
      const { data } = await supabase.rpc('upsert_menu_item', { p_name: name, p_category: category || null });
      if (data.status === 'error') { toast(data.message, 'error'); return; }
      toast(`Menu item ${data.action}: ${data.name}`, 'success');
      document.getElementById('mi-name').value = '';
      document.getElementById('mi-category').value = '';
      await loadMenuItems();
      await loadBomDropdowns();
    });

    // Add ingredient
    document.getElementById('ing-save').addEventListener('click', async () => {
      const name = document.getElementById('ing-name').value.trim();
      if (!name) { toast('Name is required', 'error'); return; }
      const { data } = await supabase.rpc('upsert_ingredient', {
        p_name: name,
        p_unit: document.getElementById('ing-unit').value,
        p_reorder_point: parseFloat(document.getElementById('ing-reorder').value) || 0,
        p_lead_time_days: parseInt(document.getElementById('ing-lead').value) || 1,
        p_unit_cost: parseFloat(document.getElementById('ing-cost').value) || 0
      });
      if (data.status === 'error') { toast(data.message, 'error'); return; }
      toast(`Ingredient ${data.action}: ${data.name}`, 'success');
      document.getElementById('ing-name').value = '';
      await loadIngredients();
      await loadBomDropdowns();
    });

    // BOM - Load recipe
    document.getElementById('bom-load').addEventListener('click', loadBomRecipe);

    // BOM - Add entry
    document.getElementById('bom-save').addEventListener('click', async () => {
      const miId = document.getElementById('bom-menu-item').value;
      const ingId = document.getElementById('bom-ingredient').value;
      const qty = parseFloat(document.getElementById('bom-qty').value);
      if (!miId || !ingId || !qty) { toast('Fill all fields', 'error'); return; }

      const { data } = await supabase.rpc('upsert_bom_entry', {
        p_menu_item_id: miId, p_ingredient_id: ingId, p_qty_per_item: qty
      });
      if (data.status === 'error') { toast(data.message, 'error'); return; }
      toast(`Added ${data.ingredient} to ${data.menu_item} (${qty})`, 'success');
      document.getElementById('bom-qty').value = '';
      await loadBomRecipe();
    });
  }
};

async function loadMenuItems() {
  const { data: items } = await supabase.from('menu_items').select('id, name, category, active').order('name');
  document.getElementById('mi-count').textContent = `(${items.length})`;
  document.getElementById('mi-table').innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Category</th><th>Status</th></tr></thead>
      <tbody>
        ${items.map(r => `
          <tr>
            <td>${r.name}</td>
            <td>${r.category || '--'}</td>
            <td>${r.active ? '<span class="badge badge--ok">Active</span>' : '<span class="badge badge--unknown">Inactive</span>'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadIngredients() {
  const { data: ings } = await supabase.from('ingredients').select('id, name, unit, reorder_point, lead_time_days, unit_cost').order('name');
  document.getElementById('ing-count').textContent = `(${ings.length})`;
  document.getElementById('ing-table').innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Unit</th><th>Reorder Pt</th><th>Lead Time</th><th>Cost/Unit</th></tr></thead>
      <tbody>
        ${ings.map(r => `
          <tr>
            <td>${r.name}</td>
            <td>${r.unit}</td>
            <td class="num">${r.reorder_point}</td>
            <td class="num">${r.lead_time_days}d</td>
            <td class="num">${fmtDollars(r.unit_cost)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadBomDropdowns() {
  const { data: items } = await supabase.from('menu_items').select('id, name').order('name');
  const { data: ings } = await supabase.from('ingredients').select('id, name').order('name');

  document.getElementById('bom-menu-item').innerHTML =
    '<option value="">-- Select Menu Item --</option>' +
    items.map(i => `<option value="${i.id}">${i.name}</option>`).join('');

  document.getElementById('bom-ingredient').innerHTML =
    '<option value="">-- Select Ingredient --</option>' +
    ings.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
}

async function loadBomRecipe() {
  const miId = document.getElementById('bom-menu-item').value;
  if (!miId) { toast('Select a menu item first', 'error'); return; }

  const { data } = await supabase.rpc('get_bom_for_item', { p_menu_item_id: miId });
  if (data.status === 'error') { toast(data.message, 'error'); return; }

  if (!data.ingredients.length) {
    document.getElementById('bom-recipe').innerHTML = `
      <div class="card"><p style="color:var(--text-muted);">No ingredients linked to ${data.menu_item_name} yet.</p></div>
    `;
    return;
  }

  document.getElementById('bom-recipe').innerHTML = `
    <div class="table-wrap">
      <div class="table-title">${data.menu_item_name} &mdash; Total Cost: ${fmtDollars(data.total_cost)}</div>
      <table>
        <thead><tr><th>Ingredient</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Line Cost</th><th></th></tr></thead>
        <tbody>
          ${data.ingredients.map(r => `
            <tr>
              <td>${r.ingredient_name}</td>
              <td class="num">${r.qty_per_item}</td>
              <td>${r.unit}</td>
              <td class="num">${fmtDollars(r.unit_cost)}</td>
              <td class="num">${fmtDollars(r.cost_per_item)}</td>
              <td><button class="btn btn-danger btn-sm" onclick="deleteBomEntry('${miId}','${r.ingredient_id}')">Remove</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function deleteBomEntry(miId, ingId) {
  const { data } = await supabase.rpc('delete_bom_entry', {
    p_menu_item_id: miId, p_ingredient_id: ingId
  });
  if (data.status === 'error') { toast(data.message, 'error'); return; }
  toast('Ingredient removed from recipe', 'success');
  await loadBomRecipe();
}
