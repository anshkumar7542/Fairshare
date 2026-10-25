# Decisions

This file records the main product and engineering decisions for the flatmate shared-expenses assignment. It is intentionally concise for evaluator review.

## Product Scope

### Assignment Pivot
- Decision: Build for the case-study flatmates instead of a generic Splitwise clone.
- Alternatives: Continue with generic friends/groups expense tracking.
- Reason: The assignment requires Aisha, Rohan, Priya, Meera, Dev, Sam, dated memberships, CSV import, anomalies, currency handling, and explainable balances.
- Impact: CSV import, anomaly review, membership windows, and traceable balances became the core product.

### Preserve Existing Working Features
- Decision: Reuse existing auth, groups, expenses, settlements, balances, and React/Express/Prisma structure.
- Alternatives: Restart from scratch after the assignment pivot.
- Reason: The pivot still needs these modules and the timeline is short.
- Impact: New work focused on import/anomaly/membership/currency/explainability rather than rebuilding basics.

## Architecture

### Relational Database Only
- Decision: Keep PostgreSQL with Prisma.
- Alternatives: Add document storage or local file storage for CSV/import state.
- Reason: The assignment explicitly requires relational DBs only.
- Impact: Import batches, raw rows, anomalies, decisions, currency rates, memberships, expenses, splits, settlements, and audit records are relational models.

### Assignment-Aligned Schema Names
- Decision: Use names such as `GroupMembership`, `CsvImportBatch`, `CsvRawRow`, `ImportAnomaly`, `ImportDecision`, and `CurrencyRate`.
- Alternatives: Keep earlier generic names.
- Reason: Evaluators can map the schema directly to assignment requirements.
- Impact: The schema is easier to explain in the live review.

### Deployment Shape
- Decision: Deploy as one Node service that serves the built React app and Express API, backed by hosted PostgreSQL.
- Alternatives: Separate frontend and backend deployments.
- Reason: One service is simpler to deploy and debug within the internship scope.
- Impact: Production server serves `client/dist`; `render.yaml` supports Render Blueprint deployment.

## CSV Import And Anomaly Policy

### Import CSV Exactly As Uploaded
- Decision: Upload the CSV through the app, read its exact text, store original CSV and raw row data.
- Alternatives: Manually edit the CSV first or only store parsed data.
- Reason: The assignment forbids manual CSV editing and requires traceability.
- Impact: Suspicious rows can be reviewed without losing original evidence.

### No Silent Guessing
- Decision: Ambiguous, invalid, or suspicious rows are surfaced as anomalies with a documented policy.
- Alternatives: Auto-fix common issues or silently choose a winning row.
- Reason: The assignment says a crashed import and a silent guess both fail.
- Impact: Importer stores anomaly type, severity, explanation, suggested action, final action, and approval requirement.

### Error Rows Block Unless Resolved
- Decision: Unresolved `ERROR` anomalies remain blocked on finalize. `NEEDS_REVIEW` does not import a row.
- Alternatives: Import all rows after any user action or skip all errors automatically.
- Reason: Review is not the same as approval or correction.
- Impact: The app can generate a report without importing unsafe data.

### Warnings Are Visible But Usually Non-Blocking
- Decision: Warnings such as mixed dates or blank notes are included in preview/report but do not block by default.
- Alternatives: Block every anomaly.
- Reason: Some anomalies are risk signals, not guaranteed invalid rows.
- Impact: Users see the issue while still making progress.

### Duplicate Rows Require Approval
- Decision: Duplicates and same-expense-different-amount rows are flagged, not deleted automatically.
- Alternatives: Automatically drop exact duplicates.
- Reason: Meera asked to approve anything the app deletes or changes.
- Impact: Duplicate cleanup is explicit and auditable.

### Settlement-Like Expense Rows Are Blocked
- Decision: Rows that look like settlements/paybacks are detected and surfaced instead of imported as expenses.
- Alternatives: Import them as expenses or ignore them.
- Reason: Settlements affect balances differently from expenses.
- Impact: The report explains the problem and avoids corrupting expense balances.

## Currency And Membership

### Store Original And Normalized Money
- Decision: Store original currency/minor amount and normalized INR cents separately.
- Alternatives: Treat all amounts as INR or store floating-point converted values only.
- Reason: Priya’s USD concern requires preserving evidence and avoiding “1 USD = 1 INR.”
- Impact: Balance math uses normalized INR fields while the app can show original currency context.

### Exchange Rates Are Explicit
- Decision: Add `CurrencyRate` with integer `rateMicros`.
- Alternatives: Use floating-point rates or hard-code conversions.
- Reason: Currency correction should be reproducible.
- Impact: Non-INR rows can later link to a documented rate; current importer flags them for review.

### Membership Date Ranges Matter
- Decision: Group membership has `joinedAt` and `leftAt`; import validation checks expense dates against membership windows.
- Alternatives: Treat group membership as current-only.
- Reason: Sam joined mid-April, Meera left end of March, and Dev joined only for a trip.
- Impact: Sam is not charged for March expenses; Meera is not silently included after leaving.

## Balances And Settlements

### Pairwise Balance Calculation
- Decision: Expenses create directed debts from participant to payer; settlements reduce debts from payer to receiver; opposing debts are normalized.
- Alternatives: Store only final totals or run opaque optimization.
- Reason: The formula is easy to explain and sufficient for the assignment.
- Impact: Group and dashboard balances show who owes whom and individual net balances.

### User-Specific Explanation
- Decision: Add `/groups/:groupId/balances/:userId` as a “Why?” audit trail.
- Alternatives: Show only aggregate balances.
- Reason: Rohan needs to trace every rupee.
- Impact: The screen shows expense lines, settlement lines, CSV row evidence, and running totals.

### Settlement Recommendations
- Decision: Use current pairwise normalized balances for “who pays whom.”
- Alternatives: Implement multi-party debt minimization.
- Reason: Aisha wants a clear one-number-per-person answer, not an optimization black box.
- Impact: `/groups/:groupId/recommendations` shows large minimal payer -> receiver cards and supports one-click settlement recording.

## UX Decisions

### Premium SaaS UI Without A Heavy Framework
- Decision: Use React, Tailwind, shared primitives, CSS variables, and Lucide icons.
- Alternatives: Add a full component library.
- Reason: The app needs polish but should remain maintainable and explainable.
- Impact: Dashboard, groups, import, expenses, balances, and settlement screens share a consistent visual language.

### Import Is The Signature Flow
- Decision: Redesign CSV import as a six-step onboarding flow: upload, parsing, preview, anomaly center, decisions, summary.
- Alternatives: Plain upload form plus table.
- Reason: Anomaly handling is the assignment’s differentiator.
- Impact: The import UI clearly shows severity badges, row numbers, side-by-side raw/parsed data, suggested actions, approval buttons, and report output.

### Group And Expense Pages Prioritize Explainability
- Decision: Use group workspace layout, transaction feed expenses, split visualization, calculation explanations, and chat on expense detail.
- Alternatives: Keep CRUD-style tables.
- Reason: The live demo should make flows understandable without much narration.
- Impact: Evaluators can inspect activity, members, splits, settlements, and audit links quickly.

### Demo Mode
- Decision: Add frontend Demo Mode with realistic mock data and quick links.
- Alternatives: Require a fully seeded database for every live evaluation.
- Reason: Demo reliability matters, and the assignment CSV may not always be present locally.
- Impact: `Ctrl + Shift + D` enables Aisha’s guided demo without replacing the real PostgreSQL-backed implementation.

### Final Polish
- Decision: Add Framer Motion for route/toast animations, a lightweight local toast provider, skip link, reduced-motion support, skeletons, and illustrated empty states.
- Alternatives: CSS-only animations or another toast library.
- Reason: The app should feel like a startup SaaS product without over-engineering.
- Impact: The UI feels smoother and more responsive. Trade-off: Framer Motion increases bundle size and Vite emits a non-blocking chunk-size warning.

## Reuse Decisions

- Reuse authentication and protected route flow.
- Reuse existing expense split calculator for manual expenses and imported rows.
- Reuse balance and settlement modules after adding currency/membership context.
- Reuse dashboard/group routes but reposition them around import, anomaly review, traceability, and settlement recommendations.

## Known Pending Items

- Final anomaly log depends on importing the actual `expenses_export.csv`.
- Public URL must be filled in after deployment.
- Production `CLIENT_ORIGIN` must match the deployed URL exactly.
