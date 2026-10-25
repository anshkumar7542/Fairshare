# Build Plan

## Critical Pivot
- The assignment has changed. The app is now a shared expenses app for flatmates Aisha, Rohan, Priya, Meera, Dev, and Sam.
- The highest-priority work is now CSV import, anomaly detection, membership date ranges, currency handling, and explainable balances.
- Do not continue optimizing the project as a generic Splitwise clone.
- Required final docs are `README.md`, `SCOPE.md`, `DECISIONS.md`, and `AI_USAGE.md`.
- `expenses_export.csv` is not currently present in the workspace, so exact import mapping and actual anomaly log are blocked until the file is provided.

## Pivot Implementation Plan
- Phase 1: Inspect `expenses_export.csv` once available.
  - Identify columns, date format, currency fields, split types, member names, settlement rows, and malformed rows.
  - Do not edit the CSV.
- Phase 2: Add schema support.
  - Membership date ranges.
  - Import batches.
  - Raw imported rows.
  - Import anomalies.
  - Import report metadata.
  - Currency code on expenses/settlements if required by the CSV.
- Phase 3: Build CSV importer.
  - Parse as provided.
  - Persist raw rows.
  - Validate rows.
  - Detect at least 12 deliberate data problems.
  - Continue after errors.
  - Generate import report.
- Phase 4: Build anomaly UI.
  - Show row number, field, issue, severity, policy, and import status.
  - Do not hide quarantined rows.
- Phase 5: Adapt balances.
  - Respect membership date ranges.
  - Exclude/quarantine invalid rows according to documented policy.
  - Group balances by currency if multiple currencies exist.
  - Show explainable balance breakdown.
- Phase 6: Update docs and deploy.
  - Complete anomaly log in `SCOPE.md`.
  - Complete decision log in `DECISIONS.md`.
  - Complete AI usage corrections in `AI_USAGE.md`.
  - Deploy public URL.

## Purpose
Build a simplified Splitwise-style expense sharing app for friends, roommates, and small groups. The app must be realistic for a 3-day internship assignment, maintainable, deployed, and backed by a relational database.

Implementation has started. This plan is based on the agreed context and implementation assumptions in `AI_CONTEXT.md`.

## Product Research Findings From Splitwise
- Splitwise organizes shared expenses around groups, members, expenses, balances, and settlements.
- The main product value is reducing confusion about who paid, who owes, and whether debts have been settled.
- Group pages are central because expenses and balances are usually contextual to a trip, apartment, or shared activity.
- Dashboard-level balances help users understand their total position across groups.
- Expense creation needs flexible split methods because real-world shared costs are not always equal.
- Settlement recording is separate from payment processing; the app can record that money changed hands without integrating payments.
- Discussion around an expense helps users resolve context, questions, and disagreements without leaving the expense record.
- Features such as invitations, friend requests, notifications, receipt OCR, payments, analytics, and mobile apps are useful but outside the 3-day MVP.

## Core Workflows Identified
- User signs up or logs in.
- User creates a group.
- User adds existing users to the group by email.
- Group members add expenses.
- Expenses can be split equally, unequally, by percentage, or by shares.
- Users can discuss an expense through expense-specific chat.
- Users can record settlements.
- Dashboard shows overall balances.
- Group pages show group-specific balances.

## Architecture Summary
- Monorepo with separate `client` and `server` folders.
- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query.
- Backend: Node.js, Express, TypeScript, Prisma.
- Database: PostgreSQL.
- Authentication: email/password, hashed passwords, JWT stored in an HTTP-only cookie.
- Deployment: one full-stack service serving the API and built frontend assets, connected to hosted PostgreSQL.

## Folder Structure
```text
AI_CONTEXT.md
BUILD_PLAN.md
README.md
client/
  src/
    app/
    components/
    features/
      auth/
      dashboard/
      groups/
      expenses/
      settlements/
    lib/
    types/
server/
  src/
    app.ts
    server.ts
    config/
    middleware/
    modules/
      auth/
      users/
      groups/
      expenses/
      settlements/
      balances/
    prisma/
    utils/
  tests/
prisma/
  schema.prisma
  migrations/
  seed script
```

## Frontend Architecture
- Route-based React application.
- Feature folders own their pages, forms, API hooks, and feature-specific components.
- Shared components stay small and reusable.
- TanStack Query manages server data, loading states, mutation states, and refetching after writes.
- React Context manages the authenticated user/session.
- Forms use client-side validation for usability, while backend validation remains authoritative.
- The UI must be responsive for desktop and mobile web.

## Backend Architecture
- REST API under `/api`.
- Express middleware handles JSON parsing, cookies, auth, authorization, validation, and centralized errors.
- Feature modules own route definitions, controllers, services, and data access.
- Prisma is the only database access path.
- Balance calculation is isolated in a dedicated service so it can be unit-tested.
- In production, Express serves the built React frontend.

## State Management
- Server-owned state: TanStack Query.
- Auth/session state: React Context.
- Local form and modal state: React component state.
- No large global store unless a later requirement creates a clear need.

## Authentication Approach
- Users sign up and log in with email and password.
- Emails are unique.
- Passwords are hashed before storage.
- Login creates a JWT in an HTTP-only cookie.
- Protected routes require a valid session.
- Logout clears the session cookie.
- The frontend checks current-user state on app load.

## Database Choice
- PostgreSQL only, satisfying the relational database constraint.
- Prisma manages schema and migrations.
- Money is stored as integer cents.
- Seed data should be included for demo/testing after product details are finalized.

## Deployment Approach
- Deploy a single full-stack service that serves both frontend and backend.
- Use hosted PostgreSQL.
- Run Prisma migrations as part of deployment or release setup.
- Required environment variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `CLIENT_ORIGIN`, and platform-provided `PORT`.
- Install command: `pnpm install --frozen-lockfile`.
- Build command: `pnpm run prisma:generate && pnpm run build`.
- Migration/release command: `pnpm run prisma:deploy`.
- Start command: `pnpm run start`.
- Acceptance criteria: public URL supports signup/login, group creation, adding users by email, expense creation, group/global balances, expense chat, and settlement recording.

## Testing Strategy
- Unit tests for split calculations and balance calculations.
- API tests for signup/login, group creation, member addition, expense creation, balance retrieval, chat message creation, and settlement recording.
- Validation tests for rejected malformed expense splits after split rules are finalized.
- Manual deployed smoke test before submission.
- End-to-end browser tests are optional if time remains.

## Assumptions Made
- The app uses original generic branding named `FairShare`.
- A single full-stack deployment is acceptable for the assignment.
- A REST API is acceptable.
- TypeScript is acceptable on both frontend and backend.
- PostgreSQL is acceptable as the relational database.
- Cookie-based JWT auth is acceptable.
- The app records settlements but does not move money.
- The app only adds existing users to groups by email; invitation emails are out of scope.
- Group editing/deletion, settlement editing/deletion, and chat edit/delete are out of scope for the initial implementation.
- Expense editing and deletion are implemented for current group members.
- Member removal is implemented for current group members.
- Monetary values are stored as integer cents.
- Rounding is deterministic and ensures split totals match expense totals.

## Known Risks
- Four split methods plus settlements and chat create a larger-than-usual 3-day MVP.
- Balance calculation bugs are the highest product risk.
- Rounding rules can create confusing balances unless defined early.
- Undefined edit/delete behavior can affect schema, authorization, and tests.
- Deployment can consume time if database migrations and cookie settings are not tested early.
- If exact UI screens/routes are not settled before coding, implementation may drift.

## Tradeoffs
- Single full-stack deployment reduces deployment complexity compared with separate frontend and backend hosting.
- REST keeps the API simpler than GraphQL for a small MVP.
- TanStack Query avoids unnecessary custom global state for server-owned data.
- Prisma speeds up relational schema work while keeping database access explicit.
- HTTP-only cookie JWTs avoid localStorage token handling but require careful cookie configuration in production.
- Feature depth is prioritized over nonessential Splitwise-adjacent features such as notifications and payments.

## Implementation Phases

## Progress

### Milestone 1: Authentication
- Status: complete.
- Implemented signup, login, logout, protected frontend routes, protected backend middleware, password hashing, session cookie handling, and validation errors.
- Verified with `pnpm test` and `pnpm build`.

### Milestone 2: Group Management
- Status: complete.
- Implemented group creation, group listing, group detail view, add existing users by email, remove users, and membership-based authorization checks.
- API decisions:
  - `GET /api/groups` returns only groups where the current user is a member.
  - `POST /api/groups` creates a group and adds the creator as the first member.
  - `GET /api/groups/:groupId` requires group membership.
  - `POST /api/groups/:groupId/members` adds an existing registered user by email.
  - `DELETE /api/groups/:groupId/members/:userId` removes a member and rejects removing the final member.
- UI decisions:
  - Dashboard shows accessible groups.
  - `/groups/new` is the create-group route.
  - Group detail shows current members, emails, add-member form, and a compact remove icon button.
  - Remove action is disabled when only one member remains.
- Known limitations:
  - No owner/admin role; all current members can add or remove members.
  - Group edit/delete remains out of scope.
  - Removed users remain in historical expenses, splits, settlements, and chat records.
  - Removed historical users are not visually labeled as former members yet.
  - Remove action does not yet use a confirmation modal.

### Milestone 3: Expense Management
- Status: complete.
- Implemented create expenses, edit expenses, delete expenses, and view expense details.
- Implemented equal, unequal, percentage, and share split methods.
- API decisions:
  - `POST /api/expenses` creates expenses and calculated split rows.
  - `GET /api/expenses/:expenseId` returns expense details, split rows, payer, and chat messages.
  - `PUT /api/expenses/:expenseId` updates expense fields and replaces split rows in a database transaction.
  - `DELETE /api/expenses/:expenseId` deletes the expense and dependent split/message rows through cascade.
- UI decisions:
  - Create expense remains on the group detail page.
  - Expense detail shows split rows and chat.
  - Editing opens an inline panel on the expense detail page.
  - Deleting an expense returns to the group detail page.
- Known limitations:
  - Edit supports only current group members as payer/participants.
  - Delete has no confirmation modal yet.
  - Edit UI does not expose an expense date picker yet.

### Milestone 4: Balances, Settlements, And Expense Chat
- Status: complete.
- Implemented dashboard balance summary, group balance summary, individual net balances, who-owes-whom rows, settlement recording/history, and expense-specific chat.
- Real-time chat uses TanStack Query polling every 5 seconds on the expense detail route.
- Verified with `pnpm test` and `pnpm build`.

### Milestone 5: Deployment Preparation
- Status: complete.
- Added production environment variable documentation.
- Added initial Prisma migration in `prisma/migrations/20260614000000_init/migration.sql`.
- Added Prisma migration lock file in `prisma/migrations/migration_lock.toml`.
- Added `packageManager` metadata for pnpm/Corepack-aware deployment hosts.
- Added database migration instructions.
- Added generic Node web service deployment instructions.
- Added public deployment readiness checklist and smoke test.
- Remaining external step: choose a hosting provider, provision hosted PostgreSQL, set env vars, run migrations, and publish the public URL.

### Milestone 6: CSV Import And Anomaly Review
- Status: implemented, pending validation against the real `expenses_export.csv`.
- Implemented authenticated CSV upload flow at `/imports`.
- Implemented backend import preview endpoint that stores the original CSV text and raw rows.
- Implemented anomaly persistence with row number, raw row data, anomaly type, severity, explanation, suggested action, final action, and approval flag.
- Implemented all required anomaly categories from the pivot request.
- Implemented anomaly action UI for approve import, ignore row, marked fixed, and needs review.
- Implemented finalize flow that imports eligible rows, skips ignored rows, blocks unresolved error rows, and stores an import report.
- Added membership date fields and currency fields to the relational schema.
- Verification:
  - `pnpm exec prisma validate` passed.
  - `pnpm exec prisma generate` passed.
  - `pnpm test` passed.
  - `pnpm build` passed.
- Known limitations:
  - Real CSV column mapping and real anomaly log cannot be finalized because `expenses_export.csv` is not present in the workspace.
  - Inline row value editing is not implemented yet; the preview supports anomaly actions.
  - Settlement-looking rows are detected and blocked from expense import, but settlement CSV import is not implemented yet.
  - Multi-currency rows are stored with currency code and flagged, but no conversion is performed.

### Evaluator Readiness Review
- Login module: complete.
- Group management: complete.
- Expense management: complete.
- Equal, unequal, percentage, and share splits: complete.
- Expense chat: complete with 5-second polling for near-real-time updates.
- Group-wise balances: complete.
- Individual balance summary: complete.
- Settlements: complete.
- Relational database usage: complete with PostgreSQL, Prisma schema, and migration files.
- Public deployment readiness: ready, but not deployed to a public URL in this workspace.
- README completeness: complete after deployment and evaluator sections were added.
- Build plan completeness: complete after progress, deployment, and evaluator readiness sections were added.
- AI context reproducibility: complete after schema, API, frontend, deployment, testing, limitations, and prompt history were consolidated.
- CSV import preview/report: implemented, pending validation against the real CSV.

### Phase 0: Finalize Product Rules
- Status: complete through documented implementation assumptions in `AI_CONTEXT.md`.

### Phase 1: Project Setup
- Create monorepo structure.
- Configure TypeScript frontend and backend.
- Configure database connection and Prisma.
- Add base README and environment template.
- Add shared formatting/linting scripts if time allows.

### Phase 2: Authentication and User Foundation
- Implement signup, login, logout, and current-user API.
- Implement frontend auth routes and protected route behavior.
- Add basic auth API tests.

### Phase 3: Groups and Memberships
- Implement group creation and group list/detail APIs.
- Implement add-existing-user-by-email flow.
- Implement group pages and member display.
- Add API tests for authorization and membership.

### Phase 4: Expenses, Splits, and Balances
- Implement expense creation for equal, unequal, percentage, and shares.
- Store expense split rows.
- Implement group and overall balance calculation.
- Add unit tests for split and balance logic.
- Add dashboard and group balance UI.

### Phase 5: Expense Chat and Settlements
- Implement expense-specific chat messages.
- Implement settlement recording.
- Update balance calculations to include settlements.
- Add UI for chat and settlement history/forms.

### Phase 6: Deployment and Submission Polish
- Status: deployment preparation complete; public hosting not executed in this workspace.
- Configure production build: complete.
- Add initial migration: complete.
- Complete README setup/deployment notes: complete.
- Deploy app with hosted PostgreSQL: pending external hosting provider.
- Run migrations against production: pending production database.
- Run manual smoke test against public URL: pending public URL.

## 3-Day Milestones

### Day 1
- Finalize remaining product rules.
- Set up project structure, database schema, and authentication.
- Complete group creation and add-member flow.

### Day 2
- Complete expense creation with all four split methods.
- Complete balance calculation service and tests.
- Build dashboard and group detail balance views.

### Day 3
- Complete expense chat and settlement recording.
- Polish responsive UI and error states.
- Deploy production app.
- Run smoke test and finish documentation.

## Remaining Decisions Before Coding
- None blocking initial implementation.
- Exact deployment provider remains configurable and does not block scaffolding because the app targets a generic Node web service plus hosted PostgreSQL.
