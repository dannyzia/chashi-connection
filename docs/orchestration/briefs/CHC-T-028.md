# CHC-T-028 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-028
TITLE:           Admin stage 1: role column, hardened grants, operator dashboard skeleton
ASSIGNED TO:      A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-025 (main @ fa0efe1 base)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §11 (admin panel — MVP subset), §12.4 (hide after reports), AGENTS.md (locked stack, bright lines, Bengali-only); DECISIONS CHC-D-016/022/031 (explicit-grant pattern)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (tokens, keys, .env, service-role — variables/digests only).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
The operator (owner) needs the PRD §11 admin capability: see the reports queue (all reports — currently SELECT-own only), and hide/unhide listings (the PRD §12.4 hide-after-reports flow's operator side). This is stage 1: the role foundation + a minimal operator dashboard. SECURITY-CRITICAL: a new users.role column is only safe if users CANNOT write it themselves — the current users_সম্পাদনা policy (id = auth.uid()) plus Supabase's default table-wide UPDATE grant would let any user set role='admin' on their own row. This brief therefore REBUILDS the users grants column-scoped (the proven 00003 pattern): INSERT/UPDATE restricted to explicit profile columns, excluding role AND verified (self-verification would be equally spoofable) AND phone (phone changes should re-verify; out of scope). Admin privileges come from RLS policies keyed on the role column (permissive policies OR together with existing ones — row filters, not grants). ⛔ ABSOLUTE RULE: users.role must NEVER be writable by anon/authenticated — every grant statement you write must be checked against this. If you find any grant path that would allow it, STOP and report.

OBJECTIVE
(1) Migration 00005: users.role column + column-scoped users grants (role/verified/phone excluded) + admin RLS policies (reports read-all, products read-hidden + update-hidden), (2) the owner's promotion is ORCHESTRATOR work (post-apply SQL; NOT yours), (3) a minimal /admin route: session-gated, role-checked, showing the reports queue and a hide/unhide toggle for listings, all Bengali, (4) proofs: self-promotion is IMPOSSIBLE (live SQL evidence), admin policies work for an admin test user (live), (5) gates + bytes, (6) merged with ORCHESTRATOR-PENDING-APPLY-VERIFICATION.

SCOPE (the ONLY files you may create or modify)
- supabase/migrations/00005_admin.sql — create (ADDITIVE + the users grant rebuild; see R1c — the rebuild REVOKEs and re-GRANTs columns on users, which is a privileges change, not a schema alteration; no drops)
- apps/web/src/routes/admin/+page.svelte — create
- apps/web/src/lib/admin.ts — create (role check + admin queries)
- apps/web/src/lib/bn.ts — modify (admin UI Bengali strings)
- Branch/commit/merge/push

OUT OF SCOPE
- Promoting any real user to admin (orchestrator post-apply); FCM; AI; user ban/verification management; realtime; migrations beyond 00005; docs/; package.json
- Any client-side role spoofing surface (role comes from the server row via RLS — never from localStorage)
- The 00002 chats policy (00003 already hardened its grants)

INPUTS (read first)
- supabase/migrations/00001_init.sql — users columns + existing policies; reports/blocks/products policies
- supabase/migrations/00003_chats_hardening.sql — the column-scoped grant pattern you must mirror
- apps/web/src/lib/server-chats.ts — the module pattern (null-safe, session-gated)
- apps/web/src/lib/server-feed.ts — the products-query pattern
- .kilo/plans/plan/PRD-V5.0.md §11 — admin MVP subset (reports queue + hide/unhide only for this stage)

REQUIREMENTS (numbered; each testable)
R1. Migration 00005_admin.sql (single file, Bengali comments, additive):
    a. alter table public.users add column if not exists role text not null default 'user' check (role in ('user','admin'));
    b. REBUILD users column grants (the 00003 pattern): revoke ALL on table public.users from anon, authenticated; then grant SELECT (id, phone, name, label, division, district, upazila, union_name, village, lat, lng, detail, whatsapp, women_safety, verified, role, created_at) to anon, authenticated; grant INSERT (id, phone, name, label, division, district, upazila, union_name, village, lat, lng, detail, whatsapp, women_safety, created_at) to authenticated [role and verified EXCLUDED — self-verify/self-promote prevention]; grant UPDATE (name, label, division, district, upazila, union_name, village, lat, lng, detail, whatsapp, women_safety) to authenticated [role, verified, phone, id, created_at EXCLUDED]. Adjust the exact column list to the REAL users columns (read 00001 first — include every column except id/created_at in INSERT, and except id/phone/verified/role/created_at in UPDATE).
    c. Admin RLS policies (permissive, OR with existing): reports_অ্যাডমিন_পঠন on public.reports for select to authenticated using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')); products_অ্যাডমিন_পঠন on public.products for select to authenticated using (same admin check) [gives hidden-product visibility]; products_অ্যাডমিন_সম্পাদনা on public.products for update to authenticated using (admin check) with check (admin check).
    d. Preserve 00003's chats grants exactly (do not touch chats).
    e. Idempotent-safe (if not exists / or replace / grant-revoke pairs re-runnable). Bengali comments explaining the self-promotion prevention.
R2. src/lib/admin.ts: hasAdminRole() (session-gated: fetch own users row .select('role').eq('id', uid).single() → role === 'admin'; null-safe, never throws), fetchAllReports() (.from('reports').select('*').order('created_at', {ascending:false}).limit(100) — works only for admins via the 00005 policy; non-admin gets []/error → treat as empty), fetchProductsAdmin() (.from('products').select('*').order('created_at', {ascending:false}).limit(100) — admin sees hidden too via policy; non-admin sees only non-hidden own+others per existing policies — document the difference), setHidden(productId, hidden) (.from('products').update({hidden}).eq('id', productId) — works only for admins via the admin update policy). All null-safe, never throw, Bengali-safe error objects.
R3. /admin route (Bengali UI): on mount → hasAdminRole(); false/null → render ONLY a minimal Bengali "অ্যাক্সেস নেই" state (no admin data fetched, no errors leaked); true → render: (a) রিপোর্ট তালিকা — every report: category, target_type, target_id, details, created_at; (b) পণ্য তালিকা — recent products with title, hidden badge, and a hide/unhide toggle calling setHidden (optimistic local flip + refetch on failure); plain CSS per the locked stack (reuse app.css patterns; no framework). NO phone/whatsapp columns rendered anywhere.
R4. No route registration in sitemap/nav (the admin route is unlinked — known-by-URL only, per operator-tool convention); a non-admin navigating there gets the access-denied state (R3).
R5. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 with .env and env-less; byte delta stated (admin route is a NEW lazy chunk — expect growth; state it; under 20,000 B).
R6. Evidence without live admin (the owner is promoted post-merge by the orchestrator):
    a. Self-promotion impossibility (THE critical proof): via Management API SQL — as a TEST auth user with a session, attempt UPDATE public.users SET role='admin' WHERE id = <test uid> → expect 42501 permission denied OR 0 rows affected with the column unchanged (paste which, with the privilege error verbatim); also attempt INSERT a new users row with role='admin' → expect the column-grant rejection (42501) — paste.
    b. Admin-page access-denied state: browser with a NON-admin session (or env-less) → the route renders অ্যাক্সেস নেই, zero admin-data requests leak data (network shows the role fetch only) — paste console/network evidence.
    c. Migration parse (pgsql-parser --no-save + prune + hash-unchanged, the established method) — paste PARSE OK + statement inventory (expect: 1 AlterTable, several GrantStmt/RevokeStmt, 3 CreatePolicyStmt).
R7. Commit (explicit pathspec):
   feat(admin): role column, hardened users grants, operator dashboard skeleton

   users.role added; users INSERT/UPDATE grants rebuilt column-scoped —
   role/verified/phone excluded from self-writes (self-promotion and
   self-verification impossible). Admin RLS: reports read-all, products
   read-hidden + update (role='admin' via users). Minimal /admin operator
   dashboard (Bengali): reports queue + hide/unhide. Promotion of the
   owner's account is an orchestrator post-apply step.

   Refs: CHC-T-028
   Push task/CHC-T-028; merge --no-ff with ORCHESTRATOR-PENDING-APPLY-VERIFICATION; push main.

ACCEPTANCE CRITERIA
A1. Migration exact per R1 (role column; users grants rebuilt with role/verified/phone excluded; 3 admin policies; chats untouched) — pasted full file + parse inventory.
A2. Self-promotion impossible — pasted the two live SQL attempts with their verbatim errors.
A3. admin.ts contract + /admin access-denied state — pasted file + browser evidence.
A4. Gates green both env states; byte delta stated — pasted.
A5. Merged with PENDING-APPLY-VERIFICATION; .env untracked; secret counts zero — pasted.

VERIFICATION (order): R1 file → parse → R6a self-promotion SQL attempts → R2/R3 code → R6b browser → gates → commit/merge.

STOP CONDITIONS
- ANY grant/policy construct that leaves users.role writable by anon/authenticated (test your own migration against this before reporting: attempt the self-promotion UPDATE as a test user AFTER applying 00005 in a local/branch check IF possible — otherwise prove by privilege inspection and say so).
- Any need for the service-role key in client code — absolute STOP.
- Byte delta > 20,000 B; gate failure; push rejection — BLOCKED with exact output.
- Any English in the /admin UI — BLOCKED (Bengali-only).

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A5/FULL MIGRATION SQL PASTED/SELF-PROMOTION PROOF PASTED/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
