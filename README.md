# FairShare

FairShare is a shared-expenses app for the assignment case study: Aisha, Rohan, Priya, Meera, Dev, and Sam. It supports login, groups with changing membership, expenses, settlements, CSV import with anomaly review, explainable balances, and settlement recommendations.

## Tech Stack

- React, Vite, TypeScript, Tailwind CSS
- Node.js, Express, TypeScript
- Prisma + PostgreSQL
- Email/password auth with hashed passwords and HTTP-only JWT cookies

## Assignment Focus

The app is built around `expenses_export.csv`:

- Import the CSV exactly as provided; do not manually edit it.
- Store original CSV text and raw rows.
- Detect and surface anomalies.
- Require explicit decisions for risky rows.
- Generate an import report listing anomalies and actions taken.
- Preserve original currency data and use normalized INR for balances.
- Respect membership dates for Meera, Sam, and Dev.

## Local Setup

```bash
pnpm install
copy .env.example .env
pnpm run prisma:generate
pnpm run prisma:migrate
pnpm run seed
pnpm run dev:server
```

In a second terminal:

```bash
pnpm run dev:client
```

Open `http://localhost:5173`.

Seed login:

```text
Email: ava@example.com
Password: Password123
```

## Scripts

- `pnpm run dev:server` - start API server
- `pnpm run dev:client` - start frontend
- `pnpm run build` - build client and server
- `pnpm run start` - start compiled server
- `pnpm run test` - run backend tests
- `pnpm run prisma:migrate` - local migrations
- `pnpm run prisma:deploy` - production migrations
- `pnpm run seed` - seed demo users/group

## CSV Import Flow

1. Log in.
2. Create/open the flatmates group.
3. Add users for Aisha, Rohan, Priya, Meera, Sam, and Dev.
4. Open `/imports`.
5. Select the group.
6. Upload `expenses_export.csv`.
7. Review anomalies.
8. Choose actions such as approve, ignore row, mark fixed, or needs review.
9. Click `Generate import report`.
10. Use the `Import Summary` report as the deliverable import report.

Rows with unresolved error anomalies are blocked. Warning/info anomalies are still surfaced in the report.

## Demo Mode

Demo Mode helps during the 45-minute live evaluation.

Enable it with:

```text
Ctrl + Shift + D
```

or click the `Demo` button in the top nav.

Demo Mode provides:

- Aisha demo session
- Flatmate data for Aisha, Rohan, Priya, Meera, Dev, and Sam
- Membership changes
- CSV anomalies and import report
- Rohan's balance audit trail
- Aisha's who-pays-whom recommendations

Demo flow:

```text
Enable Demo Mode -> CSV anomalies -> Balance why -> Who pays whom -> Import report
```

Demo Mode is a frontend presentation layer. The real app still uses PostgreSQL and Prisma when Demo Mode is off.

## Key Screens

- `/dashboard` - overall balances and activity
- `/groups/:groupId` - group workspace, members, expenses, settlements
- `/imports` - CSV upload, anomaly review, import report
- `/groups/:groupId/balances/:userId` - Rohan-style balance explanation
- `/groups/:groupId/recommendations` - Aisha-style who-pays-whom page

## Environment Variables

| Name | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Long random secret |
| `NODE_ENV` | Yes | `development` or `production` |
| `CLIENT_ORIGIN` | Yes | Exact frontend/public URL |
| `PORT` | Usually provided | Server port |

Do not commit real production secrets.

## Deployment

The app is designed as one Node service serving both API and built React frontend.

### Render Blueprint

`render.yaml` is included.

Steps:

1. Push the repo to GitHub.
2. In Render, choose `New -> Blueprint`.
3. Connect this repository.
4. Render creates a web service and PostgreSQL database.
5. After deploy, update `CLIENT_ORIGIN` to the exact Render public URL if needed.
6. Redeploy.

Blueprint build command:

```bash
corepack enable && pnpm install --frozen-lockfile && pnpm run prisma:generate && pnpm run build
```

Blueprint start command:

```bash
pnpm run prisma:deploy && pnpm run start
```

## Deployment Smoke Test

After deployment:

1. Open `/api/health`; expect `{ "ok": true }`.
2. Sign up and log in.
3. Create a group.
4. Add another user by email.
5. Add expenses using supported split types.
6. Record a settlement.
7. Import `expenses_export.csv`.
8. Review anomalies and generate import report.
9. Open a user balance explanation.
10. Open settlement recommendations.

## Evaluator Checklist

| Requirement | Status |
| --- | --- |
| Login module | Complete |
| Group management | Complete |
| Membership changes over time | Complete in schema/import validation |
| Expense management | Complete |
| Equal split | Complete |
| Unequal split | Complete |
| Percentage split | Complete |
| Share split | Complete |
| Settlements | Complete |
| Group-wise balances | Complete |
| Individual balance summary | Complete |
| CSV import | Complete |
| Import anomalies | Complete |
| Import report | Complete |
| Relational DB only | Complete |
| Currency evidence and normalized INR | Complete |
| Rohan balance traceability | Complete |
| Aisha who-pays-whom summary | Complete |
| Deployment readiness | Complete |

## Important Notes

- The final real anomaly log depends on importing the actual provided `expenses_export.csv`.
- Vite may warn that the client bundle is over 500 kB because Framer Motion is used for polish. The build still succeeds.
- Demo Mode is for evaluation backup, not a replacement for the database-backed implementation.
