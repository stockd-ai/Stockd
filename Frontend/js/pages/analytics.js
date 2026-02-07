/* ============================================================
   Analytics Page — Revenue & order analytics
   ============================================================ */
const AnalyticsPage = {
  render() {
    return `
      <div class="page-header">
        <h1>Analytics</h1>
        <p>Revenue, orders, and service performance</p>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div class="form-row" style="align-items:end;">
          <div class="form-group" style="margin-bottom:0;">
            <label>Business Date</label>
            <input type="date" id="analytics-date" value="2015-12-31">
          </div>
          <div style="margin-bottom:0;">
            <button class="btn btn-primary" id="analytics-load">Load Analytics</button>
          </div>
        </div>
      </div>

      <div class="card-grid" id="analytics-cards">
        <div class="card"><div class="loading-state"><span class="spinner"></span></div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px;" id="analytics-breakdowns"></div>
    `;
  },

  async init() {
    await loadAnalytics();

    document.getElementById('analytics-load').addEventListener('click', loadAnalytics);
  }
};

async function loadAnalytics() {
  const dateVal = document.getElementById('analytics-date').value || null;
  const params = dateVal ? { p_business_date: dateVal } : {};

  const { data, error } = await supabase.rpc('get_daily_analytics', params);

  if (error) { toast(error.message, 'error'); return; }
  if (data.status === 'no_data') {
    document.getElementById('analytics-cards').innerHTML = `
      <div class="card"><div class="card-label">No Data</div><div class="card-value">--</div><div class="card-sub">No orders for this date. Try uploading an OrderDetails CSV first.</div></div>
    `;
    document.getElementById('analytics-breakdowns').innerHTML = '';
    return;
  }

  document.getElementById('analytics-cards').innerHTML = `
    <div class="card card--info">
      <div class="card-label">Total Revenue</div>
      <div class="card-value">${fmtDollars(data.total_revenue)}</div>
      <div class="card-sub">${data.business_date}</div>
    </div>
    <div class="card card--success">
      <div class="card-label">Orders</div>
      <div class="card-value">${data.total_orders}</div>
      <div class="card-sub">Avg ${fmtDollars(data.avg_order_value)}/order</div>
    </div>
    <div class="card card--warning">
      <div class="card-label">Guests</div>
      <div class="card-value">${data.total_guests}</div>
      <div class="card-sub">Avg ${fmt(data.avg_guests_per_order)}/order</div>
    </div>
    <div class="card card--info">
      <div class="card-label">Tips</div>
      <div class="card-value">${fmtDollars(data.total_tips)}</div>
      <div class="card-sub">Discounts: ${fmtDollars(data.total_discounts)}</div>
    </div>
  `;

  let breakdowns = '';

  // Service period
  if (data.by_service_period && data.by_service_period.length) {
    breakdowns += `
      <div class="table-wrap">
        <div class="table-title">By Service Period</div>
        <table>
          <thead><tr><th>Period</th><th>Orders</th><th>Revenue</th></tr></thead>
          <tbody>
            ${data.by_service_period.map(r => `
              <tr><td>${r.period}</td><td class="num">${r.orders}</td><td class="num">${fmtDollars(r.revenue)}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Dining option
  if (data.by_dining_option && data.by_dining_option.length) {
    breakdowns += `
      <div class="table-wrap">
        <div class="table-title">By Dining Option</div>
        <table>
          <thead><tr><th>Option</th><th>Orders</th><th>Revenue</th></tr></thead>
          <tbody>
            ${data.by_dining_option.map(r => `
              <tr><td>${r.option}</td><td class="num">${r.orders}</td><td class="num">${fmtDollars(r.revenue)}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Servers
  if (data.by_server && data.by_server.length) {
    breakdowns += `
      <div class="table-wrap" style="grid-column:1/-1;">
        <div class="table-title">Server Performance</div>
        <table>
          <thead><tr><th>Server</th><th>Orders</th><th>Revenue</th><th>Tips</th></tr></thead>
          <tbody>
            ${data.by_server.map(r => `
              <tr>
                <td><strong>${r.server}</strong></td>
                <td class="num">${r.orders}</td>
                <td class="num">${fmtDollars(r.revenue)}</td>
                <td class="num">${fmtDollars(r.tips)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Hourly
  if (data.by_hour && data.by_hour.length) {
    breakdowns += `
      <div class="table-wrap" style="grid-column:1/-1;">
        <div class="table-title">Orders by Hour</div>
        <table>
          <thead><tr><th>Hour</th><th>Orders</th><th>Revenue</th></tr></thead>
          <tbody>
            ${data.by_hour.map(r => `
              <tr>
                <td>${String(Math.floor(r.hour)).padStart(2,'0')}:00</td>
                <td class="num">${r.orders}</td>
                <td class="num">${fmtDollars(r.revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  document.getElementById('analytics-breakdowns').innerHTML = breakdowns;
}
