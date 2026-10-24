# CHC-T-017 — Task Report (archived from builder relay, 2026-10-23)

> Orchestrator postscript (CHC-D-028): function reviewed from disk → APPROVED (secrets env-only, zero logging, sessionId withheld, billing untouched, validation before upstream) → DEPLOYED via CLI, secrets set with digest verification → live-proven at zero credits (OPTIONS 204, invalid-phone 400 short-circuit before dP) → E2E closed with owner's real number+OTP (CHC-D-029). DONE — FUNCTION LIVE.

```
=== TASK REPORT ===
TASK ID: CHC-T-017 | AGENT ID: A-IMP-1 | STATUS: DONE — ORCHESTRATOR-PENDING-DEPLOY

SUMMARY: supabase/functions/auth-otp/index.ts (Deno, 180 lines) proxies dP Relay /v5/otp/{send,verify} with credentials from function env only, validates before any upstream call (E.164 BD regex, OTP 4–8 digits), drops sessionId from the client response, never logs OTP/secrets (zero console.* — grep's only hit is the comment saying so), never touches /v5/billing/* (only the forbidding comment), and on verified:true mints a real GoTrue session: admin.createUser (get-or-create, email_exists = normal repeat login) → admin.generateLink({type:'magiclink'}) → hashed_token → verifyOtp({token_hash}) → genuine session (access+refresh+expires_in+bearer). auth.ts real path POSTs to functions/v1/auth-otp with apikey+Bearer anon and adopts setSession; demo path untouched. Resend affordance with expiresAt cooldown added.

SESSION MECHANISM CHOSEN + WHY: generateLink is EMAIL-ONLY (confirmed in installed auth-js 2.118 types — GenerateLinkType has no phone); NO admin session-minting exists in GoTrueAdminApi (grep: signOut/generateLink/createUser/listUsers/getUserById/updateUserById/deleteUser only). verifyOtp({token_hash}) is the documented exchange for generated links and returns a REAL session — no JWT signing of our own, no password stored. Consequence: GoTrue identity = phone-derived internal email (880XXXXXXXXXX@otp.chashi.local, never sent/shown); real phone remains public.users.phone (unique) as the app identity.

KEY EVIDENCE: deno check exit 0 (Deno 2.9.7 present) · validator script 13/13 PASS · build 741,410 B with env / 740,885 env-less · both paths browser-verified (env-ful: live signInWithOtp round-trip → phone_provider_disabled Bengali failure; env-less: demo step 1→2 no network) · merged d874519, pushed.

BYTE ACCOUNTING: 741,410 B with env (+3,160 vs T-015's 738,250 — fetch/cooldown logic in the route chunk); env-less 740,885 (+2,635). Function = zero app bytes.

DEVIATIONS: (1) VITE_SUPABASE_URL/ANON read directly in auth.ts (supabaseUrl is protected; supabase.ts out of scope — same names); (2) resend button added (R3 implies it; none existed); OTP maxlength→8/placeholder ৪–৮ per dP 4–8 contract; (3) apikey header sent alongside Bearer; (4) browser verification beyond build-only evidence.

OPEN ISSUES: (1) NOTHING DEPLOYED — env-ful builds fail CLOSED until deploy+secrets (browser-proven: OPTIONS 404); releases stay env-less until then; (2) credit-burn surface: anon key ships → send callable by anyone; dP per-number limits don't cap aggregate spend → spend-guard QUESTION (answered by orchestrator: bare deploy on trial, guard task gates real top-ups — CHC-D-028/CHC-R-017); (3) no supabase/config.toml (verify_jwt deploy-default); (4) GoTrue users carry no phone identity (deliberate); duplicate-phone protection via public.users.phone unique post-step-5; (5) lifecycle issues → T-018.

QUESTIONS: spend-guard ruling (answered)
=== END REPORT ===
```
