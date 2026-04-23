import path from "node:path";
import {
  DEFAULT_TARGET_MODE,
  DEFAULT_TIME_ZONE,
  buildAnalysis,
  buildAnalysisMarkdown,
  createServiceClient,
  ensureDir,
  parseArgs,
  resolveRepoPath,
  writeJson,
  writeMarkdown,
} from "./database-cleanup-lib.mjs";

function printUsage() {
  console.log(`Usage:
  node scripts/database-cleanup-analyze.mjs \\
    --timezone ${DEFAULT_TIME_ZONE} \\
    --target-mode ${DEFAULT_TARGET_MODE} \\
    --output-dir logs/database-cleanup/latest
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const timeZone = typeof args.timezone === "string" ? args.timezone : DEFAULT_TIME_ZONE;
  const targetMode = typeof args["target-mode"] === "string"
    ? args["target-mode"]
    : DEFAULT_TARGET_MODE;
  const outputDir = typeof args["output-dir"] === "string"
    ? path.resolve(args["output-dir"])
    : resolveRepoPath("logs", "database-cleanup", "latest");
  const targetDate = targetMode === "explicit-date" && typeof args["target-date"] === "string"
    ? args["target-date"]
    : null;

  const supabase = createServiceClient();
  const analysis = await buildAnalysis({
    supabase,
    timeZone,
    targetMode,
    targetDate,
  });

  await ensureDir(outputDir);
  const analysisPath = path.join(outputDir, "analysis.json");
  const markdownPath = path.join(outputDir, "analysis.md");

  await writeJson(analysisPath, analysis);
  await writeMarkdown(markdownPath, buildAnalysisMarkdown(analysis));

  console.log(`Analysis written to ${analysisPath}`);
  console.log(`Markdown report written to ${markdownPath}`);
  console.log(JSON.stringify({
    project_ref: analysis.project_ref,
    corrected_max_order_date: analysis.proposed_repair.corrected_max_order_date,
    shift_target_date: analysis.proposed_repair.shift_target_date,
    shift_delta_days: analysis.proposed_repair.shift_delta_days,
    kiosk_orders: analysis.kiosk_orders.total_orders,
    kiosk_anomalies: analysis.kiosk_orders.eligible_anomalies.length,
    ambiguous_rows: analysis.kiosk_orders.ambiguous_rows.length,
  }, null, 2));
}

main().catch((error) => {
  console.error("database-cleanup-analyze failed:");
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
