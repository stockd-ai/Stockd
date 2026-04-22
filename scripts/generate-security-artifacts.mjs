import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeSecurityEvents, renderSecurityMarkdown } from '../supabase/functions/_shared/security-analyzer.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const logsDir = path.join(repoRoot, 'logs');
const inputPath = path.resolve(process.argv[2] || path.join(logsDir, 'access.sample.jsonl'));
const summaryPath = path.join(logsDir, 'traffic_summary.json');
const markdownPath = path.join(logsDir, 'security_analysis_sample.md');

function readJsonLines(filePath) {
  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

const events = readJsonLines(inputPath);
const summary = analyzeSecurityEvents(events, { analysisWindowHours: 24 });
const markdown = renderSecurityMarkdown(summary);

fs.mkdirSync(logsDir, { recursive: true });
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(markdownPath, markdown + '\n');

console.log(`Generated ${summaryPath}`);
console.log(`Generated ${markdownPath}`);
