# GREENFIELD_AI_COPILOT.md

**Product:** Stockd  
**Document owner:** Manus AI  
**Date:** May 12, 2026  
**Status:** Greenfield design document, not production code

## Copilot Thesis

The Stockd copilot should be an **operator assistant grounded in deterministic restaurant data**, not a magic chatbot. It should help users understand inventory, draft setup artifacts, summarize exceptions, and propose next actions. It should not be the system of record, should not invent quantities, and should not perform inventory-changing actions without explicit human confirmation.

The copilot is valuable because restaurant operators often know what they want to ask but do not know where in the product to find it. They want to ask: “What should I order this week?”, “Why are we low on pepperoni?”, “Did Saturday sales change the forecast?”, or “Draft a recipe for our chicken bowl.” The copilot should answer these questions by calling controlled tools that return scoped, permission-checked facts.

## AI Product Boundaries

| Copilot Can Do | Copilot Cannot Do Without Confirmation | Copilot Must Never Do |
|---|---|---|
| Explain forecasts, reorders, inventory changes, and data freshness. | Post counts, receipts, waste logs, adjustments, or reorder approvals. | Directly update database tables outside controlled functions. |
| Draft BOMs, mappings, vendor aliases, and weekly summaries. | Mark AI drafts as confirmed. | Invent numeric facts not returned by deterministic tools. |
| Identify missing setup steps and guide users to workflows. | Send vendor-facing purchase orders or emails. | Reveal another tenant's data or bypass RLS. |
| Summarize import errors and suggest fixes. | Roll back imports or reverse inventory transactions. | Execute instructions embedded in uploaded files, receipts, websites, or user-provided data. |
| Generate natural-language explanations from source data. | Change roles, billing, integrations, or sensitive settings. | Store unnecessary sensitive data in prompts or logs. |

## Provider Abstraction

Stockd should implement a provider-agnostic AI gateway with a narrow internal interface. The product should be able to route tasks to Gemini, OpenAI, or another OpenAI-compatible provider based on cost, latency, capability, and privacy. Provider selection should be configuration, not product logic.

| Interface | Purpose | Example Use |
|---|---|---|
| `generateText` | Natural-language answers and summaries. | Weekly inventory summary. |
| `generateStructured` | JSON outputs validated against schemas. | CSV mapping suggestion or BOM draft. |
| `streamResponse` | Interactive chat responses. | Copilot panel answer. |
| `classify` | Lightweight classification. | Import error categorization. |
| `redact` | Remove or mask sensitive values before logging. | Prompt and tool-output storage. |

The AI gateway should live server-side in an Edge Function or backend service, never in the browser. Supabase Edge Functions are appropriate for server-side TypeScript workflows, secrets, third-party integrations, and AI orchestration.[1]

## Deterministic Tooling Model

The copilot should not write SQL or query arbitrary tables. It should call a small set of deterministic tools that validate the user's membership, active location, role, and requested scope. Each tool returns structured data plus source references. The model can then explain the result, but the numbers come from the tool.

| Tool | Inputs | Output | Permission Level | Notes |
|---|---|---|---|---|
| `get_inventory_snapshot` | Location, ingredient filters, freshness options. | On-hand quantities, last count, last transaction. | Any active member. | Read-only. |
| `get_reorder_recommendations` | Location, vendor, date range. | Current recommendations and source factors. | Manager/admin/owner or viewer if allowed. | Read-only. |
| `get_forecast_summary` | Location, date range, menu/ingredient filter. | Forecast values, model version, input window. | Any active member. | Read-only. |
| `get_import_status` | Import job ID or recent jobs. | Status, errors, preview summary. | Creator or manager/admin. | Read-only. |
| `draft_bom` | Menu item name, known ingredients, optional menu description. | Draft BOM rows with confidence. | Manager/admin/owner. | Draft only. |
| `draft_csv_mapping` | File headers and sample rows. | Suggested mapping with confidence. | Manager/admin/owner. | Draft only. |
| `propose_inventory_action` | Action type and validated payload. | Confirmation card. | Role-specific. | Does not execute. |
| `confirm_action` | Proposal ID and user confirmation. | Durable result from deterministic RPC. | Required role. | Execution path is audited. |

## Confirmation Pattern

Any copilot action that changes operational data should produce an explicit action card. The card should show the exact records to be changed, expected inventory impact, source evidence, and whether the action can be reversed. Only after the user clicks confirm should Stockd execute the deterministic RPC.

| Action | Confirmation Card Must Show | Execution Path |
|---|---|---|
| Post receipt | Vendor, invoice number, line items, matched ingredients, total quantity increase, total cost, low-confidence matches. | `post_vendor_receipt` RPC. |
| Post count sheet | Counted items, expected on-hand, variance, adjustment deltas, high-variance warnings. | `post_count_sheet` RPC. |
| Log waste | Ingredient, quantity, reason, inventory decrease, actor. | `log_waste` RPC. |
| Confirm BOM | Menu item, ingredient rows, quantities, units, conversions, confidence. | `confirm_bom` RPC. |
| Approve reorder | Vendor, ingredient quantities, pack sizes, forecast window, estimated cost. | `approve_recommendation` RPC. |
| Roll back import | Import summary, affected records, reversal effects, irreversibility caveats. | `rollback_import` RPC. |

## Prompt and Response Guardrails

The copilot should use system prompts that enforce a strict distinction between deterministic facts and model reasoning. The assistant should cite source records or date ranges for numeric claims. It should state when data is missing, stale, estimated, or draft. It should refuse requests that would bypass permissions, manipulate another tenant's data, or perform unsupported vendor-facing actions.

OWASP's LLM security guidance identifies application risks such as prompt injection, sensitive data exposure, insecure output handling, and excessive agency in LLM-enabled systems.[2] Stockd should address these risks through tool allowlists, confirmation workflows, scoped retrieval, output validation, and prompt-injection resistant treatment of uploaded files as untrusted data. NIST's AI Risk Management Framework emphasizes governance, mapping, measurement, and management of AI risks, which supports maintaining explicit risk controls and audit trails for the copilot.[3]

## Prompt Injection and Untrusted Content

Restaurant uploads can include invoices, CSV fields, PDF text, menu descriptions, and notes. These documents may accidentally or intentionally contain text such as “ignore previous instructions.” The copilot must treat all uploaded content as data. The AI gateway should wrap extracted content in delimited data blocks and instruct the model not to follow instructions from those blocks. More importantly, the model should not have access to tools that can do harm without application-side validation.

| Attack Surface | Control |
|---|---|
| Uploaded invoices or CSV rows contain instructions. | Treat content as untrusted data; never execute instructions from files. |
| User asks copilot to query another restaurant. | Deterministic tools enforce membership and location scope. |
| Model fabricates reorder quantities. | Reorder numbers must come from `get_reorder_recommendations`. |
| Model suggests unsafe SQL or direct updates. | No SQL tool is exposed to the model. |
| Model proposes vendor email with unconfirmed order. | Vendor-facing sends require separate human confirmation and are not alpha scope. |
| Tool output contains HTML or formulas. | Escape output and validate before rendering. |

## Data Minimization and Logging

AI logs are useful for debugging and improving the product, but they can also create privacy risk. Stockd should store enough metadata to audit decisions without retaining unnecessary sensitive prompt content forever. In alpha, the default should be conservative retention and clear pilot consent.

| Data Type | Store? | Rationale |
|---|---|---|
| Conversation title and timestamps | Yes | Needed for history and support. |
| User messages | Yes, with pilot consent and deletion path | Needed for continuity and debugging. |
| Tool call names and inputs | Yes, redacted where necessary | Needed for audit and safety. |
| Full raw invoice text in AI logs | Prefer no; reference source file instead | Avoid duplicating sensitive vendor data. |
| Model outputs | Yes, with redaction for sensitive values | Needed for accountability. |
| Provider request IDs | Yes | Needed for debugging and cost tracking. |

## Copilot UX

The copilot should be available as a right-side panel in desktop and a full-screen drawer on mobile. It should be contextual: opening it from a reorder recommendation should pass the recommendation ID as context; opening it from an import job should pass import status. The user should not need to restate where they are.

Answers should be concise by default. For numeric or operational answers, the copilot should include a **“sources used”** section that links to relevant records, date ranges, or pages. When data is insufficient, the answer should say what is missing and offer a next action.

## Initial Copilot Skills

| Skill | Example Question | Expected Behavior |
|---|---|---|
| Inventory explanation | “Why does basil look low?” | Retrieve on-hand, recent sales depletion, receipts, waste, and last count; explain likely drivers. |
| Reorder explanation | “Why are you recommending 4 cases of cheese?” | Retrieve recommendation inputs and explain forecast, on-hand, lead time, pack size, and par. |
| Import repair | “Why did my CSV fail?” | Retrieve import errors, summarize the top causes, and guide mapping repair. |
| BOM drafting | “Draft a recipe for the chicken burrito.” | Produce draft ingredient rows with confidence and require confirmation. |
| Weekly summary | “How did last week look?” | Summarize sales, inventory risks, waste, receipts, and missing data. |
| Setup guide | “What should I do next?” | Inspect onboarding state and route user to the highest-value incomplete step. |

## Evaluation Strategy

The copilot should be evaluated through both automated and human review. Automated tests should verify that numeric claims are grounded, unsafe actions require confirmation, and prompt-injection examples do not change policy. Human review should examine whether answers are useful to restaurant operators, not merely technically correct.

| Evaluation | Test |
|---|---|
| Grounding | Every numeric answer must trace to deterministic tool output. |
| Safety | Prompt injection from uploaded files does not override system policy. |
| Permission | User cannot retrieve data outside their organization. |
| Confirmation | Write actions generate confirmation cards and do not execute in chat. |
| Usefulness | Pilot users rate answers as clear and actionable. |
| Cost/latency | Copilot responses fit acceptable response-time and cost budgets. |

## References

[1]: https://supabase.com/docs/guides/functions "Supabase Docs: Edge Functions"  
[2]: https://owasp.org/www-project-top-10-for-large-language-model-applications/ "OWASP Top 10 for Large Language Model Applications"  
[3]: https://www.nist.gov/itl/ai-risk-management-framework "NIST: AI Risk Management Framework"
