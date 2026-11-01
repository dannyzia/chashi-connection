# CHC-T-039 — FCM push notifications: new-post + new-message, Bengali-only, PRD §15-compliant

**Preamble (binding):**
You are A-IMP-1 (builder) on Chashi Connection. Read `AGENTS.md` first; its hard rules override this brief. Load `.agents/skills/rhizome-builder/SKILL.md`. Per CHC-D-047 all technical sequencing here is orchestrator-owned; your job is execution + evidence.

**PRD bright lines that bind this task (§15.3/§15.4):** notification text is **Bengali-only, always**; notifications are **never** about payment-related events (none exist — keep it that way); the **নতুন পোস্ট** and **চ্যাট বার্তা** toggles are ALWAYS ON and must render non-removable; the **মার্কেটিং** toggle defaults to **OFF**. Locked stack: `@capacitor/push-notifications` (the official Capacitor plugin) + FCM HTTP v1 — no other Firebase product, no other push SDK.

## Context

The app is a signed, installable release APK (CHC-T-038: `main` @ `08a2c6d`, cap-proven, minSdk 24 / targetSdk 36, package `com.chashi.connection`). The server layer is migrations 00001–00008 (23 policies). Push completes §15.3/§15.4. **The Firebase console side is owner-only** (Zia's Google account): the project, the Android app registration, `google-services.json`, and the service-account key. This brief is structured so everything builder-side lands NOW, with the live-send path proven as a dry run; the live E2E is Phase B after the owner's artifacts arrive.

## Objective

Token plumbing, the send-fcm Edge Function, the client wiring, the settings toggles, and the message-trigger path — all landed, gates green, APK rebuilt and re-capped — with FCM delivery proven in dry-run; live sends pending only the owner's Firebase artifacts.

## Scope (the ONLY files you may create/modify)

- `supabase/migrations/00009_push_tokens.sql` — create
- `supabase/functions/send-fcm/` — create (index.ts + any local module)
- `apps/web/src/lib/push.ts` — create
- `apps/web/src/routes/+layout.svelte` or the existing session-init path — modify (registration call only)
- `apps/web/src/routes/settings/+page.svelte` — modify (the notification section only)
- `apps/web/src/lib/bn.ts` — modify (new Bengali strings only)
- `capacitor.config.ts` — modify only if the plugin registration requires it
- `docs/orchestration/reports/CHC-T-039.md`, `docs/orchestration/LEDGER.md` (the CHC-T-039 row)

## Out of scope

- Any Firebase console action; committing `google-services.json` or ANY service-account material (they are secrets — if present locally, the Android build consumes them and they stay gitignored); live SMS or paid sends; changes to `logic/feed.ts` (locked) or any feed ranking; non-Bengali user-facing strings; marketing anythings beyond the default-OFF toggle.

## Requirements (each testable)

**R0 — Preflight (paste).** Does `apps/web/android/app/google-services.json` exist (YES/NO only — if YES, report its `project_id` field and nothing else)? Is `@capacitor/push-notifications` already in package.json? **If google-services.json is absent: run this brief in Phase-A mode** (everything below; the Android build skips google-services plugin if absent — state exactly how the build behaved) and end the report with the owner's one-time list.

**R1 — Migration 00009 (apply it; the 00007/00008 precedent stands).** Table `device_tokens`: id uuid pk default, user_id → users(id) ON DELETE CASCADE, fcm_token text UNIQUE NOT NULL, platform text CHECK in ('android'), created_at/updated_at timestamptz defaults; RLS ENABLE; policies: self-ALL (insert/select/update/delete where user_id = auth.uid()), no other role. Plus `ALTER TABLE users ADD COLUMN marketing_optin boolean NOT NULL DEFAULT false;`. Apply via apply_migration; report the policy count delta (expect 23 → 27: four device_tokens policies).

**R2 — Edge Function `send-fcm`.** Deno. Input: `{ target_user_id, kind: 'chat_message' | 'new_post', title_params?, body_params? }`. Behavior: auth check (Authorization must be the service key OR the internal pg_net secret — state which mechanism you implement and why in ≤2 lines); look up the target's tokens from device_tokens; build the FCM HTTP v1 payload per token with **Bengali-only text from a fixed map defined in the function** (chat_message → `{{sender}} নতুন বার্তা পাঠিয়েছেন`; new_post → `আপনার এলাকায় নতুন বিজ্ঞাপন: {{title}}`); send via the token endpoint using the service-account JSON read from env `FCM_SERVICE_ACCOUNT_JSON`. **Dry-run mode:** when that env is unset, do NOT attempt OAuth — return `{ dry_run: true, would_send: N, payloads: [first payload only, redacting any user content to placeholders] }` with exit 200. Deploy with `supabase functions deploy send-fcm` (no secret set). Paste the deploy output.

**R3 — Message trigger path.** Add to 00009 a trigger on `messages` AFTER INSERT: `EXECUTE` pg_net async POST to the send-fcm function URL with the target recipient id and kind chat_message (state how the function URL/secret reaches the trigger — a settings table row seeded by 00009 is acceptable; no secrets in SQL). Prove the trigger fires: in one rollback-wrapped transaction, insert a fixture chat+message (users/products untouched otherwise) and show pg_net's response row (net.http_response_entry or the function's dry-run receipt — paste what pg_net returns). Zero residue after rollback.

**R4 — Client wiring.** `apps/web/src/lib/push.ts`: register on session-start ONLY when `Capacitor.isNativePlatform()` AND a session exists; request Android 13+ POST_NOTIFICATIONS permission AFTER login; upsert the token into device_tokens through RLS (anon client + session). Notification tap: route to the chat/listing by the payload's data fields (state the route mapping). All strings via `bn.ts`. Paste the push.ts registration flow (your code, ≤40 lines).

**R5 — Settings toggles (§15.4).** In the settings route add a notifications section: `নতুন পোস্ট` and `চ্যাট বার্তা` rendered ALWAYS ON and non-interactive (visually on, disabled input, label `সবসময় চালু — বন্ধ করা যাবে না`), and `মার্কেটিং` bound to `users.marketing_optin` defaulting OFF (self-update through RLS; report the update path). Bengali-only.

**R6 — Gates + APK re-cap.** From `apps/web`: validate → ALL CHECKS PASSED; `npm run build` → exit 0 (43+ files; state bytes + method). Rebuild the signed release APK: `.\gradlew clean assembleRelease` → paste per-ABI bytes; `python scripts/check_apk.py --root android/app/build/outputs/apk/release` → **exit 0**; state the delta vs CHC-T-038's 3,747,106 / 3,384,440 and attribute it (the push plugin + google-services). If the gate exits 1 → STOP, report sizes.

**R7 — Land.** Branch `task/CHC-T-039`; commits `type(scope): subject` + `Refs: CHC-T-039`; merge `--no-ff`; push; paste the merge SHA + `git ls-remote`. Bright-line scan on ADDED LINES only (CHC-D-045/046 interpretation); no secret values anywhere in committed text.

## Stop conditions

- Any Firebase console requirement → do NOT attempt; it is owner-only. Record it in the owner list instead.
- Gate exit 1 after the APK rebuild → STOP with sizes.
- Any notification string not Bengali, or any payment-adjacent notification concept → STOP (bright line).
- R3's trigger proves unremovable/unexplained → report the pg_net error verbatim; do not improvise an alternative transport.

## Report format

`=== TASK REPORT ===` / TASK ID: CHC-T-039 / STATUS (DONE if Phase-A complete; PARTIAL if R0 lacked google-services.json — which is EXPECTED and fine) / SUMMARY (≤5 lines) / FILES CHANGED / COMMANDS RUN / R0–R7 with one-line evidence / **OWNER ONE-TIME LIST** (the exact Firebase steps only the owner can do) / **WEB ASSETS + APK per-ABI bytes** / DEVIATIONS / ASSUMPTIONS / OPEN ISSUES / QUESTIONS: exactly one, or "none" / `=== END REPORT ===`
