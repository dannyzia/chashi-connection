# CHC-T-041 — Phase B: Firebase-initialized APK + live FCM send path

**Preamble (binding):**
You are A-IMP-1 (builder) on Chashi Connection. Read `AGENTS.md` first; its hard rules override this brief. Load `.agents/skills/rhizome-builder/SKILL.md`. Per CHC-D-047 all technical sequencing is orchestrator-owned. **Secret discipline:** the service-account JSON and the trigger secret are secrets — never print, transcribe, or commit them; the build/config consumes them, not you.

## Context

CHC-T-039 proved the push chain in dry-run (trigger → send-fcm → 200/dry_run). Phase B turns on real delivery. Present state: `main` carries T-040 (verify `git log -1`); `apps/web/android/app/google-services.json` EXISTS on disk; the service-account key EXISTS at `.tmp/chashi-connection-firebase-adminsdk-fbsvc-ab7df1b0c4.json` (owner-placed, confirmed on disk); `push_config` is 1 row, enabled=false, endpoint+secret NULL; policies 27; release APKs from T-039: arm64 4,100,316 B / armeabi 3,737,060 B, gate exit 0. `applicationId` = `com.chashi.connection` — the google-services plugin validates the JSON against it at build time.

## Objective

The APK becomes Firebase-initialized, the FCM HTTP v1 send path is proven LIVE (real OAuth2 against Google's API, ending in the expected invalid-token error for a probe token), and `push_config` goes enabled — the system is then delivering real pushes to every registered device.

## Scope (the ONLY files you may create/modify)

- `apps/web/android/build.gradle` (project-level) — the google-services classpath line only
- `apps/web/android/app/build.gradle` — the `apply plugin: 'com.google.gms.google-services'` line only
- `docs/orchestration/reports/CHC-T-041.md`, `docs/orchestration/LEDGER.md` (the CHC-T-041 row)
- `.tmp/` — temp scripts; DELETE `.tmp/chashi-connection-firebase-adminsdk-fbsvc-ab7df1b0c4.json` after the secret is set and verified (report the deletion)

## Out of scope

- Any Firebase console action (owner-only); any other Gradle change; changes to `send-fcm`, `push.ts`, migrations, `logic/feed.ts`; printing the key contents, the trigger secret, or full fingerprints.

## Requirements (each testable)

**R0 — Preflight (paste).** (a) `git log -1 --oneline` (state the head — T-040 must be landed). (b) `apps/web/android/app/google-services.json` exists → report its `project_id` AND `package_name` fields ONLY (these are not secrets). (c) `git check-ignore -v apps/web/android/app/google-services.json` → exit 0 (the T-040 rule is active). (d) `.tmp/chashi-connection-firebase-adminsdk-fbsvc-ab7df1b0c4.json` exists (confirm YES/NO — it was owner-placed and confirmed on 2026-11-01). **If (d) is NO: execute R1–R2 and R6, skip R3–R5, and end the report with the one-line owner ask** — PARTIAL is the expected PASS in that case.

**R1 — Gradle plugin wiring.** Project-level: `classpath 'com.google.gms:google-services:4.4.2'` in the appropriate dependencies block (match the file's existing DSL — if it uses the `plugins` DSL instead, apply that form and state it). App-level: `apply plugin: 'com.google.gms.google-services'` at the bottom. Paste both diffs (≤10 lines each).

**R2 — Firebase-initialized rebuild + re-cap.** From `apps/web/android`: `.\gradlew clean assembleRelease` → BUILD SUCCESSFUL verbatim (the google-services plugin now parses/validates the JSON at build time). Bytes per ABI; then `python scripts/check_apk.py --root android/app/build/outputs/apk/release --variant release` → exit 0; state the delta vs T-039 (4,100,316 / 3,737,060) and attribute it (expect small: generated resources/values from the JSON). Gate exit 1 → STOP with sizes.

**R3 — Secret set (only if R0d = YES).** Flatten the JSON to a single valid JSON string and set it as the Supabase Edge Function secret `FCM_SERVICE_ACCOUNT_JSON` (mechanics your choice: `supabase secrets set` from stdin/env-file — never echo the value). Verify: `supabase secrets list` → paste the NAME list only (expect FCM_SERVICE_ACCOUNT_JSON present). Then DELETE `.tmp/fcm-service-account.json` and report the deletion. If the set command errors → paste the error verbatim (it must not contain the key material; if it does, STOP and report the exposure).

**R4 — push_config go-live.** Generate a 64-hex random secret locally (do not print it). `UPDATE push_config SET endpoint_url='https://bgnndfwksjukvhbpipxb.supabase.co/functions/v1/send-fcm', trigger_secret='<generated>', enabled=true;` → report: enabled=true, endpoint set, secret "set (64 hex)" — never the value. Note the consequence in the report: from this update, any real message insert dispatches real FCM sends (with only the owner as a user and zero real tokens registered, sends resolve to 0 tokens — harmless).

**R5 — LIVE FCM handshake proof (only if R3 executed).** The full chain against Google's API: (a) insert a probe user + a probe `device_tokens` row with fcm_token = a syntactically-fake string (e.g. `probe-live-token-<random>`); (b) insert a fixture chat + message from the probe sender to the probe recipient → the trigger fires → pg_net → send-fcm → NOW with the secret: real OAuth2 token mint → FCM HTTP v1 POST → Google rejects the fake token with a structured error; (c) wait, then paste the latest `net._http_response` row: status_code + the response body's per-token outcome (expect a 4xx with Google's wording like `The registration token is not a valid FCM registration token` or `UNREGISTERED`/`INVALID_ARGUMENT` — paste verbatim; this error PROVES auth minting, API reachability, and payload acceptance); (d) cleanup in order → zero residue (users=1, device_tokens=0, chats/messages=0, push_config STILL enabled=true).

**R6 — Land + device handoff.** Branch `task/CHC-T-041`; commits per format + `Refs: CHC-T-041`; merge `--no-ff`; push; paste the merge SHA + `git ls-remote`. Then the report ends with the exact device-delivery handoff text: install `app-arm64-v8a-release.apk` on the owner's phone, log in, and the orchestrator will fire a real message at the owner's user for the §15.3 delivery proof.

## Acceptance + verification (paste real output, in order)

1. R0's four preflight lines.
2. R1's two diffs.
3. R2's build result, per-ABI bytes, gate output, delta attribution.
4. R3's secrets-list NAME list + the key-file deletion report (skip if R0d = NO).
5. R4's enabled state report.
6. R5's response row (skip if R0d = NO).
7. R7's merge SHA + `git ls-remote` + `git status --short apps/web supabase docs` → EMPTY.

## Stop conditions

- Build failure on google-services validation (JSON `package_name` ≠ `com.chashi.connection`) → STOP, paste the verbatim error plus the JSON's package_name (not a secret) — the fix is an owner console edit or a brief correction, decided by the orchestrator.
- FCM auth failure (401 from Google's OAuth/token endpoint, or a permissions error) → paste verbatim, STOP, report BLOCKED (console-side enablement needed).
- Any secret value about to enter the report or a commit → redact/STOP per the standing rule.
- Gate exit 1 → STOP with sizes.

## Report format

`=== TASK REPORT ===` / TASK ID: CHC-T-041 / STATUS / SUMMARY (≤5 lines) / FILES CHANGED / COMMANDS RUN / R0–R6 with one-line evidence / **APK per-ABI bytes + delta vs T-039** / DEVIATIONS / ASSUMPTIONS / OPEN ISSUES / QUESTIONS: exactly one, or "none" / `=== END REPORT ===`
