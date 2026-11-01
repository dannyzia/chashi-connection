# CHC-T-042 — On-device proof: install, login, live push delivery, offline SQLite round trip

**Preamble (binding):**
You are A-IMP-1 (builder) on Chashi Connection. Read `AGENTS.md` first; its hard rules override this brief. Load `.agents/skills/rhizome-builder/SKILL.md`. **Context updates that supersede anything older in your context:** T-041's R3–R5 are DONE (the orchestrator set `FCM_SERVICE_ACCOUNT_JSON` via the Management API, enabled `push_config` — endpoint + 64-hex secret + enabled=true — and proved the live OAuth2→FCM handshake; its PARTIAL report is a stale snapshot, reconciled in CHC-D-051). Do NOT run `supabase login` or ask for credentials — nothing is blocked.

**Device:** the owner's phone is open for wireless debugging at `192.168.0.234:42817` (same LAN). The owner is physically present and will cooperate at the marked points.

**PRD target:** §16.1 offline draft-and-flush + §15.3 real notification delivery — the two faces that have never touched real hardware.

## Objective

On the real device: install, login, receive a real FCM push (delivery proven from the device's own notification state), and run the offline draft → queued → flush round trip end-to-end.

## Scope (the ONLY files you may create/modify)

- `docs/orchestration/reports/CHC-T-042.md` — create
- `docs/orchestration/LEDGER.md` — the CHC-T-042 row (and the CHC-T-006 row: mark it superseded/closed by this task)

## Out of scope

- Any code, schema, APK, or config change; UI automation frameworks; `run-as` DB introspection (release builds are not debuggable — behavioral proof only); printing OTP codes or message bodies in the report (redact to shape).

## Requirements (each testable)

**R0 — Device attach (paste).** `adb connect 192.168.0.234:42817` → connected; `adb devices` → the device listed; `adb shell getprop ro.product.model ro.build.version.release ro.product.cpu.abi` → paste (expect arm64-v8a). If connect fails: retry once, then STOP and report BLOCKED (the phone may have slept — ask the owner to re-open wireless debugging).

**R1 — Install.** `adb install -r apps/web/android/app/build/outputs/apk/release/app-arm64-v8a-release.apk` → Success; `adb shell pm list packages | grep chashi` → the package. State the ABI you chose and why.

**R2 — Login (OWNER COOPERATION POINT 1).** Launch the app (`adb shell monkey -p com.chashi.connection -c android.intent.category.LAUNCHER 1`). Ask the owner to complete signup/login on the phone — **the OTP costs 1 dP Relay credit (pre-authorized for E2E proofs)**. Then verify server-side (Management API): `device_tokens` has a row whose user_id = the owner's uid `101c646b-e74e-426c-9a0e-3329fe7ad151` with a non-empty fcm_token (paste: row count for that uid + token length only, never the token).

**R3 — LIVE PUSH DELIVERY (the §15.3 proof).** Via SQL: fixture sender user + a chat with the OWNER as receiver + a message insert (Bengali body — the trigger's title/body map fires) → pg_net → send-fcm → FCM → the owner's real token. Wait ~8s, then capture the delivery ON THE DEVICE: `adb shell dumpsys notification --noredact | grep -A 12 chashi` (or the equivalent) → paste the notification entry (title `চাষী কানেকশন`, Bengali body, `com.chashi.connection`). Ask the owner to confirm visually (one word back). Then `net._http_response` latest row → paste status + `{"ok":true,"sent":1,...}` shape. **`sent:0/failed:1` here = DELIVERY FAILED → STOP and report.**

**R4 — OFFLINE SQLITE ROUND TRIP (the §16.1 proof, closes CHC-T-006).**
1. `adb shell cmd connectivity airplane-mode enable` → verify offline: `adb shell ping -c 1 -W 2 8.8.8.8` fails (paste).
2. OWNER COOPERATION POINT 2: in the app (offline), create a listing — title `অফলাইন পরীক্ষা`, price `10`, unit default — and post it. The app must queue it locally (SQLite).
3. Kill + relaunch offline: `adb shell am force-stop com.chashi.connection` → relaunch → the listing is still visible in the app (owner confirms). **Persistence across process death, offline = proven.**
4. `adb shell cmd connectivity airplane-mode disable` → wait ~15s for the flush.
5. Server-side: the product row EXISTS (`title = অফলাইন পরীক্ষা`, seller = the owner's uid) — paste the row count + id only. **Offline draft → local SQLite → online flush → server row = the round trip, end-to-end.**
6. Cleanup: delete the test product server-side (Management API), owner deletes it device-side if it still shows; airplane-mode stays OFF.

**R5 — Logout token lifecycle, live (closes T-040's open item #1).** OWNER COOPERATION POINT 3: the owner logs out in the app → server-side: `device_tokens` rows for the owner's uid → **0** (paste). Then the owner logs back in (a second OTP — 1 more credit, authorized) → the row returns (paste count). If the owner prefers to skip the re-login: acceptable — mark the final state as logged-out and note it.

**R6 — Land.** Branch `task/CHC-T-042`; commits per format + `Refs: CHC-T-042`; merge `--no-ff`; push; paste the merge SHA + `git ls-remote --heads origin main`. Bright-line scan on added lines only.

## Acceptance + verification (paste real output, in order)

R0's connect/props; R1's install + package; R2's token-row check; R3's device notification entry + `sent:1` + the owner's visual confirm; R4's offline ping fail → offline persistence → server row; R5's token-row delete/return; R6's merge SHA + ls-remote + `git status --short apps/web supabase docs` → EMPTY.

## Stop conditions

- `adb connect` fails twice → BLOCKED (owner re-opens wireless debugging).
- R3 `sent:0` → STOP, report the FCM outcome verbatim (a real failure on a real token is a finding, not noise).
- R4's flush does not produce the server row → STOP, report (that is the T-006 defect surfacing — report it, do not fix).
- Any OTP code or message body about to enter the report → redact to shape.

## Report format

`=== TASK REPORT ===` / TASK ID: CHC-T-042 / STATUS / SUMMARY (≤5 lines) / FILES CHANGED / COMMANDS RUN / R0–R6 with one-line evidence / **DEVICE: model + Android version + ABI** / **DELIVERY: notification captured on device (YES/NO)** / **ROUND TRIP: offline draft → server row (YES/NO)** / DEVIATIONS / ASSUMPTIONS / OPEN ISSUES / QUESTIONS: exactly one, or "none" / `=== END REPORT ===`
