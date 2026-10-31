# CHC-T-035 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-035
TITLE:           Admin stage 2: audit-log review, report counts, user verification management
ASSIGNED TO:      A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-028 (admin stage 1 — main @ 7b92712 base), CHC-T-029/030 (admin_audit table LIVE with the INSERT-only policy)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §12.4 (the admin queue: sorted by report count + recency; every admin action logged), §12.3 (verified badge); AGENTS.md (bright lines, Bengali-only); DECISIONS CHC-D-016/031 (the explicit-grant + typed-RPC patterns you must mirror)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (tokens, keys, .env, the PAT — variables/digests only).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
The admin dashboard (CHC-T-028) is a stage-1 skeleton: the reports queue + hide/unhide only. Three gaps are open, all owner-visible: (1) the admin_audit table (live since T-029/030) has NO review UI and NO admin read path (INSERT-only grant; reads deny-all — the operator cannot see the log he is required to keep); (2) listings show no report counts and no auto-hidden badge (the operator cannot see WHY a listing is hidden or HOW MANY reports it has); (3) user verification management (PRD §12.3 verified badge) has no path — the users UPDATE grant excludes verified for authenticated (by design: self-verification would be spoofable), so verification writes need a SECURITY DEFINER RPC gated on the caller's admin role (the proven CHC-T-019 RPC pattern). The users.verified column exists (default false, unused). The PRD §12.4 queue sort (report count desc + recency) is also missing.

OBJECTIVE
(1) Migration 00007: the audit read path for admins (SELECT grant + admin row policy), the typed RPC set_user_verified (admin-gated, definer), (2) the dashboard expanded to four sections: রিপোর্ট তালিকা (with per-target report counts), পণ্য তালিকা (report counts + auto-hidden badge + one-click প্রকাশ), অডিট লগ (newest first), ব্যবহারকারী তালিকা (verify toggle), (3) §12.4 queue sort on the products list, (4) gates + bytes, (5) merged with ORCHESTRATOR-PENDING-APPLY-VERIFICATION. You AUTHOR — the orchestrator reviews, applies 00007, and verifies live.

SCOPE (the ONLY files you may create or modify)
- supabase/migrations/00007_admin_stage2.sql — create (ADDITIVE ONLY)
- apps/web/src/lib/admin.ts — modify (new fetch/write helpers)
- apps/web/src/routes/admin/+page.svelte — modify (the four-section dashboard)
- apps/web/src/lib/bn.ts — modify (admin UI Bengali strings)
- Branch/commit/merge/push

OUT OF SCOPE
- logic/feed.ts, routes/+page.svelte (the feed), auth.ts, supabase.ts, app-state.svelte.ts, chat routes, the Edge Function, migrations beyond 00007, docs/, android/, package.json
- User ban/delete, FCM, AI, realtime, any admin USER-CREATE (verification toggle only)
- Any service-role key in client code (the RPC handles privileged writes server-side)

INPUTS (read first)
- supabase/migrations/00005_admin.sql — the admin policies pattern (your 00007 policies mirror it)
- supabase/migrations/00006_moderation_enforcement.sql — the admin_audit schema (columns: actor, action, target_type, target_id, details jsonb, created_at) + the explicit-grant pattern
- supabase/migrations/00004_otp_guard.sql — the typed-RPC pattern (SECURITY DEFINER, pinned search_path, revoke PUBLIC, role check inside)
- apps/web/src/lib/admin.ts — the existing helpers (hasAdminRole, fetchAllReports, fetchProductsAdmin, setHidden)
- apps/web/src/routes/admin/+page.svelte — the current two-section dashboard (expand to four)
- apps/web/src/lib/bn.ts — existing admin strings (অপারেটর প্যানেল, রিপোর্ট তালিকা, সাপ্তাহিক পণ্য — reuse; new: অডিট লগ, ব্যবহারকারী তালিকা, যাচাইকৃত toggle labels)

REQUIREMENTS (numbered; each testable)
R1. Migration 00007_admin_stage2.sql (additive, Bengali comments per convention):
    a. Admin read path on admin_audit: grant select on table public.admin_audit to authenticated; create policy অ্যাডমিন_কর্ম_লগ_পঠন on public.admin_audit for select to authenticated using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')) — admins read all rows; non-admins read none (zero-policy deny-all stays for them).
    b. Typed RPC public.set_user_verified(p_user_id uuid, p_verified boolean): SECURITY DEFINER, set search_path = public; internally checks the CALLER's role='admin' (select role from public.users where id = auth.uid()) — non-admin callers raise exception 'অনুমতি নেই' (Bengali message, SQLSTATE 'P0001'); then updates public.users set verified = p_verified where id = p_user_id, returning the row. revoke execute on function from public; grant execute to authenticated. Comments: why definer (the verified column is not granted to authenticated — self-verification prevention), why the caller check (the grant is role-wide; the policy is per-caller).
    c. Nothing destructive; additive only; idempotent-safe (create or replace / if not exists / drop-if-exists only on NEW objects).
R2. admin.ts new helpers (null-safe, never throw, mirroring the existing pattern):
    a. fetchAuditLog(): .from('admin_audit').select('id, actor, action, target_type, target_id, details, created_at').order('created_at', {ascending:false}).limit(100) — works for admins via the 00007 read policy; non-admins → [] (fail-closed).
    b. fetchAllUsers(): .from('users').select('id, phone, name, label, role, verified, created_at').order('created_at', {ascending:false}).limit(100) — admin sees all via users_পঠন_প্রমাণিত (already authenticated-wide); non-admins also see all (the existing policy is authenticated-wide — document this in the report: the user list is visible to any signed-in user; if the owner wants it admin-only, that's a policy change deferred).
    c. setUserVerified(userId, verified): .rpc('set_user_verified', { p_user_id: userId, p_verified: verified }) — returns {ok} never throws.
    d. fetchReportCounts(): .from('reports').select('target_id, category, created_at') (admin reads all via 00005) → client-side group by target_id → a Map<target_id, count>. The dashboard renders the count per product.
R3. Dashboard expansion (Bengali, four sections, plain CSS per the locked stack):
    a. রিপোর্ট তালিকা — existing (keep).
    b. পণ্য তালিকা — each product row gains: the report count badge (from fetchReportCounts), an "স্বয়ংক্রিয়ভাবে লুকানো" badge when auto_hidden_at is set, and a one-click প্রকাশ button calling setHidden(id, false) (which already clears auto_hidden_at per T-029's admin.ts).
    c. অডিট লগ — new section: actor id, action, target_type, target_id, created_at (newest first, 100 rows).
    d. ব্যবহারকারী তালিকা — new section: phone, name, label, role, verified badge, and a verified toggle per user calling setUserVerified (skip your own row — an admin cannot demote/verify self via the toggle; disable the toggle on your own row and document).
    e. The products list sorted by report count desc, then created_at desc (the PRD §12.4 queue sort) — client-side sort after both fetches resolve.
    f. Non-admin access → the existing অ্যাক্সেস নেই state (unchanged); the four sections render only for admins.
R4. Zero changes: logic/feed.ts, app-state.svelte.ts, supabase.ts, chat routes, auth.ts, the function, .env handling, package.json.
R5. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 with .env and env-less; byte delta vs the current main baseline (rebuild parent if needed) — expect < 10,000 B (the dashboard expansion); state it.
R6. Evidence (paste, no tokens/values):
    a. Migration parse (pgsql-parser --no-save + prune + lock-hash-unchanged) — paste PARSE OK + statement inventory.
    b. tsc on changed modules → exit 0.
    c. Browser (with env, as a NON-admin session if obtainable, else env-less): /admin renders the four sections (the admin-gated sections empty for non-admins — the policies fail-closed) — paste console/network evidence proving zero data leakage to non-admins (the reports/audit/users fetches return [] via RLS/policies).
    d. The RPC and policies verified via Management API SQL (the orchestrator applies 00007 — you prove via a rolled-back transaction on the real schema): the privilege matrix (authenticated: admin_audit SELECT=true/INSERT=true/UPDATE=false/DELETE=false; users UPDATE column-scoped excluding role/verified/phone), set_user_verified exists with SECURITY DEFINER + pinned search_path + EXECUTE revoked from PUBLIC, the caller check raises for non-admins (paste the raised exception verbatim from a rolled-back test as a non-admin session context), and the positive control: set_config('request.jwt.claims', <admin uid>) + set local role authenticated → the RPC succeeds (paste the returned row).
R7. Commit (explicit pathspec):
   feat(admin): stage 2 — audit review, report counts, user verification management

   Migration 00007: admins read the audit log (grant + admin SELECT policy);
   typed RPC set_user_verified (admin-gated definer — the verified column is
   not self-writable by design). Dashboard: four sections (reports, products
   with report counts + auto-hidden badge + one-click প্রকাশ, audit log,
   users with verify toggle); PRD §12.4 queue sort. NOT applied — the
   orchestrator applies and verifies live.

   Refs: CHC-T-035
   Push task/CHC-T-035; merge --no-ff with ORCHESTRATOR-PENDING-APPLY-VERIFICATION; push main.

ACCEPTANCE CRITERIA
A1. Migration exact per R1 — pasted full file + parse inventory + the rolled-back privilege matrix (the A2-style matrix from CHC-T-013's report).
A2. Self-promotion + self-verification both impossible — pasted the verbatim errors (the UPDATE role test AND the INSERT-with-verified test AND the RPC-as-non-admin test).
A3. admin.ts four helpers null-safe — pasted file + tsc.
A4. Dashboard four sections, Bengali-only, admin-gated render — pasted diff excerpts + browser evidence.
A5. §12.4 queue sort in the products section — pasted the sort code excerpt.
A6. Gates green both states; byte delta stated — pasted.
A7. Merged with PENDING-APPLY-VERIFICATION; .env untracked; secrets zero — pasted.

VERIFICATION (order): migration file → parse → rolled-back live trials (the privilege matrix + RPC tests) → code → tsc → gates → build → browser → commit/merge.

STOP CONDITIONS
- ANY construct that leaves users.role or users.verified writable by anon/authenticated (self-promotion/self-verification) — absolute STOP; report the construct you found instead.
- The RPC caller check cannot distinguish admins (no users-role read path in the definer context) — STOP and report the limitation.
- Migration 00005's grants conflict with R1's rebuild — STOP and report the exact conflict.
- Byte delta > 10,000 B; gate failure; push rejection; any English in the /admin UI — BLOCKED with exact output.
- Any change to logic/feed.ts, app-state.svelte.ts, supabase.ts row types, chat routes, auth.ts, package.json — BLOCKED (out of scope).

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A7/FULL MIGRATION SQL PASTED/PRIVILEGE MATRIX PASTED/RPC TESTS PASTED/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
