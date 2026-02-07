/* ============================================================
   Onboarding Page — First-time setup
   ============================================================ */
const OnboardingPage = {
  render() {
    const el = document.getElementById('onboarding-page');
    el.innerHTML = `
      <div class="onboarding-card">
        <h1>Welcome to Tony's Pizza</h1>
        <p>Upload your sales history CSV to get started. This will set up your menu items, consumption baseline, and inventory.</p>

        <div class="step-indicator">
          <div class="step-dot active" id="step-1"></div>
          <div class="step-dot" id="step-2"></div>
          <div class="step-dot" id="step-3"></div>
        </div>

        <div id="onboarding-step1">
          <div class="file-drop" id="onboarding-drop">
            <div class="file-drop-text">Drop your ItemSelectionDetails CSV here</div>
            <div class="file-drop-hint">or click to browse</div>
            <input type="file" id="onboarding-file" accept=".csv" style="display:none">
          </div>
          <div id="onboarding-preview" style="margin-top:16px;"></div>
          <button class="btn btn-primary hidden" id="onboarding-confirm" style="margin-top:16px;width:100%">
            Start Processing
          </button>
        </div>

        <div id="onboarding-step2" class="hidden">
          <div class="progress-bar"><div class="progress-fill" id="onboarding-progress"></div></div>
          <div id="onboarding-status">Preparing data...</div>
        </div>

        <div id="onboarding-step3" class="hidden">
          <div style="font-size:48px;margin-bottom:16px;">&#9989;</div>
          <h2>Setup Complete!</h2>
          <div id="onboarding-result" style="margin:16px 0;color:var(--text-secondary);font-size:14px;"></div>
          <button class="btn btn-primary" id="onboarding-go" style="width:100%">Go to Dashboard</button>
        </div>
      </div>
    `;
  },

  init() {
    const dropZone = document.getElementById('onboarding-drop');
    const fileInput = document.getElementById('onboarding-file');
    let parsedRows = [];

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    function handleFile(file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete(result) {
          const rows = result.data.filter(r => r['Void?'] !== 'True' && r['Menu Item']);
          // Aggregate by date+item
          const agg = {};
          rows.forEach(r => {
            const dateParts = (r['Order Date'] || '').split(' ')[0].split('/');
            if (dateParts.length < 3) return;
            const bdate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
            const key = `${bdate}|${r['Menu Item']}`;
            if (!agg[key]) {
              agg[key] = { business_date: bdate, menu_item_name: r['Menu Item'], category: r['Sales Category'] || '', qty: 0, net_sales: 0, source: 'toast' };
            }
            agg[key].qty += parseFloat(r['Qty'] || 1);
            agg[key].net_sales += parseFloat(r['Net Price'] || 0);
          });

          parsedRows = Object.values(agg);
          const dates = [...new Set(parsedRows.map(r => r.business_date))].sort();
          document.getElementById('onboarding-preview').innerHTML = `
            <div class="card" style="text-align:left">
              <div class="card-label">CSV Preview</div>
              <div style="font-size:14px;color:var(--text-primary);">
                <strong>${rows.length}</strong> line items &rarr; <strong>${parsedRows.length}</strong> aggregated rows<br>
                <strong>${dates.length}</strong> dates: ${dates[0]} to ${dates[dates.length - 1]}<br>
                <strong>${new Set(parsedRows.map(r => r.menu_item_name)).size}</strong> unique menu items
              </div>
            </div>
          `;
          document.getElementById('onboarding-confirm').classList.remove('hidden');
        }
      });
    }

    document.getElementById('onboarding-confirm').addEventListener('click', async () => {
      // Step 2: process
      document.getElementById('onboarding-step1').classList.add('hidden');
      document.getElementById('onboarding-step2').classList.remove('hidden');
      document.getElementById('step-1').classList.replace('active', 'done');
      document.getElementById('step-2').classList.add('active');

      const progress = document.getElementById('onboarding-progress');
      const status = document.getElementById('onboarding-status');
      const BATCH = 500;
      const totalBatches = Math.ceil(parsedRows.length / BATCH);

      try {
        // Ingest in batches
        for (let i = 0; i < totalBatches; i++) {
          const batch = parsedRows.slice(i * BATCH, (i + 1) * BATCH);
          status.textContent = `Ingesting batch ${i + 1} of ${totalBatches}...`;
          progress.style.width = ((i + 1) / (totalBatches + 2) * 100) + '%';
          const { error } = await supabase.rpc('ingest_daily_sales', { p_rows: batch });
          if (error) throw new Error(error.message);
        }

        // Complete onboarding
        status.textContent = 'Recording onboarding...';
        progress.style.width = ((totalBatches + 1) / (totalBatches + 2) * 100) + '%';
        await supabase.rpc('complete_onboarding_ingest');

        // Bulk close
        status.textContent = 'Processing consumption (this may take a moment)...';
        progress.style.width = '95%';
        const { data: closeResult } = await supabase.rpc('run_bulk_close');

        // Step 3: done
        progress.style.width = '100%';
        document.getElementById('onboarding-step2').classList.add('hidden');
        document.getElementById('onboarding-step3').classList.remove('hidden');
        document.getElementById('step-2').classList.replace('active', 'done');
        document.getElementById('step-3').classList.add('done');

        document.getElementById('onboarding-result').textContent =
          `${closeResult.dates_processed} dates processed, ${closeResult.total_consume_txns} consumption records created.`;

      } catch (err) {
        status.textContent = 'Error: ' + err.message;
        status.style.color = 'var(--danger)';
      }
    });

    document.getElementById('onboarding-go')?.addEventListener('click', () => {
      checkAuth();
    });
  }
};
