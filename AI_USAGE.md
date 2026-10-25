# AI Usage

## Tools Used
- ChatGPT/Codex-style coding assistant for requirements analysis, planning, implementation, documentation, and evaluator review.
- PowerShell terminal for file inspection, dependency installation, Prisma validation, tests, and builds.
- Prisma CLI for schema generation and validation.
- pnpm for dependency management, testing, and production builds.

## Key Prompts
- Initial assignment prompt: instructed AI to interview first, avoid assumptions, and maintain `AI_CONTEXT.md`.
- Product-scope prompt: supplied MVP scope for the original generic Splitwise-like version.
- Architecture prompt: asked AI to define tech stack, folder structure, frontend/backend architecture, database, deployment, and testing strategy.
- Implementation prompt: asked AI to scaffold and update context after each module.
- Module prompts: authentication, group management, expense management, balances, settlements, and expense chat.
- Evaluator prompt: asked AI to compare the implementation against assignment requirements and fix gaps.
- Pivot prompt: changed the assignment to a flatmates CSV-import/anomaly-detection app.
- Messy CSV schema/UI prompt: asked AI to add `GroupMembership`, CSV staging, anomaly decisions, currency rates, audit logs, original/normalized money fields, balance explanation, and settlement recommendation screens.

See `KEY_PROMPTS.md` for the detailed prompt history and how each response influenced implementation.

## How AI Helped
- Structured ambiguous requirements into documented decisions.
- Created and maintained `AI_CONTEXT.md` as a source of truth.
- Built a working full-stack foundation with React, Express, Prisma, and PostgreSQL.
- Added tests around high-risk split and balance calculation logic.
- Produced deployment documentation and evaluator checklists.
- Identified that the pivot requires new import/anomaly/membership-period work rather than continuing the generic app unchanged.
- Added schema and UI work for messy CSV import, anomaly decision auditability, currency correction, membership date validation, balance explanations, and settlement recommendations.

## Cases Where AI Was Wrong Or Needed Correction

### Case 1: AI Initially Built A Generic Splitwise Clone
- What happened: The AI implemented a generic shared-expense app based on the earlier scope.
- Why it was wrong after the pivot: The changed assignment is specifically about flatmates Aisha, Rohan, Priya, Meera, Dev, and Sam, dated memberships, exact CSV import, anomaly detection, and import reporting.
- Fix: The user issued a pivot prompt. AI updated `AI_CONTEXT.md`, created `SCOPE.md`, `DECISIONS.md`, and this `AI_USAGE.md`, and marked CSV import/anomaly detection as the new priority.

### Case 2: AI Assumed Deployment Readiness Was Enough Without Actual Public URL
- What happened: AI prepared deployment documentation and called the app public-deployment ready.
- Why it was incomplete: The assignment deliverables require a public deployed app URL.
- Fix: Documentation now explicitly says deployment is prepared but not complete until an external host and hosted PostgreSQL database are used and a public URL is produced.

### Case 3: AI Did Not Initially Account For Dated Memberships
- What happened: The first group model had simple current membership only.
- Why it was wrong for the pivot: Meera moved out at the end of March, Sam moved in mid-April, and Dev joined for a trip. Import validation and balances need membership periods.
- Fix: `SCOPE.md` and `DECISIONS.md` now require date-aware membership schema changes before CSV import can be considered correct.

### Case 4: AI Could Not Validate CSV Anomalies Without The CSV
- What happened: AI listed likely anomaly categories but could not produce the actual anomaly log.
- Why it matters: The assignment requires importing `expenses_export.csv` exactly and detecting at least 12 deliberate data problems.
- Fix: The missing CSV is documented as a blocker. The anomaly log remains pending until the file is placed in the workspace.

### Case 5: AI Initially Used Older Model Names
- What happened: The first import schema used `GroupMember`, `ImportBatch`, and `ImportRawRow`.
- Why it was incomplete: The updated assignment explicitly asked for `GroupMembership`, `CsvImportBatch`, and `CsvRawRow`-style staging concepts, plus joined/left membership dates.
- Fix: The schema and code were updated to `GroupMembership`, `CsvImportBatch`, and `CsvRawRow`, with `joinedAt` and `leftAt` membership fields.

### Case 6: AI Initially Stored Only A Latest Anomaly Action
- What happened: The first anomaly implementation updated `ImportAnomaly.finalActionTaken` directly.
- Why it was incomplete: Suspicious CSV rows should not be silently modified or lose decision history.
- Fix: `ImportDecision` was added as an append-only decision table while keeping `finalActionTaken` for fast UI display.

### Case 7: AI Initially Displayed Money As USD
- What happened: The frontend formatter used USD from the original generic MVP.
- Why it was wrong after the pivot: The assignment requires currency correction and normalized INR balances.
- Fix: The formatter now displays INR, and schema stores original currency/minor amount separately from normalized INR cents.

## Current AI Collaboration Policy
- Do not manually edit `expenses_export.csv`.
- Do not silently guess data fixes.
- Use AI to propose policies, but record final policies in `DECISIONS.md` and `SCOPE.md`.
- Keep `AI_CONTEXT.md` updated after every requirement, schema, API, UI, import, anomaly, or balance logic change.
- Treat AI output as reviewable engineering work, not as automatically correct.
