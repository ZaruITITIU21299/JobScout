# AGENTS.md — JobScout

This file is the entry point for any AI agent working in this repository.
Read it fully before doing anything. Detailed rules live in `.cursor/rules/*.mdc`.

## 1. What this project is

**JobScout: A Web-based Platform for Job Application Pipeline Management.**
It is a bachelor thesis project (International University, VNU-HCM, Network Engineering major, student: Nguyễn Thành Tài).
It is graded as a thesis, so **explainability, evidence, and evaluation matter as much as features**.

Purpose: help job seekers (especially students and recent graduates) to
1. organize their job search visually (Kanban pipeline),
2. understand job descriptions (JD) using an LLM (skill extraction, skill-gap vs. a chosen CV),
3. avoid fake / scam / MLM job posts (rule-based engine + LLM semantic analysis + community flagging).

## 2. Approved scope (source of truth: the Thesis Registration Form)

| # | Module | What it must do |
|---|--------|-----------------|
| 1 | User roles & trust | Two roles only: **Job Seeker (User)** and **Administrator**. Users manage profile, CVs, applications. Admins review flagged content and manage the blacklist. A **Trust Score** decides the weight/permissions of a user's actions based on verification status, account history, and accuracy of past reports. |
| 2 | Pipeline & job management | Create job cards manually or by pasting a JD link. Cards live on a **Kanban board** with drag-and-drop between stages. Metadata saved automatically: company name, position, application date. |
| 3 | AI analysis & matching | LLM API processes JDs. **Skill extraction** into JSON on JD save. **Skill-gap analysis**: user picks a saved CV and checks it against a JD's required skills. |
| 4 | Scam detection & warning | **Rule-based engine** (dynamic rules, e.g. "payment required", "high salary no experience", title/description mismatch such as "sales"/"KPI") + **AI semantic analysis** when rules are unsure (probability of deceptive/MLM). Show a **warning banner with the evidence found**. |
| 5 | Community flagging & anti-gaming | Users flag a JD or Company with a reason (e.g. "Scam", "Title mismatch"). **Weighted voting**: total weight = sum of reporters' trust-score-based weights. **Anti-gaming**: rate limiting + anomaly detection (e.g. many new accounts flagging the same JD in a short time). Suspicious flags are **auto-frozen** for admin review. |
| 6 | Security & access control | Email/password + OAuth via the backend service. **Row Level Security (RLS)** so users can only access/modify their own CVs, applications, flags. **All AI and database calls happen server-side**; API keys never reach the client. |

Also in scope: **resume (CV) versioning**, **user dashboards**, and **evaluation** (functional tests, AI accuracy on a labeled dataset, usability tests).

Data entities mentioned in the form: users, resumes, job pipelines, flags, trust scores.

## 3. Out of scope unless the user explicitly approves

Do NOT add: auto-applying to jobs, email/inbox scraping, a mobile app, payments/subscriptions,
recruiter/employer accounts, chat/messaging, a third user role, social features beyond flagging,
or scraping job boards at scale. If the user asks for something that touches these, confirm first.

## 4. Do not invent requirements

- The form is the source of truth. If something is not in the form or not said by the user, it is **not a requirement**.
- If requirements are ambiguous, ask **one focused question** before writing code.
- Never invent numbers (trust-score formulas, thresholds, rate limits, weights). Propose values, label them as **proposals**, and wait for approval. Put approved values in config, not scattered in code.
- Never claim accuracy, performance, or test results that were not actually measured.

## 5. Tech stack

Agreed verbally with the supervisor (to be logged in `docs/DECISIONS.md`):

| Layer | Choice | Status |
|-------|--------|--------|
| Frontend / web framework | **Next.js** (React + TypeScript) | Decided |
| Backend / database / auth | **Supabase** (Postgres, Auth with email/password + OAuth, Row Level Security) | Decided |
| LLM | **Google Gemini Flash** to start with | Initial choice; may change, so keep it behind a provider interface |
| Rate limiting | **Upstash Redis** | Tentative ("probably"); confirm before building |
| Hosting | **Vercel** | Decided |

Still **undecided** (do not assume; propose 2 options with a recommendation, then wait):
UI component library, styling approach, validation library, test runner, data-fetching/state approach,
and **where server-side logic and LLM calls run** (Next.js route handlers / server actions vs Supabase Edge Functions).

Rules for the stack:
- Check `package.json` and existing code first; follow what is already there.
- Adding any dependency or swapping any layer above needs approval (see section 7).
- Stack-specific conventions are in `15-nextjs-supabase.mdc`.
- Record every stack decision in `docs/DECISIONS.md` (see `90-docs-and-git.mdc`).

## 6. Language rule

- All **code, identifiers, comments, commit messages, docs, tests, UI strings in source, and logs are in English**.
- Reply to the user in the language they write to you in (they may use Vietnamese or English), but anything written into the repo stays English.

## 7. Collaboration behavior

Before implementing a new feature, changing architecture, adding a dependency,
changing the database schema, deleting files, or making changes across more than
three files, ask the user for clarification and wait for approval.

For small, clearly requested fixes, first state the planned change in one sentence,
then proceed.

Do not invent product requirements. If requirements are ambiguous, ask one focused
question before writing code.

After each implementation, explain:
1. What changed
2. Why it changed
3. How to test it
4. Any assumptions made

Additional behavior:
- **Map every change to a module** (section 2, #1–#6). If it fits none, stop and ask.
- **Plan first for anything non-trivial**: list files to touch, the approach, and risks. Wait for "go".
- **Never run destructive commands** (drop tables, `rm -rf`, force push, reset migrations) without explicit approval.
- **Never commit or print secrets.** Use `.env.example` with placeholder values only.
- **Prefer the smallest change** that satisfies the request. No drive-by refactors; mention them as suggestions instead.
- **Be honest about uncertainty.** Say "I'm not sure" or "I didn't run this" rather than guessing.
- Ask at most one question at a time, and offer a recommended default so the user can answer "yes".
- This is a thesis the student must be able to **defend and explain**. Prefer simple, readable, well-explained solutions over clever ones, and explain *why* a design was chosen (it may end up in the thesis report).

**Exception:** if the user explicitly invokes `pi-mode` (by @-mentioning the rule or writing "pi mode"), follow `.cursor/rules/pi-mode.mdc` instead of the planning, approval, and summary steps above. Its hard stops still apply.

## 8. Definition of done

A task is done only when:
- it matches an approved requirement,
- types check, lint passes, and relevant tests pass (or you clearly state what you could not run),
- security rules in `50-security-privacy.mdc` are respected,
- the 4-part summary (what / why / how to test / assumptions) has been given.

## 9. Rule index

| File | Applies to |
|------|-----------|
| `00-workflow.mdc` | always: clarification, planning, safe edits |
| `05-project-context.mdc` | always: domain glossary, modules, data model sketch |
| `10-react-typescript.mdc` | `*.ts`, `*.tsx` |
| `12-ui-theme.mdc` | visual theme, design tokens, UI components |
| `15-nextjs-supabase.mdc` | Next.js, Supabase, Upstash, Vercel specifics |
| `20-api-data.mdc` | API routes, services, DB, migrations |
| `30-testing.mdc` | tests and manual QA |
| `40-thesis-quality.mdc` | scam detection, AI, flags, evaluation |
| `50-security-privacy.mdc` | auth, RLS, secrets, CV/PII data |
| `60-trust-flagging.mdc` | trust score, weighted voting, anti-gaming |
| `70-llm-integration.mdc` | LLM calls, prompts, JSON schemas |
| `80-kanban-pipeline.mdc` | Kanban board, job cards, CV versions, dashboard |
| `90-docs-and-git.mdc` | docs, decision log, commits |
