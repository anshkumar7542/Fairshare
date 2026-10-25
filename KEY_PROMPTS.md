# Key Prompts

This document captures the significant prompts used to build FairShare. It is written to show the collaboration process: requirements were clarified first, context was maintained, implementation was phased, and each module was evaluated against the assignment before moving on.

## 1. Original Assignment Prompt

**Prompt**

> You are a junior engineer helping me complete an internship assignment. The assignment is to reverse engineer Splitwise, scope a realistic 3-day version, and build a working deployed app. Important instructions: 1. Do not assume product requirements. 2. Do not jump directly into implementation. 3. Ask me detailed questions about product scope, UX, workflows, edge cases, and engineering decisions. 4. Ask about every implementation detail needed to build the app. 5. After each answer I give, update a Markdown file called AI_CONTEXT.md. 6. AI_CONTEXT.md must become the source of truth for the entire project. 7. The final app must be buildable from AI_CONTEXT.md. 8. Another evaluator should be able to paste AI_CONTEXT.md into the same AI tool and recreate a similar app. 9. Before writing code, produce a build plan based only on the agreed context. 10. During implementation, keep updating AI_CONTEXT.md whenever requirements, architecture, schema, UI, or logic changes. 11. Do not recommend technical solutions. Your job is to let me think through the technical solution. Start by interviewing me. Ask questions across: product goals, Splitwise research, core workflows, user personas, MVP scope, out-of-scope features, data model, authentication, groups, expenses, settlements, balance calculation, UI screens, routing, frontend architecture, backend architecture, database choice, API design, deployment, testing, known risks, tradeoffs. Do not give me a final plan until you have asked enough questions.

**Why This Prompt Was Issued**

The assignment required controlled AI collaboration instead of one-shot code generation. This prompt set the operating rules: interview first, avoid assumptions, document decisions, and make `AI_CONTEXT.md` the rebuildable source of truth.

**How The AI Response Influenced Implementation**

The AI created `AI_CONTEXT.md` before coding and began with structured product questions. This prevented premature implementation and established a documentation-first workflow that continued through architecture, build planning, module implementation, and evaluator review.

## 2. Product Scope Decisions Prompt

**Prompt**

> Use the following decisions as my answers and update AI_CONTEXT.md accordingly. Product Goal: Build a simplified Splitwise clone for friends, roommates, and small groups to track shared expenses and settlements. User Personas: college students, roommates, friends during trips. Core Workflow: signup/login, create group, add existing users by email, add expenses, support equal/unequal/percentage/share splits, expense chat, settlements, dashboard overall balances, group-specific balances. MVP Scope: authentication, dashboard, groups, expenses, all four split methods, expense chat, group balances, settlement recording. Out of Scope: friend requests, push notifications, email invitations, receipt OCR, currency conversion, payment gateway, mobile app, analytics. Non-functional Requirements: responsive UI, basic security validation, production deployment, maintainable code, documentation.

**Why This Prompt Was Issued**

The first interview produced open questions. This prompt supplied the key product scope so the AI could stop treating the app as undefined.

**How The AI Response Influenced Implementation**

The AI updated `AI_CONTEXT.md` with the product goal, personas, core workflows, MVP scope, and exclusions. These decisions directly shaped the feature modules: auth, groups, expenses, split methods, balances, settlements, and chat.

## 3. Ambiguity Check Prompt

**Prompt**

> Before implementation, identify any remaining critical ambiguities. If sufficient information exists, stop the interview, produce AI_CONTEXT.md, and produce BUILD_PLAN.md. Do not write code yet. BUILD_PLAN.md must include product research findings from Splitwise, core workflows, assumptions, risks, trade-offs, implementation phases, and milestones achievable within 3 days. AI_CONTEXT.md must become detailed enough for another engineer or AI to rebuild the same application.

**Why This Prompt Was Issued**

This prompt forced an explicit readiness check before planning. It tested whether the context was actually sufficient or whether the AI would invent missing requirements.

**How The AI Response Influenced Implementation**

The AI refused to create a build plan at that point because critical details were still missing. It documented the blockers in `AI_CONTEXT.md`, including auth behavior, data model, split logic, balance rules, UI routes, API design, database, deployment, and testing. This protected the project from hidden assumptions.

## 4. Architecture Definition Prompt

**Prompt**

> Now define the architecture. Constraints: use a relational database only, prefer technologies suitable for rapid delivery within 3 days, prioritize maintainability and simplicity. Document tech stack, folder structure, frontend architecture, backend architecture, state management, authentication approach, database choice, deployment approach, and testing strategy. Update AI_CONTEXT.md and BUILD_PLAN.md. Do not generate implementation yet.

**Why This Prompt Was Issued**

After product scope was established, the project needed technical direction. This prompt gave permission to choose architecture within constraints.

**How The AI Response Influenced Implementation**

The AI selected a TypeScript monorepo with React/Vite/Tailwind, Express, Prisma, PostgreSQL, REST APIs, TanStack Query, React Context for auth, Zod validation, and a single-service deployment. `BUILD_PLAN.md` was created from those decisions, and the later scaffold followed this architecture closely.

## 5. Implementation Start Prompt

**Prompt**

> Based strictly on the agreed context in AI_CONTEXT.md and BUILD_PLAN.md, begin implementation. Before generating code: verify that all mandatory assignment requirements are covered, identify any remaining assumptions, document those assumptions in AI_CONTEXT.md. Then scaffold the project structure. After generating each module, update AI_CONTEXT.md with implementation decisions, files created, deviations from the plan, and reasons for those deviations.

**Why This Prompt Was Issued**

This prompt moved the project from planning into implementation while preserving the documentation-first rule.

**How The AI Response Influenced Implementation**

The AI documented remaining assumptions, then scaffolded the monorepo, Prisma schema, seed script, backend routes, frontend routes, shared components, tests, and README. It also updated `AI_CONTEXT.md` after each batch of files, so the implementation remained traceable.

## 6. Authentication Prompt

**Prompt**

> Implement Authentication. Requirements: signup, login, logout, protected routes, password hashing, session handling, validation errors. After implementation: update AI_CONTEXT.md with implementation details, add testing instructions, explain trade-offs made, commit this module mentally as Milestone 1.

**Why This Prompt Was Issued**

Authentication is foundational for every protected workflow. This prompt isolated it as the first milestone and required documentation and testing instructions.

**How The AI Response Influenced Implementation**

The AI confirmed and documented signup, login, logout, bcrypt password hashing, HTTP-only JWT cookies, backend `requireAuth`, frontend `ProtectedRoute`, validation errors, and auth testing instructions. It recorded trade-offs such as using JWT cookies instead of server-side sessions.

## 7. Group Management Prompt

**Prompt**

> Implement Group Management. Requirements: create groups, view groups, view group details, add users, remove users, authorization checks. Update AI_CONTEXT.md and BUILD_PLAN.md progress section. Document API decisions, UI decisions, known limitations discovered.

**Why This Prompt Was Issued**

Groups are the primary container for the Splitwise-style workflow. The earlier implementation supported creation and adding users, but this prompt required removal and explicit authorization review.

**How The AI Response Influenced Implementation**

The AI added member removal, prevented removing the last member, documented group API decisions, updated balance user inclusion for historical participants, and added member removal UI. It also documented limitations such as no admin role and no group edit/delete.

## 8. Expense Management Prompt

**Prompt**

> Implement Expense Management. Requirements: create expenses, edit expenses, delete expenses, view expense details. Support equal split, unequal split, percentage split, share split. Document how each split algorithm works, validation rules, and edge cases handled. Update AI_CONTEXT.md after implementation.

**Why This Prompt Was Issued**

Expenses and split logic are the core business feature. This prompt required not just CRUD, but explicit algorithm documentation.

**How The AI Response Influenced Implementation**

The AI added expense edit/delete APIs, inline edit UI, delete flow, transaction-based split replacement, and documentation for equal, unequal, percentage, and share splits. It also documented rounding behavior, participant validation, duplicate prevention, and known edit limitations.

## 9. Balance Calculation Prompt

**Prompt**

> Implement Group-wise and Individual Balance calculations. Requirements: dashboard balance summary, group balance summary, who owes whom. Document balance calculation formulas, settlement interaction, and examples. Update AI_CONTEXT.md with the final calculation logic.

**Why This Prompt Was Issued**

Balance math is the highest-risk part of the assignment. This prompt required both implementation and explainability.

**How The AI Response Influenced Implementation**

The AI added a reusable `BalanceSummary` component, displayed individual net totals and pairwise who-owes-whom rows on dashboard and group pages, added a test for opposing debts, and documented formulas for expense debt creation, settlement reduction, pairwise normalization, and individual net totals.

## 10. Settlements Prompt

**Prompt**

> Implement Settlements. Requirements: record payments, settlement history, update balances accordingly. Document settlement flow, validation, trade-offs. Update AI_CONTEXT.md.

**Why This Prompt Was Issued**

Settlements complete the expense lifecycle: users need to mark debts as paid without integrating actual payments.

**How The AI Response Influenced Implementation**

The AI confirmed settlement recording, improved settlement history display with date and notes, added a balance test for overpayment flipping debt direction, and documented settlement validation, correction trade-offs, and lack of payment gateway integration.

## 11. Expense Chat Prompt

**Prompt**

> Implement Expense Chat. Requirements: expense-specific messages, real-time updates, persistent storage, authorization checks. Document chosen real-time approach, why it was selected for a 2-day build, and limitations. Update AI_CONTEXT.md.

**Why This Prompt Was Issued**

Expense chat was part of the MVP and needed a practical real-time strategy that fit the limited timeline.

**How The AI Response Influenced Implementation**

The AI used persistent `ExpenseMessage` records and added TanStack Query polling every five seconds on the expense detail page. It documented why polling was chosen over WebSockets: lower complexity, REST compatibility, easier deployment, and adequate behavior for low-volume MVP chat.

## 12. AI_CONTEXT Review Prompt

**Prompt**

> Review AI_CONTEXT.md. Ensure it includes product understanding, product scope, implementation decisions, engineering requirements, tech stack, database schema, API design, frontend structure, deployment plan, testing plan, trade-offs, prompts and AI responses, changes made during implementation, known limitations. Add anything missing.

**Why This Prompt Was Issued**

The implementation log was detailed, but a future evaluator needed a consolidated source of truth, not only a chronological record.

**How The AI Response Influenced Implementation**

The AI added explicit sections for product understanding, product scope, database schema, API design, frontend routes, deployment plan, testing plan, known limitations, prompt/response history, and resolved ambiguities. This made `AI_CONTEXT.md` reproducible for another engineer or AI.

## 13. Deployment Preparation Prompt

**Prompt**

> Prepare deployment. Requirements: production environment variables, database migration instructions, deployment instructions, public deployment readiness. Update README.md, BUILD_PLAN.md, AI_CONTEXT.md. Ensure another engineer can deploy the application using these documents.

**Why This Prompt Was Issued**

The assignment asks for a working deployed app. This prompt prepared the project for a public host even though deployment itself required external hosting credentials and infrastructure.

**How The AI Response Influenced Implementation**

The AI added production env var documentation, migration instructions, deployment commands, readiness checklist, smoke test, troubleshooting, and an initial Prisma migration. It also documented that actual deployment remained an external step.

## 14. Spreetail Evaluator Prompt

**Prompt**

> Act as the SPREETAIL evaluator. Compare the implementation against the assignment. Verify login module, group management, expense management, equal/unequal/percentage/share splits, expense chat with real-time updates, group-wise balances, individual balance summary, settlements, relational database usage, public deployment readiness, README completeness, BUILD_PLAN completeness, AI_CONTEXT reproducibility. Identify gaps and fix them. Update all documentation accordingly.

**Why This Prompt Was Issued**

This prompt simulated the final review. It shifted the AI from implementer mode to evaluator mode and asked it to find gaps rather than assume completion.

**How The AI Response Influenced Implementation**

The AI found and fixed deployment/reproducibility gaps: missing pnpm package-manager metadata, missing Prisma migration lock, missing evaluator checklist in README, missing evaluator readiness summary in `BUILD_PLAN.md`, and missing evaluator verdict section in `AI_CONTEXT.md`. It reran validation, tests, and build after the fixes.

## Collaboration Pattern Demonstrated

- Requirements were gathered before implementation.
- Ambiguities were documented instead of silently assumed.
- Architecture was agreed before code generation.
- `AI_CONTEXT.md` was updated after product, architecture, schema, UI, API, and logic changes.
- `BUILD_PLAN.md` tracked phases, milestones, risks, and progress.
- Each feature was implemented as a milestone with documentation and verification.
- The AI was asked to evaluate its own work against the assignment and fix gaps.
- The final project is not just code; it includes reproducible context, deployment instructions, testing guidance, known trade-offs, and limitations.
