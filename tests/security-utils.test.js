const {
  escapeHtml,
  formatRichTextSafe,
  sanitizeCsvCell,
  sanitizeEmail,
  sanitizeUserNote
} = require('../Frontend/js/security-utils.js');
const { normalizeToastRecord } = require('../Frontend/js/csv-parser.js');
const path = require('path');
const { execFileSync } = require('child_process');

describe('security utils', () => {
  test('escapeHtml neutralizes HTML injection characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  test('sanitizeCsvCell trims, removes control characters, and caps length', () => {
    const raw = '  Spicy\u0000 <Pepperoni> Pizza   ';
    expect(sanitizeCsvCell(raw, 16)).toBe('Spicy <Pepperoni');
  });

  test('sanitizeEmail normalizes casing and whitespace', () => {
    expect(sanitizeEmail('  OWNER@Stockd.io  ')).toBe('owner@stockd.io');
  });

  test('sanitizeUserNote preserves line breaks while removing control chars', () => {
    expect(sanitizeUserNote(' First line \u0000 \n\n Second\tline ')).toBe('First line\n\nSecond line');
  });

  test('formatRichTextSafe escapes HTML while preserving simple formatting', () => {
    const output = formatRichTextSafe('Hello <b>team</b>\n- **Check logs**');
    expect(output).toContain('<p>Hello &lt;b&gt;team&lt;/b&gt;</p>');
    expect(output).toContain('<ul><li><strong>Check logs</strong></li></ul>');
    expect(output).not.toContain('<script>');
  });
});

describe('csv normalization', () => {
  test('normalizeToastRecord sanitizes menu item fields before ingest', () => {
    const row = normalizeToastRecord({
      'Order Date': '04/22/2026 10:15 AM',
      'Menu Item': '  <Pepperoni>\u0000 Pizza  ',
      'Sales Category': ' Specials\t ',
      'Qty': '3',
      'Net Price': '42.50',
      'Void?': ' false '
    });

    expect(row).toEqual({
      business_date: '2026-04-22',
      menu_item_name: '<Pepperoni> Pizza',
      category: 'Specials',
      qty: 3,
      net_sales: 42.5,
      is_void: false
    });
  });
});

describe('security analyzer', () => {
  test('does not flag successful status bursts as suspicious activity', () => {
    const repoRoot = path.resolve(__dirname, '..');
    const output = execFileSync(process.execPath, [
      '--input-type=module',
      '-e',
      `
        import { analyzeSecurityEvents } from './supabase/functions/_shared/security-analyzer.mjs';
        const summary = analyzeSecurityEvents([
          { event_type: 'auth.login_succeeded', status_code: 200, ip_address: '198.51.100.10', created_at: '2026-04-22T12:00:00Z' },
          { event_type: 'auth.login_succeeded', status_code: 200, ip_address: '198.51.100.10', created_at: '2026-04-22T12:01:00Z' },
          { event_type: 'auth.login_succeeded', status_code: 200, ip_address: '198.51.100.10', created_at: '2026-04-22T12:02:00Z' },
          { event_type: 'auth.login_succeeded', status_code: 200, ip_address: '198.51.100.10', created_at: '2026-04-22T12:03:00Z' },
          { event_type: 'auth.login_succeeded', status_code: 200, ip_address: '198.51.100.10', created_at: '2026-04-22T12:04:00Z' },
          { event_type: 'auth.login_succeeded', status_code: 200, ip_address: '198.51.100.10', created_at: '2026-04-22T12:05:00Z' }
        ], { analysisWindowHours: 24 });
        console.log(JSON.stringify(summary.flaggedActivities));
      `
    ], { cwd: repoRoot, encoding: 'utf8' });

    const flaggedActivities = JSON.parse(output.trim());
    expect(flaggedActivities.some((item) => item.type === 'status_spike')).toBe(false);
  });
});
