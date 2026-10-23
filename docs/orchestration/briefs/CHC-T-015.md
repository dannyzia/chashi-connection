# CHC-T-015 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-015
TITLE:           Wire phone-OTP auth (Supabase) into signup with demo fallback
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-014 (migrations 00001+00002 LIVE: users/products/chats/messages/reports/blocks + RLS + needed_by + public_sellers)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §5.3 (signup flow), §12.3 (phone as identity); DECISIONS CHC-D-021 (users row MUST be inserted with the auth-generated uid); AGENTS.md (Bengali-only UI, offline-first, bright lines)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (PAT in ../.mcp.json; anon key in .env — read into variables only, never echoed, never pasted).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
The backend is live (6 tables, 18 policies, RLS) with a typed lazy client at src/lib/supabase.ts (getSupabase() → client or null). The signup flow's OTP steps are currently a demo (any 4 digits pass) because no auth existed. This task wires REAL phone-OTP via supabase.auth while PRESERVING the demo path when the client is null (CI, machines without .env, offline) — the app must never brick without env. Supabase's default phone OTP is 6 digits and E.164 (+880…); the app stores phones as 01XXXXXXXXX. The real SMS gateway (PRD names DP Relay) is an OWNER business item that does NOT block this task — Supabase test-project settings can deliver OTPs to real numbers later; for now the send-request success + typed verify path is the deliverable, with full end-to-end marked PARTIAL until a real number is configured.

OBJECTIVE
(1) Auth helpers module, (2) signup steps 1–2 use real OTP when a Supabase session path exists and the demo fallback when not, (3) first-login users-row insert keyed by auth.uid() per RLS, offline-queued on failure, (4) gates green with the first-real-import byte delta measured, (5) commit/push/merge with ORCHESTRATOR-PENDING-VERIFICATION.

SCOPE (the ONLY files you may create or modify)
- apps/web/src/lib/auth.ts — create
- apps/web/src/lib/supabase.ts — modify only if auth helpers are cleaner there (prefer separate auth.ts importing getSupabase)
- apps/web/src/routes/signup/+page.svelte — modify (steps 1–2 + step-5 server insert hook)
- apps/web/src/lib/app-state.svelte.ts — modify ONLY the client ব্যবহারকারী type (add optional id?: string) and nothing else
- apps/web/src/lib/bn.ts — modify ONLY if a new Bengali error string is genuinely needed (reuse existing ত্রুটি_ওটিপি first)
- Branch/commit/merge/push operations

OUT OF SCOPE
- Real SMS gateway / DP Relay (owner business item — arrives as a Decision Request later)
- users SELECT policy widening, 00003 anything, FCM, storage, realtime
- package.json (supabase-js already installed), .env, docs/orchestration/**, any route besides signup

INPUTS (read first)
- apps/web/src/lib/supabase.ts — the existing getSupabase() contract
- apps/web/src/routes/signup/+page.svelte — current steps 1–2 (OTP demo) and step 5 (লগইনকরুন)
- apps/web/src/lib/app-state.svelte.ts — ব্যবহারকারী type + লগইনকরুন
- supabase/migrations/00001_init.sql — users_যোগ policy (id = auth.uid()) your insert must satisfy

REQUIREMENTS (numbered; testable)
R1. src/lib/auth.ts exports: toE164(phone) (01XXXXXXXXX → +880XXXXXXXXX; return null for invalid), sendOtp(phone) (supabase.auth.signInWithOtp({ phone: toE164(phone) }); returns {ok, error?} — NEVER throws), verifyOtp(phone, token) (supabase.auth.verifyOtp({ phone, token, type: 'sms' }); returns {ok, user?, error?}), getSessionUserId() (current session user id or null). All functions null-safe: no client → { ok: false, error: 'no-client' } style results, no throws.
R2. Signup steps 1–2 rework:
    a. Step 1: keep the existing BD phone regex validation. If a Supabase client exists (probe via a new exported hasAuthClient() in auth.ts or similar — must not create the client eagerly beyond getSupabase's existing laziness): call sendOtp; on {ok:true} → step 2; on failure → show bn.ত্রুটি_ওটিপি (or a more precise existing string) and STAY on step 1. If no client (null): proceed to step 2 exactly as today (demo).
    b. Step 2: OTP input maxlength becomes 6 (Supabase default). If client exists: verifyOtp; success → step 3; failure → error, stay. If no client: accept any 4–6 digit input as today (demo).
    c. All new/changed user-facing text Bengali; no English leaks.
R3. Step 5 completion (after লগইনকরুন): if a Supabase session exists → insert into public.users via supabase-js: { id: session.user.id, phone, name, label, division, district, upazila, union: effective union (note: column is union_name on the server), village, lat, lng, detail } — the id MUST be the auth uid (RLS users_যোগ requires it). Handle "already exists" (unique phone / repeat login) as update-or-skip, not an error banner. If the network call fails (offline): সারিতেযোগ('প্রোফাইল', payload) so the existing sync queue retries later, and continue to the home feed — offline-first is non-negotiable. The local user object gains id?: string (session uid) when present.
R4. Evidence (no secrets printed):
    a. Node smoke: script in .tmp/ reading .env, using supabase-js directly to call signInWithOtp for the number 01700000000 (or any clearly-dummy BD number) → report ONLY the HTTP-ish outcome shape (e.g. "sendOtp success: true, error: null") — never any token/id values. This proves the project accepts OTP requests.
    b. verifyOtp full E2E: NOT required — document honestly that it needs a real number or test-OTP configuration; mark that sub-item PARTIAL in acceptance.
    c. Demo-path proof: run the build WITHOUT .env (move it aside as in CHC-T-013) — build green; then restore. Paste evidence the signup page still compiles with the fallback branches.
R5. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 WITH .env present — and report total bytes + delta vs 506,931: this is the FIRST real import of supabase-js, so state the exact growth and attribute it (auth-js etc. pulled by the bundler). If delta exceeds 150,000 B, stop and report before committing.
R6. Commit (explicit pathspec; .env never staged):
   feat(auth): real phone-OTP signup via Supabase with demo fallback

   Steps 1–2 call signInWithOtp/verifyOtp when a client exists; any-4-
   digits demo path preserved for env-less builds. First-login users row
   inserted with the auth uid (RLS users_যোগ); offline failure queues via
   সারিতেযোগ. First real supabase-js import — byte delta measured.

   Refs: CHC-T-015
   Push task/CHC-T-015; merge --no-ff with ORCHESTRATOR-PENDING-VERIFICATION; push main.

ACCEPTANCE CRITERIA
A1. auth.ts contract complete, null-safe, no throws — verified by: pasted file + tsc --noEmit on the new module.
A2. Signup rewired per R2 (client path real, fallback path intact, maxlength 6, Bengali-only) — verified by: pasted diff excerpts of steps 1–2.
A3. Step-5 users insert uses session uid; offline queues — verified by: pasted diff excerpt of the insert block + the queue branch.
A4. sendOtp smoke success shape pasted; verify E2E honestly PARTIAL; env-less build green — pasted.
A5. Gates green; FIRST-import byte delta measured and attributed — pasted.
A6. Merged; .env untracked — pasted merge + status.

VERIFICATION (order): R1 → R2 → R3 → R4 → R5 → R6.

STOP CONDITIONS
- sendOtp smoke fails with a non-network error you cannot explain in one line — report BLOCKED with the shape (no secrets).
- Byte delta > 150,000 B; any gate failure; RLS insert would require bypassing id=auth.uid() — STOP (that would break the trust model; report instead).
- Anything outside SCOPE needed — BLOCKED.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
