# CHC-T-019 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-019
TITLE:           OTP spend guard: durable per-phone/per-IP daily caps
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P1 (becomes P0 before ANY real credit top-up)
DEPENDS ON:      CHC-T-018 (main @ ef4d839)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: DECISIONS CHC-D-028 (deploy bare on sandbox; guard gates real money); RISKS CHC-R-017; dP contract CHC-D-026 (429 rate_limited shape)
OS / SHELL:      Windows 11 / PowerShell 7.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets.
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
The auth-otp Edge Function is live and proven (CHC-D-029) but OPEN: anyone holding the anon key (which ships in the app) can call send repeatedly, each accepted call consuming a paid dP credit — dP's own per-number cooldown does not cap aggregate spend (CHC-R-017). Owner directive: sandbox trial credits may be spent freely NOW; real credit top-ups are GATED on this guard shipping (CHC-D-028). No Turnstile — wrong UX for a 2G rural audience; escalation only if abuse appears.

OBJECTIVE
(1) Author migration 00004: a durable send-counter table denied to all client roles; (2) integrate atomic per-phone + per-IP daily caps into the function's send path BEFORE any dP call; (3) gates green; (4) commit/push/merge with ORCHESTRATOR-PENDING-REVIEW-DEPLOY. You AUTHOR — the orchestrator reviews, applies the migration, redeploys the function, and runs a zero-credit live proof.

SCOPE (the ONLY files you may create or modify)
- supabase/migrations/00004_otp_guard.sql — create (ADDITIVE ONLY)
- supabase/functions/auth-otp/index.ts — modify (guard in the send branch only)
- Branch/commit/merge/push

OUT OF SCOPE
- verify path (free — no guard), billing of any kind, client-side code, package.json, applying the migration or redeploying (orchestrator), docs/

INPUTS (read first)
- supabase/functions/auth-otp/index.ts (current flow: validate → dpডাক)
- supabase/migrations/00001_init.sql (style reference: additive, RLS pattern)
- docs/orchestration/DECISIONS.md CHC-D-028 (this task's mandate)

REQUIREMENTS (numbered; testable)
R1. Migration 00004_otp_guard.sql (additive, Bengali comments per convention):
    create table if not exists public.otp_sends (
      kind text not null check (kind in ('phone','ip')),
      key text not null,
      day date not null default (now() at time zone 'utc')::date,
      cnt integer not null default 0,
      primary key (kind, key, day)
    );
    alter table public.otp_sends enable row level security;
    -- ZERO policies: RLS enabled with no policies = deny-all for anon/authenticated;
    -- service-role (function) bypasses RLS. Add a comment stating exactly that.
    No grants beyond defaults. Nothing else in the file.
R2. Function guard in the send branch, AFTER the phone-regex check, BEFORE dpডাক:
    a. IP: first hop of x-forwarded-for, else x-real-ip, else 'unknown' (trim, cap length ~64 chars).
    b. day: new Date().toISOString().slice(0,10) (UTC day).
    c. Caps as named constants: ফোন_সীমা = 5 (per phone per day), আইপি_সীমা = 20 (per IP per day) — Bengali comments explaining they exist to cap spend, not user UX.
    d. Atomic increment for BOTH counters using the service client and
       INSERT ... ON CONFLICT (kind, key, day) DO UPDATE SET cnt = otp_sends.cnt + 1 RETURNING cnt
       (two statements — phone row, ip row). Note: Supabase JS supports .insert(...).select() but for ON CONFLICT+RETURNING use .upsert with ignoreDuplicates:false + count... CAREFUL: pick a supabase-js construct that genuinely produces ON CONFLICT DO UPDATE with RETURNING (document which construct you used; if supabase-js cannot express it, use a single RPC-free approach: .upsert({...}, { onConflict: 'kind,key,day', count: 'exact' }) is DO UPDATE semantics — verify by reading installed postgrest-js types and PASTE the chosen call).
    e. If either RETURNED cnt exceeds its cap → respond 429 { ok:false, error:'rate_limited' } (same shape dP uses so the client's existing 429 handling works unchanged). Blocked attempts still incremented (deliberate: brute-force gets no free retries; comment this).
    f. Only if both counters are within caps → proceed to dpডাক as today.
    g. Guard failure handling: if the counter DB call itself errors (table missing pre-migration, network) → FAIL OPEN with a console-free decision you can justify in one line (recommend: allow the send — availability over spend-capping during infra blips; dP's own limits remain behind). Document your choice in the report.
R3. verify branch: byte-for-byte untouched.
R4. Evidence: deno check exit 0 (paste); grep proving no dpডাক call precedes the guard in the send path (paste the line-number order); bright-line scan over the migration (zero cart|checkout|order|payment|escrow|refund|invoice|payout|fee|commission|transaction — paste); migration idempotent-safe (IF NOT EXISTS / no drops — paste file).
R5. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 (both env states; the function is not bundled — expect ~0 client delta; state it).
R6. Commit (explicit pathspec):
   feat(auth): durable OTP spend guard — per-phone/per-IP daily caps

   Migration 00004 adds a service-role-only counter table (RLS deny-all);
   auth-otp send path atomically increments phone+IP counters before any
   dP Relay call and returns 429 rate_limited past caps (5/phone/day,
   20/IP/day). verify untouched. NOT applied/deployed — orchestrator
   reviews, applies, redeploys, and runs the zero-credit proof.

   Refs: CHC-T-019
   Push task/CHC-T-019; merge --no-ff with ORCHESTRATOR-PENDING-REVIEW-DEPLOY; push main.

ACCEPTANCE CRITERIA
A1. Migration exact + additive + deny-all comment — pasted file.
A2. Guard order proven (validate → increment → cap-check → dpডাক) — pasted line-order evidence + the chosen upsert construct with type evidence.
A3. verify branch untouched — pasted diff showing zero changes in that branch.
A4. deno check + bright-line + gates — pasted; client delta stated.
A5. Merged with marker; no secrets — pasted.

STOP CONDITIONS
- supabase-js cannot express ON CONFLICT DO UPDATE + RETURNING after your reading of the installed types — STOP and report the candidates (do not hand-roll SQL injection paths or raw queries with string building).
- Any change to the verify path or client code — out of scope, stop.
- Byte delta > 2,000 B; gate failure; push rejection — BLOCKED with exact output.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A5/UPSERT CONSTRUCT CHOSEN + WHY/FAIL-OPEN JUSTIFICATION/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
