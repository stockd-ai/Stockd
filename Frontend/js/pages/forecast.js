/* ============================================================
   Forecast Page — 7-day ingredient needs
   ============================================================ */
const ForecastPage = {
  render() {
    return `
      <div class="page-header">
        <h1>7-Day Forecast</h1>
        <p>Predicted ingredient needs based on day-of-week sales averages</p>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div class="form-row" style="align-items:end;">
          <div class="form-group" style="margin-bottom:0;">
            <label>Reference Date</label>
            <input type="date" id="fc-date" value="2016-01-01">
          </div>
          <div style="margin-bottom:0;">
            <button class="btn btn-primary" id="fc-generate">Generate Forecast</button>
          </div>
        </div>
      </div>

      <div class="card-grid" id="fc-cards"></div>

      <div class="table-wrap">
        <div class="table-title">Ingredient Forecast</div>
        <div id="fc-table"><div class="loading-state"><span class="spinner"></span> Loading...</div></div>
      </div>
    `;
  },

  async init() {
    await loadForecast();

    document.getElementById('fc-generate').addEventListener('click', async () => {
      const btn = document.getElementById('fc-generate');
      const refDate = document.getElementById('fc-date').value;
      if (!refDate) { toast('Pick a date', 'error'); return; }

      btn.disabled = true; btn.textContent = 'Generating...';
      const { data, error } = await supabase.rpc('generate_forecast', {
        p_days_ahead: 7, p_reference_date: refDate
      });
      if (error) { toast(error.message, 'error'); }
      else { toast(`Generated ${data.item_forecasts} item + ${data.ingredient_forecasts} ingredient forecasts`, 'success'); }

      btn.disabled = false; btn.textContent = 'Generate Forecast';
      await loadForecast();
    });
  }
};

async function loadForecast() {
  const refDate = document.getElementById('fc-date').value || '2016-01-01';
  const { data: fc, error } = await supabase.rpc('get_forecast', { p_reference_date: refDate });

  if (error) { toast(error.message, 'error'); return; }

  const shortfalls = fc.filter(r => r.shortfall > 0);
  const totalNeeded = fc.reduce((s, r) => s + r.qty_needed, 0);
  const dates = [...new Set(fc.map(r => r.forecast_date))];

  document.getElementById('fc-cards').innerHTML = `
    <div class="card card--info">
      <div class="card-label">Forecast Period</div>
      <div class="card-value">${dates.length} days</div>
      <div class="card-sub">${dates[0] || 'N/A'} to ${dates[dates.length-1] || 'N/A'}</div>
    </div>
    <div class="card card--danger">
      <div class="card-label">Shortfalls</div>
      <div class="card-value">${shortfalls.length}</div>
      <div class="card-sub">of ${fc.length} ingredient-day combos</div>
    </div>
    <div class="card card--warning">
      <div class="card-label">Total Ingredient Need</div>
      <div class="card-value">${fmt(totalNeeded, 0)} oz</div>
      <div class="card-sub">across all ingredients</div>
    </div>
  `;

  if (!fc.length) {
    document.getElementById('fc-table').innerHTML = '<p style="padding:20px;color:var(--text-muted);">No forecast data. Click Generate Forecast.</p>';
    return;
  }

  document.getElementById('fc-table').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Ingredient</th>
          <th>Needed</th>
          <th>On Hand</th>
          <th>Shortfall</th>
          <th>Unit</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${fc.map(r => `
          <tr>
            <td>${r.forecast_date}</td>
            <td><strong>${r.name}</strong></td>
            <td class="num">${fmt(r.qty_needed)}</td>
            <td class="num">${fmt(r.qty_on_hand)}</td>
            <td class="num">${fmt(r.shortfall)}</td>
            <td>${r.unit}</td>
            <td>
              ${r.shortfall > 0
                ? '<span class="badge badge--danger">Short</span>'
                : '<span class="badge badge--ok">OK</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
