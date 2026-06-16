# GREENFIELD_INGESTION.md

**Product:** Stockd  
**Document owner:** Manus AI  
**Date:** May 12, 2026  
**Status:** Greenfield design document, not production code

## Ingestion Thesis

Stockd will succeed or fail on its ability to transform messy restaurant files into trustworthy operational data. Ingestion should therefore be treated as a first-class product workflow, not a hidden technical utility. Every import should be **staged, previewed, validated, committed, auditable, and reversible**.

The first release should support CSV/XLSX sales imports and vendor receipt uploads or manual entry. Live POS and vendor APIs should come later, after the data model, mapping workflow, and operator trust loop have been proven with files. This is not a step backward. CSV ingestion is the fastest path to learning how real restaurant data breaks.

## Supported Ingestion Sources by Stage

| Stage | Sales Data | Vendor/Receipt Data | Recipe/BOM Data | Operational Events |
|---|---|---|---|---|
| MVP | One known POS-style CSV template and seeded demo data. | Manual receipt entry only. | Manual BOM entry. | Manual counts and adjustments. |
| Alpha | Known POS-style CSV, generic CSV mapping, and manual corrections. | Receipt PDF/photo upload with draft extraction plus manual fallback. | AI-assisted BOM drafts with confirmation. | Counts and waste logs. |
| Beta | Multiple POS CSV templates and one live POS API if pilot demand justifies it. | Vendor invoice parser with alias learning. | Bulk import and better recipe templates. | Alert-driven workflows. |
| GA | Selected POS APIs and supplier integrations. | Supplier feeds or EDI-like structured imports where available. | Sub-recipes and versioning. | Accounting/export integrations. |

## Import Job Lifecycle

All ingestion should be represented by `import_jobs`. The job row is the durable state machine visible to both users and support. Files are stored in private object storage, staged data is written into preview tables or JSON artifacts, and commits create durable domain records.

| State | Meaning | Allowed Transitions | User Experience |
|---|---|---|---|
| `created` | Job row exists but file may not be uploaded yet. | `uploading`, `cancelled`. | Upload started. |
| `uploading` | User is uploading file to private storage. | `uploaded`, `failed`, `cancelled`. | Progress indicator. |
| `uploaded` | Raw file is stored and available to parse. | `parsing`, `failed`, `cancelled`. | File accepted. |
| `parsing` | System is reading headers, rows, and document text. | `mapping_required`, `preview_ready`, `failed`. | Processing indicator. |
| `mapping_required` | Required fields are not fully mapped. | `validating`, `cancelled`. | Mapping wizard. |
| `validating` | System checks rows, units, duplicates, dates, and totals. | `preview_ready`, `failed`. | Validation indicator. |
| `preview_ready` | User can review summary, staged rows, and errors. | `committing`, `cancelled`. | Preview and commit button. |
| `committing` | System is writing durable records in a transaction. | `committed`, `failed`. | Commit indicator, no duplicate submit. |
| `committed` | Durable records exist and derived state has been updated. | `rolling_back`. | Import detail and rollback option. |
| `rolling_back` | System is reversing derived records. | `rolled_back`, `failed`. | Rollback indicator. |
| `rolled_back` | Import effects were reversed and audit trail remains. | Terminal. | Import marked reversed. |
| `failed` | Job failed with a visible error. | Retry if safe, or cancel. | Error guidance and support details. |
| `cancelled` | User stopped the job before commit. | Terminal. | Removed from active queue. |

## Sales CSV Ingestion

Sales ingestion should preserve raw rows before transforming them. The minimum viable sales import needs business date, item name or item ID, quantity sold, and optionally sales amount. The importer should support known templates first, then generic column mapping.

| Step | System Action | Validation |
|---|---|---|
| Upload | Store raw file in `imports-raw` with org/location scoped path. | File type, file size, virus scan if later available. |
| Header detection | Read columns, delimiter, encoding, row count, and sample rows. | Required fields can be inferred or need mapping. |
| Mapping | Suggest mapping for date, item name, item ID, quantity, gross sales, discounts, taxes. | Required mapped fields exist and sample rows parse. |
| Row validation | Normalize dates, quantities, money, item identities, and duplicates. | Reject impossible dates, negative quantities unless explicit refund handling, and malformed money. |
| Menu matching | Match POS IDs or names to `menu_items`; create staged new items. | Flag duplicates and unknowns. |
| Preview | Show date range, row count, menu item count, sales totals, and errors. | User understands what will be created. |
| Commit | Create `sales_imports`, `sales_line_items_raw`, menu items as needed, aggregates, and inventory depletion transactions if BOMs exist. | Single transaction or idempotent commit with lock. |
| Rollback | Reverse derived inventory transactions and mark import rolled back. | Preserve raw import and audit history. |

## Vendor Receipt Ingestion

Receipt ingestion has higher trust risk than sales ingestion because it directly increases inventory and affects cost assumptions. Stockd should never auto-post receipt data extracted by AI or OCR. The system may create a draft, match lines to ingredients, suggest pack conversions, and flag mismatches, but a human must review before posting.

| Step | System Action | Required Human Review |
|---|---|---|
| Upload invoice/photo | Store raw document in private storage and create receipt import job. | Confirm vendor if not detected. |
| Extract header | Identify vendor, invoice number, invoice date, subtotal, tax, and total. | Confirm invoice metadata. |
| Extract lines | Identify line descriptions, quantities, pack sizes, units, unit cost, and line total. | Review low-confidence or unmatched lines. |
| Match products | Use `vendor_product_aliases`, fuzzy matching, and prior confirmations. | Confirm new aliases and ingredient mappings. |
| Validate totals | Compare line totals with invoice totals. | Resolve material discrepancies. |
| Post receipt | Create `vendor_receipts`, `receipt_items`, inventory transactions, vendor aliases, and audit log. | Explicit post action by manager/admin. |
| Reverse receipt | Create reversal transactions if receipt was posted incorrectly. | Manager/admin confirmation. |

## Mapping Wizard Requirements

The mapping wizard should show the user a sample table of their uploaded rows. It should suggest column mappings and explain why each mapping was chosen. The UI should accept manual overrides and immediately re-run validation on a small sample before validating the whole file.

| Mapping Field | Required | Example Synonyms | Notes |
|---|---|---|---|
| Business date | Yes | Date, Order Date, Closed Date, Business Day | Must normalize timezone by location. |
| Item name | Yes unless item ID is sufficient | Item, Menu Item, Product Name, Name | Used for menu matching and display. |
| Item ID | No but preferred | POS ID, SKU, Item GUID | Stable match key when available. |
| Quantity sold | Yes | Qty, Quantity, Count, Items Sold | Must support decimals for weighted items later. |
| Gross sales | No | Gross, Sales, Revenue | Helpful for dashboards. |
| Discounts | No | Discount, Promo | Negative values need normalization. |
| Tax | No | Tax, Sales Tax | Stored separately when available. |
| Category | No | Category, Menu Group | Useful for onboarding review. |

## Error Handling and Repair

Import errors should be actionable. The product should avoid generic messages such as “invalid row.” Each error should identify the row, field, raw value, problem, and likely fix. Errors should be grouped by type so users can resolve common issues in bulk.

| Error Type | Example | Severity | Resolution |
|---|---|---|---|
| Missing required value | Row 42 has no item name. | Blocking | Skip row or provide value. |
| Invalid date | `13/40/2026` cannot be parsed. | Blocking | Choose date format or edit row. |
| Unknown quantity | `two cases` in sales CSV quantity field. | Blocking | Map correct column or edit value. |
| Duplicate row | Same source hash already imported. | Warning or blocking | Confirm replacement or skip duplicate. |
| Unknown menu item | Item not found in existing menu. | Warning | Create new menu item or map to existing. |
| Unknown unit | Receipt line uses vendor-specific unit. | Blocking for receipt post | Create conversion or mark as non-inventory. |
| Total mismatch | Receipt lines do not sum to invoice total. | Warning or blocking by threshold | Review extracted lines. |

## Reversibility and Idempotency

Every committed import must be reversible without deleting evidence. Sales import rollback should mark the import as rolled back and create reversal records for derived inventory effects. Receipt rollback should reverse posted receipt inventory transactions and mark the receipt reversed. Raw rows and source files should remain available for audit unless retention policy requires deletion.

Idempotency should be enforced with source hashes, unique constraints, and job-level locks. A user double-clicking commit should not create duplicate imports. A retry after a function timeout should detect whether the job has already committed and return the existing result.

## Security and Privacy

Uploaded files often contain revenue, vendor pricing, and supplier information. Files should live in private storage, and user access should be mediated by RLS-aware application logic or signed URLs. Supabase Storage is designed for storing and serving files with access controls, which supports this private-file strategy.[1]

The import parser should treat uploaded files as untrusted data. Formula injection in CSV exports, malicious filenames, and unexpected encodings should be neutralized. The application should display text as escaped text, not executable content. AI should not be allowed to follow instructions contained inside uploaded invoices or CSV files; uploaded content is data, not application instruction.

## Testing Strategy

| Test Category | Examples |
|---|---|
| Template fixtures | Known Toast-like CSV, Square-like CSV, generic CSV, malformed CSV. |
| Property tests | Random date formats, delimiters, money values, blank rows, duplicate rows. |
| Golden imports | Fixed fixture imports produce known menu items, aggregates, and transactions. |
| Rollback tests | Commit then rollback returns inventory on-hand to previous state. |
| Receipt extraction tests | Sample invoice PDFs create draft rows but never auto-post. |
| Security tests | CSV formula strings are escaped; cross-tenant import access is blocked. |

## References

[1]: https://supabase.com/docs/guides/storage "Supabase Docs: Storage"  
[2]: https://supabase.com/docs/guides/functions "Supabase Docs: Edge Functions"
