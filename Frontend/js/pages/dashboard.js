/* ============================================================
   Dashboard — Inventory Snapshot
   ============================================================ */
const DashboardPage = {
  render() {
    return `
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Real-time inventory status and alerts</p>
      </div>
      <div class="card-grid" id="dash-cards">
        <div class="card"><div class="loading-state"><span class="spinner"></span></div></div>
      </div>
      <div class="table-wrap">
        <div class="table-title">Inventory Snapshot</div>
        <div id="dash-table"><div class="loading-state"><span class="spinner"></span> Loading...</div></div>
      </div>
    `;
  },

  async init() {
    const { data: snap, error } = await supabase.rpc('get_inventory_snapshot');

    if (error) { toast(error.message, 'error'); return; }

    const critical = snap.filter(r => r.status === 'critical').length;
    const reorder = snap.filter(r => r.status === 'reorder_soon').length;
    const ok = snap.filter(r => r.status === 'ok').length;
    const totalValue = snap.reduce((s, r) => s + (r.qty_on_hand * (r.unit_cost || 0)), 0);

    document.getElementById('dash-cards').innerHTML = `
      <div class="card card--danger">
        <div class="card-label">Critical</div>
        <div class="card-value">${critical}</div>
        <div class="card-sub">ingredients need immediate restock</div>
      </div>
      <div class="card card--warning">
        <div class="card-label">Reorder Soon</div>
        <div class="card-value">${reorder}</div>
        <div class="card-sub">ingredients running low</div>
      </div>
      <div class="card card--success">
        <div class="card-label">OK</div>
        <div class="card-value">${ok}</div>
        <div class="card-sub">ingredients at healthy levels</div>
      </div>
      <div class="card card--info">
        <div class="card-label">Inventory Value</div>
        <div class="card-value">${fmtDollars(totalValue)}</div>
        <div class="card-sub">${snap.length} ingredients tracked</div>
      </div>
    `;

    if (!snap.length) {
      document.getElementById('dash-table').innerHTML = '<p style="padding:20px;color:var(--text-muted)">No inventory data yet.</p>';
      return;
    }

    document.getElementById('dash-table').innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Ingredient</th>
            <th>On Hand</th>
            <th>Unit</th>
            <th>Avg/Day</th>
            <th>Days Supply</th>
            <th>Reorder Pt</th>
            <th>Cost/Unit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${snap.map(r => `
            <tr>
              <td><strong>${r.name}</strong></td>
              <td class="num">${fmt(r.qty_on_hand)}</td>
              <td>${r.unit}</td>
              <td class="num">${fmt(r.avg_daily_usage)}</td>
              <td class="num">${r.days_of_supply !== null ? fmt(r.days_of_supply) + 'd' : '--'}</td>
              <td class="num">${fmt(r.reorder_point, 0)}</td>
              <td class="num">${fmtDollars(r.unit_cost)}</td>
              <td><span class="badge badge--${r.status}">${r.status.replace('_', ' ')}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
};
