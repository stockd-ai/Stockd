import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const logsDir = path.join(repoRoot, 'logs');
const outputPath = path.join(logsDir, 'security_events_export.jsonl');
const hours = Number(process.argv[2] || '24');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const { data, error } = await supabase
  .from('security_events')
  .select('event_type, severity, actor_email, actor_user_id, ip_address, route, status_code, user_agent, details, created_at')
  .gte('created_at', sinceIso)
  .order('created_at', { ascending: true });

if (error) {
  console.error(error.message);
  process.exit(1);
}

fs.mkdirSync(logsDir, { recursive: true });
fs.writeFileSync(outputPath, (data || []).map(row => JSON.stringify(row)).join('\n') + '\n');
console.log(`Exported ${(data || []).length} events to ${outputPath}`);
