# CHC-T-017 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-017
TITLE:           dP Relay OTP: Edge Function auth-otp + Supabase session on verify
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-015 (auth.ts + signup OTP steps + users-insert must exist)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: DECISIONS CHC-D-023 (gateway + architecture are DECIDED — implement, do not re-litigate); dP Relay public docs (contract below, fetched 2026-10-23); PRD §12.3 (phone = identity); AGENTS.md (secrets, bright lines, Bengali UI)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. NEVER print any secret: DP Relay appId/appSecret (owner's local file), the PAT, the anon key, any OTP value. Values flow file→env→code only.
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
The owner selected dP Relay (the project's own SMS gateway) as the OTP provider (CHC-D-023). dP Relay OWNS code generation and verification — Supabase's built-in phone OTP is not the delivery path. The flow: client → our Supabase Edge Function (the ONLY place dP Relay credentials live) → dP Relay send/verify → on verified, the function establishes a Supabase session so RLS auth.uid() works and the users_যোগ insert from CHC-T-015 keeps working. CHC-T-015's client wiring stays; only its real-path backend swaps from supabase-js OTP to this function. The demo fallback (no client/env) is untouched.

DP RELAY CONTRACT (pinned from owner-supplied authenticated integration docs, 2026-10-23 — authoritative over the public docs)
- Headers: X-App-Id, X-App-Secret (server-side only). All bodies JSON. Every failure response carries { ok, error, code }.
- POST {BASE}/v5/otp/send   body {phone: "+880…"} → 201 {ok, sessionId, expiresAt} (unix seconds). Each send consumes one OTP credit; 402 insufficient_credits at zero balance.
- POST {BASE}/v5/otp/verify  body {phone, otp} → 200 {ok, verified}. Failures: 400 otp_expired (no active session / TTL passed) · 423 otp_locked (too many attempts — response includes retryAfterSec) · 400 invalid_otp_format | invalid_phone.
- GET  {BASE}/v5/otp/status?phone=%2B880… → {ok, status: pending|verified|expired, expiresAt, attemptsLeft, lockedUntil, verifiedAt}; 404 not_found when no session was requested.
- 429 rate_limited (per-app per-number) · 429 resend_cooldown (per-number).
- ⛔ FORBIDDEN in app code: ANY /v5/billing/* endpoint (account top-up flow: packages → credits/request {packageCode} → bKash Send Money → credits/submit-trx {transactionId, trxId} → operator approval — this is the OWNER's operational procedure, recorded in DECISIONS CHC-D-026, never the app's).

OBJECTIVE
(1) Author supabase/functions/auth-otp (Deno Edge Function) proxying send/verify with the credentials from function env only, (2) on DP-Relay-verified, establish the Supabase session (mechanism: you research the current Supabase-documented pattern for custom-OTP-verified → session — consult the supabase skill and official docs; candidates include admin user get-or-create + session minting; REPORT which mechanism you used and why), (3) swap auth.ts's real path to call the function (demo path untouched), (4) gates green with byte delta stated, (5) commit/push/merge with ORCHESTRATOR-PENDING-DEPLOY. You AUTHOR ONLY — the orchestrator deploys the function and sets its secrets; no live OTP is sent from your machine.

SCOPE (the ONLY files you may create or modify)
- supabase/functions/auth-otp/index.ts — create (plus any small helper file inside that folder)
- apps/web/src/lib/auth.ts — modify (real-path send/verify now call the Edge Function; toE164 kept)
- apps/web/src/lib/bn.ts — ONLY if a genuinely new Bengali string is needed (resend-cooldown message likely)
- apps/web/src/routes/signup/+page.svelte — ONLY if the resend-button cooldown state needs a hook (disable resend until expiresAt per dP Relay resend_cooldown)
- Branch/commit/merge/push operations

OUT OF SCOPE
- Deploying the function or setting secrets (orchestrator)
- Any /v5/billing/* code · DP Relay dashboard actions · SMS gateway choice re-litigation
- package.json, .env, migrations, docs/orchestration/**, routes beyond signup

INPUTS (read first)
- apps/web/src/lib/auth.ts + signup/+page.svelte (post-CHC-T-015 state)
- supabase/migrations/00001_init.sql (users_যোग — the session must satisfy it)
- The supabase skill (load it) + official Supabase docs for the custom-OTP-session pattern

REQUIREMENTS (numbered; testable)
R1. Edge Function supabase/functions/auth-otp/index.ts:
    a. POST JSON {action: "send", phone} | {action: "verify", phone, otp}. Validate phone matches ^\+8801[3-9]\d{8}$ (E.164 BD) and otp is 4–8 digits before any upstream call.
    b. Reads DP_RELAY_API_BASE_URL, DP_RELAY_APP_ID, DP_RELAY_APP_SECRET from Deno.env (function secrets — never hardcoded). Missing env → 500 with a generic Bengali-safe JSON error {error:"config"}, no details leaked.
    c. send → DP Relay /v5/otp/send; return {ok, expiresAt} (DROP sessionId from the client response — server detail only).
    d. verify → DP Relay /v5/otp/verify; on verified:true → establish Supabase session for that phone (your researched mechanism, using SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from function env — the service key must appear ONLY here, never in the repo or client) and return the session access+refresh tokens (the standard Supabase session shape the client's setSession expects). On verified:false → 401 {ok:false, error:<dp error code>}.
    e. NEVER log OTP values, secrets, or tokens. NEVER call /v5/billing/*. Map upstream 429/402/423 to clean client errors (Bengali handled client-side); for 423 otp_locked, surface the wait from retryAfterSec (client shows a Bengali "try again in N minutes" state rather than a raw error).
R2. auth.ts real-path swap: sendOtp → invoke function send (fetch to `${SUPABASE_URL}/functions/v1/auth-otp` with the anon key Authorization header as Functions require; the URL/anon come from the existing env). verifyOtp → invoke function verify; on tokens returned → supabase.auth.setSession(accessToken, refreshToken); return {ok, user}. Demo path (null client) UNCHANGED. Keep the hasAuthClient semantics.
R3. Resend cooldown: signup step 2 disables the resend action until expiresAt (from the send response); Bengali cooldown text via bn.ts if needed.
R4. Evidence without deploying:
    a. `deno check supabase/functions/auth-otp/index.ts` if deno exists (paste); else tsc --noEmit is NOT valid for Deno — instead paste a careful manual audit: every env var referenced, every fetch URL built, no secret literals (grep for suspicious patterns and paste zero-match results).
    b. Unit-style proof of the phone/otp validators: small node script exercising the same regex logic inline — paste results for +8801700000000 (accept), 01700000000 (reject — E.164 required), +880170000000 (reject).
    c. auth.ts compile: npx tsc --noEmit on the file if configured; else rely on npm run build.
R5. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 with .env present AND with .env moved aside (both paths); byte delta vs the post-T-015 baseline (state the baseline T-015 established; this task's client delta should be near zero — the function is not bundled).
R6. Commit (explicit pathspec):
   feat(auth): dP Relay OTP via auth-otp Edge Function; session on verify

   Edge function proxies dP Relay send/verify (credentials in function
   secrets only; billing endpoints forbidden). On verified, mints a
   Supabase session so RLS auth.uid() holds. Client real path swaps to
   the function; demo fallback untouched. NOT deployed — orchestrator
   deploys + sets secrets.

   Refs: CHC-T-017
   Push task/CHC-T-017; merge --no-ff with ORCHESTRATOR-PENDING-DEPLOY; push main.

ACCEPTANCE CRITERIA
A1. Function validates input, drops sessionId, never logs secrets/OTP, never touches billing — verified by: pasted function source + the pattern greps.
A2. Session mechanism researched and documented; tokens returned in Supabase session shape — verified by: pasted explanation + code excerpt.
A3. auth.ts real path calls the function; demo path byte-identical behavior — verified by: pasted diff.
A4. Validator proofs pasted; deno check or manual audit pasted.
A5. Gates green both with and without .env; deltas stated — pasted.
A6. Merged with PENDING-DEPLOY; no secrets in any commit — pasted merge + status + a secret-pattern grep over the commit.

VERIFICATION (order): R1 → R2 → R3 → R4 → R5 → R6.

STOP CONDITIONS
- No documented Supabase pattern yields a session from server-side phone verification — STOP and report the candidates you found with why each fails; do not invent a crypto scheme.
- Function secrets would have to be committed in any form — STOP.
- Byte delta > 20,000 B on the client; any gate failure; push rejection — report BLOCKED with exact output.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/SESSION MECHANISM CHOSEN + WHY/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
