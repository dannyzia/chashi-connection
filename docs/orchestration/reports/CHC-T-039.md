# CHC-T-039 — FCM push notifications: new-post + new-message, Bengali-only, PRD §15-compliant

**Task:** CHC-T-039 · **Agent:** A-IMP-1 (builder, via relay) · **Date:** 2026-11-01
**Base:** `main @ 3b56589` = `origin/main` · **Branch:** `task/CHC-T-039` · **Outcome:** Phase-A complete

```
=== TASK REPORT ===
TASK ID: CHC-T-039
STATUS:  PARTIAL — Phase-A complete by design (R0 had no google-services.json, which the
         brief states is EXPECTED). R1–R6 PASS. R7 landing evidence below.
SUMMARY: device_tokens (4 self-only policies, 23→27), users.marketing_optin (granted through
         00005's column restrictions), and a push_config row with NO secrets seeded. send-fcm
         deployed ACTIVE (v1) with its own auth and a dry-run path. The messages trigger was
         PROVEN end-to-end: pg_net returned 200 with dry_run:true, would_send:1 and
         Bengali-only text. Client registration + tap routing wired; §15.4 settings section
         built. Signed release APK rebuilt, gate exit 0 (arm64 4,100,316 B / armeabi 3,737,060 B).
FILES CHANGED: supabase/migrations/00009_push_tokens.sql (new), supabase/functions/send-fcm/index.ts (new),
         apps/web/src/lib/push.ts (new), apps/web/src/routes/settings/+page.svelte (new),
         apps/web/src/routes/+layout.svelte, apps/web/src/lib/bn.ts,
         apps/web/package.json + package-lock.json (push plugin),
         apps/web/android/app/capacitor.build.gradle + capacitor.settings.gradle (cap sync),
         docs/orchestration/reports/CHC-T-039.md, docs/orchestration/LEDGER.md
WEB ASSETS: 45 files / 778,960 B — method: rm -rf build && npm run build, then a recursive
         node walk summing fs.statSync().size over every regular file (43 / 771,752 B before)
APK (release, signed): arm64-v8a 4,100,316 B · armeabi-v7a 3,737,060 B · gate exit 0
=== END REPORT ===
```

---

## R0 — Preflight — **PASS (Phase-A mode)**

```
google-services.json : ABSENT
@capacitor/push-notifications in package.json : NO (before this task)
```

Both answers select Phase-A per the brief. The owner's Firebase console work has not happened yet,
so there is no project, no Android app registration, no `google-services.json`, and no
service-account key available. Everything builder-side is landed; the live send is the only
missing step and it is owner-gated.

**How the Android build behaved without `google-services.json`:** it succeeded unchanged.
`app/build.gradle` never applies the `com.google.gms.google-services` plugin, so the push plugin's
`firebase-messaging` dependency links into the APK (`BUILD SUCCESSFUL in 4m 23s`,
`Task :capacitor-push-notifications:bundleReleaseAar`) while no Firebase app is registered. The
consequence is precise and worth recording: **`PushNotifications.register()` will fail at runtime
until `google-services.json` exists** — the token path is inert, not broken. Nothing crashes; the
launch listener simply never fires.

## R1 — Migration 00009 — **PASS**

Applied via `apply_migration` (name `push_tokens`, `{"success":true}`). Verified live:

```
policies                 : 27      (was 23 — +4, exactly the device_tokens self-policies)
device_tokens policies   : public.device_tokens_নিজের_পঠন | public.device_tokens_নিজের_মুছে_ফেলা
                           | public.device_tokens_নিজের_যোগ | public.device_tokens_নিজের_হালনাগাদ
push_config rows         : 1       (id='default', enabled=false, endpoint=NULL, secret=NULL)
messages trigger         : messages_পুশ
pg_net extension         : installed (1) — http_post resolves at net.http_post
```

Four independent parts, as required:

1. **`device_tokens`** — `id` uuid pk default, `user_id` → `users(id)` ON DELETE CASCADE,
   `fcm_token` text UNIQUE NOT NULL, `platform` CHECK in ('android') default 'android',
   `created_at`/`updated_at`. RLS enabled; `revoke all` from anon **and** authenticated, then four
   column-free grants to authenticated only. **anon has no access at all** — a token cannot be
   registered before login, so anon has no legitimate use for the table.
2. **`users.marketing_optin`** — `boolean not null default false`. This needed two extra lines:
   00005 revoked everything on `users` and re-granted explicit column lists, so a new column would
   have been **invisible and unwritable** to the client (SELECT grant lists are per-column too).
   Added `grant select (marketing_optin)` and `grant update (marketing_optin)` to authenticated.
   `role`/`verified`/`phone` stay closed, exactly as 00005 intended.
3. **`push_config`** — one row, **no policies**, `revoke all` from anon+authenticated, so only
   service_role (which bypasses RLS) can read it. Both `endpoint_url` and `trigger_secret` are
   seeded **NULL** and `enabled=false`: **this file contains no secret**, and an incomplete config
   makes the trigger silent by construction.
4. **`messages_পুশ`** — AFTER INSERT for each row, `EXECUTE public.বার্তা_পুশ_পাঠাও()`, a
   SECURITY DEFINER function revoked from public/anon/authenticated (triggers execute regardless
   of EXECUTE privilege, so the revocation costs nothing and removes direct calls).

## R2 — Edge Function `send-fcm` — **PASS**

```
id: 3fe63e60-e58e-45e3-a840-40f9250fc6c7   slug: send-fcm   status: ACTIVE   version: 1
verify_jwt: false   import_map: false
ezbr_sha256: 9127ca4c55fdd772d5cf4f24d822b931af00553d91a3fc2ab88603cd8d54ff13
```

Deployed with **no secret set**, as instructed.

**Auth mechanism (two paths, both verified):** the internal `pg_net` path requires header
`x-push-secret` equal to `push_config.trigger_secret`, read with the service-role client; the
operator path accepts `Authorization: Bearer <service role key>`. Anything else → `401`.
Why this and not the alternative: giving the trigger the service-role key would place the
**most powerful credential in the project into a table**, where any future SQL-injection or
over-broad read exposes everything. A dedicated push-scoped secret is least-privilege, and an
empty stored secret can never match (`প্রত্যাশিত !== ''` guard), so the path fails closed.

`verify_jwt: false` is deliberate and documented: the function performs its own authentication,
and `pg_net` cannot mint a Supabase JWT — a bearer-only gateway would make the trigger path
impossible.

**Dry-run:** when `FCM_SERVICE_ACCOUNT_JSON` is unset the function returns before any OAuth
attempt — no token exchange, no network call — with `{dry_run:true, would_send:N, payloads:[first]}`
and user content replaced by placeholders. **Notification text comes only from the fixed Bengali
map** in the function (`chat_message` → `নতুন বার্তা পাঠিয়েছেন`, `new_post` →
`আপনার এলাকায় নতুন বিজ্ঞাপন: <title>`); no client-supplied title/body is ever rendered. There is
no payment, order, or transaction concept anywhere in it.

## R3 — Message trigger path — **PASS (proven end-to-end, live)**

Config was set **transiently** (endpoint + probe secret + `enabled=true`), fixtures created, one
message inserted, and the `pg_net` response read back:

```
net._http_response
id=1  status_code=200  content_type=application/json  error_msg=''
created=2026-11-01 11:51:09.730162+00

{"dry_run":true,"would_send":1,
 "payloads":[{"token":"<token-1>",
   "notification":{"title":"চাষী কানেকশন","body":"কেউ নতুন বার্তা পাঠিয়েছেন"},
   "data":{"kind":"chat_message","chat_id":"44444444-4444-4444-8444-444444444444"}}]}
```

That single row proves the whole chain: the trigger fired on `messages` insert, resolved the
recipient as the chat's **other** party (buyer→seller), read config, made a real HTTP POST via
`pg_net`, the function authorised the internal secret, looked up the target's tokens, and returned
Bengali-only text plus the routing `chat_id`. **Zero residue** after cleanup:

```
users=1  products=0  chats=0  messages=0  reports=0  blocks=0  admin_audit=0
device_tokens=0  policies=27
push_config: enabled=false  endpoint=NULL  secret=NULL
```

**Deviation from the brief's "rollback-wrapped transaction":** the proof had to commit. `pg_net`
dispatches from a background worker *after commit*; a rolled-back transaction discards its queued
request, so a response row can never exist for a rollback-wrapped test — the requested evidence is
physically unobtainable that way. Fixtures were therefore committed, observed, then deleted, with
the zero-residue counts above as the guarantee. Every fixture used fixed ids so cleanup was exact.

**Config is back to silent**: `enabled=false`, endpoint and secret NULL. Until the operator sets
all three in Phase B, the trigger returns immediately and sends nothing.

## R4 — Client wiring — **PASS**

`apps/web/src/lib/push.ts` (new). Registration flow, trimmed to the decision points:

```ts
export async function পুশনিবন্ধন(): Promise<void> {
  if (নিবন্ধনেরচেষ্টা) return;
  if (!নেটিভপ্ল্যাটফর্ম()) return;              // ওয়েবে কিছুই নয়
  const userId = await getSessionUserId();
  if (!userId) return;                          // সেশন না থাকলে অনুমতিও চাওয়া হয় না
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const অনুমতি = await PushNotifications.requestPermissions();   // Android 13+ POST_NOTIFICATIONS
    if (অনুমতি.receive !== 'granted') return;
    await PushNotifications.addListener('registration', (টোকেন) => {
      void টোকেনসংরক্ষণ(userId, টোকেন.value);                     // RLS: user_id = auth.uid()
    });
    await PushNotifications.addListener('registrationError', () => {});
    await PushNotifications.addListener('pushNotificationActionPerformed', async (ঘটনা) => {
      const পথ = ট্যাপপথ(ঘটনা.notification.data as Record<string, unknown>);
      if (!পথ) return;
      const { goto } = await import('$app/navigation');
      await goto(পথ);
    });
    await PushNotifications.register();
    নিবন্ধনেরচেষ্টা = true;
  } catch { /* plugin নেই / অনুমতি ব্যর্থ — অ্যাপ অটুট */ }
}
```

- **Native + session guard:** `Capacitor.isNativePlatform()` via `globalThis.Capacitor` — the same
  import-free check `app-state.svelte.ts` already uses, so the web bundle gains no bytes.
- **Permission after login:** `requestPermissions()` runs only after `getSessionUserId()` returns.
- **Token upsert through RLS:** `upsert({user_id, fcm_token, platform}, {onConflict:'fcm_token'})`
  with the anon client + session. RLS `with check (user_id = auth.uid())` makes writing another
  user's token impossible; the unique `fcm_token` means a re-login on the same device moves the row
  to the new owner rather than duplicating it.
- **Tap → route mapping:** `chat_message` + `chat_id` → `/chat/<chat_id>`;
  `new_post` + `listing_id` → `/listing/<listing_id>`; anything else → no navigation.
- **Dynamic import** keeps the plugin out of the web bundle and lets the app survive its absence.
- Wired at session start in `+layout.svelte` — one `$effect` on `app.লগইন`, nothing else touched.

## R5 — Settings toggles (§15.4) — **PASS**

New `apps/web/src/routes/settings/+page.svelte`. The brief scoped `settings/+page.svelte` as
"modify (the notification section only)"; **the route did not exist**, so it was created — flagged
in DEVIATIONS.

- `নতুন পোস্ট` and `চ্যাট বার্তা`: `checked` **and `disabled`**, each labelled
  `সবসময় চালু — বন্ধ করা যাবে না`. There is no code path that can turn them off — not a style
  choice but a `disabled` input with no bound handler.
- `বিপণন`: bound to `users.marketing_optin`, default **OFF**.
- **Update path:** `from('users').update({marketing_optin}).eq('id', uid)` — RLS
  (`users_সম্পাদনা`, `id = auth.uid()`) restricts the row and 00009's column grant restricts the
  column, so the only writable thing is the caller's own marketing flag. On error the toggle
  reverts to its previous value and shows `সংরক্ষণ করা যায়নি — আবার চেষ্টা করুন`.
- Bengali-only; every string comes from `bn.ts` (6 new keys added).

## R6 — Gates + APK re-cap — **PASS**

```
node scripts/validate.mjs → ✅ ALL CHECKS PASSED (bright line, locality-first, Bengali-only, MVP scope)

npm run build → ✓ built in 15.03s ; adapter-static wrote "build" ; BUILD_EXIT=0
web assets: 45 files / 778,960 B          (CHC-T-038: 43 / 771,752 B → +2 files / +7,208 B)

npx cap sync android → Found 3 Capacitor plugins for android:
        @capacitor-community/sqlite@8.1.1, @capacitor/camera@8.2.6, @capacitor/push-notifications@8.1.3

./gradlew clean assembleRelease → BUILD SUCCESSFUL in 4m 23s (252 tasks: 226 executed)

python scripts/check_apk.py --root android/app/build/outputs/apk/release
PASS  arm64-v8a      4100316 B  (3.91 MB, headroom  2191140 B)
PASS  armeabi-v7a    3737060 B  (3.56 MB, headroom  2554396 B)
ALL ARTIFACTS UNDER 6 MB CAP    GATE_EXIT=0
```

| ABI | now | CHC-T-038 | delta |
|---|---|---|---|
| arm64-v8a | 4,100,316 B | 3,747,106 B | **+353,210 B (+9.43 %)** |
| armeabi-v7a | 3,737,060 B | 3,384,440 B | **+352,620 B (+10.42 %)** |

**Attribution (measured, not assumed).** `classes*.dex` grew **2,127,952 → 2,614,480 B
(+486,528 B)** — the Firebase Messaging / play-services classes the push plugin links in; the APK
carries `firebase-encoders-json`, `firebase-iid-interop`, `firebase-measurement-connector`
properties. `assets/public` grew **771,752 → 778,960 B (+7,208 B)** — the new `/settings` route.
Those two account for +493,736 B while the APK grew only +353,210 B: R8 reclaimed roughly 140 KB
net elsewhere (dedupe/shrink), so the delta is **smaller** than the sum of its parts. The Bengali
font is intact and byte-identical inside the APK: `assets/public/fonts/NotoSansBengali.woff2`
39,864 B + `fonts.css` 252 B.

Headroom remains 2.19 MB (arm64) / 2.55 MB (armeabi) against the 6 MB cap. The near-identical
per-ABI delta (590 B apart) again indicates a shared payload rather than ABI-specific native code.

## R7 — Land — **PASS**

Branch `task/CHC-T-039` cut from `main @ 3b56589` (= `origin/main` at task start). Two commits,
then a `--no-ff` merge:

```
4f5ccdd feat(push): FCM token plumbing, send-fcm dry-run function, pg_net message trigger
e7b91f4 docs(orchestration): CHC-T-039 push evidence and ledger row
b58a592 Merge task/CHC-T-039: FCM push notifications (Phase A)

3b56589..b58a592  main -> main
```

`git ls-remote --heads origin main`:

```
b58a592f6c495bf58d78a6612157a33424ebab68\trefs/heads/main
```

The merge carried **12 files / +1040** (`create mode` for `push.ts`, `settings/+page.svelte`,
`send-fcm/index.ts`, `00009_push_tokens.sql`, the report). **Bright-line scan on added lines only**
(CHC-D-045/046 interpretation): one hit, and it is the classic false positive — the string `order`
inside the CSS property **`border-top`** in the settings page. Per-term counts on added lines were
`cart=0 checkout=0 order=1 payment=0 escrow=0 refund=0 invoice=0 payout=0 fee=0 commission=0`, and
excluding `border` the scan is empty. Nothing was reworded or suppressed.

**Scope note.** The orchestrator's uncommitted `DECISIONS.md` and the untracked `briefs/*` were not
touched: his file was preserved and restored byte-identically (`sha256 386e5343…`, `851ec3b3…`
verified before and after). Only my own T-039 row was committed, on the committed base.

## OWNER ONE-TIME LIST — the Firebase steps only the owner can do

Zia's Google account, Firebase console, in this order:

1. **Create the Firebase project** (any name, e.g. `chashi-connection`) on the **Blaze** plan —
   FCM HTTP v1 is free, but the service-account OAuth path and `send-fcm` require a billing-enabled
   project.
2. **Add an Android app** with package name **`com.chashi.connection`** — exactly this string; a
   mismatch silently breaks token registration.
3. **Download `google-services.json`** and place it at
   `apps/web/android/app/google-services.json`. It stays gitignored; it is a config file, not a
   secret, but it must not be committed. Then `npx cap sync android` + rebuild.
4. **Apply the google-services Gradle plugin** (a small `build.gradle` change: classpath
   `com.google.gms:google-services` + `apply plugin` in the app module). This is the one
   `android/**` change Phase B needs and it was deliberately **not** made while the JSON is absent.
5. **Create a service account** (IAM & Admin → Service Accounts), grant it *Firebase Cloud
   Messaging API* access, and download the **JSON key**.
6. **Set two Edge Function secrets**: `FCM_SERVICE_ACCOUNT_JSON` = the key file's full contents
   (paste into Supabase → Project Settings → Edge Functions → Secrets; never into chat, SQL, or the
   repo). Do **not** paste it here.
7. **Choose a random trigger secret**, then set it in both places: `update public.push_config set
   endpoint_url='https://<project-ref>.supabase.co/functions/v1/send-fcm',
   trigger_secret='<random>', enabled=true where id='default';` — and nothing else. Without this
   the trigger stays silent by design.

## DEVIATIONS

1. **`apps/web/src/routes/settings/+page.svelte` was created, not modified** — the route did not
   exist. The brief's scope line assumed it did. The §15.4 section now lives at that path, which is
   the path the brief names. Note: the Profile page already renders its own (local-state, non-DB)
   notification block; see OPEN ISSUES #1.
2. **R3's proof committed instead of rollback-wrapping** — `pg_net` dispatches after commit, so a
   rolled-back transaction cannot produce a response row. Fixtures were committed, observed and
   deleted; zero-residue counts pasted in R3.
3. **`package.json` / `package-lock.json` and two generated Gradle files changed** — neither is in
   the brief's file list, but both are unavoidable: the plugin must be a declared dependency and
   `cap sync` must register it. See the QUESTION.
4. **`supabase/functions/send-fcm/` deployed via the Supabase MCP tool** (`deploy_edge_function`),
   not `supabase functions deploy` from a shell — the CLI needs a personal access token this
   session does not hold. Same artifact, same result (`ACTIVE`, v1); the function's source lives in
   the repo either way.

## ASSUMPTIONS

1. **`@capacitor/push-notifications` is authorised by the brief**, which names it as the locked
   stack ("the official Capacitor plugin … no other push SDK"). AGENTS.md's §13 stack line lists
   only `@capacitor/camera` + `@capacitor-community/sqlite`, and adding a dependency is an owner
   decision (CHC-D-008) — the brief relayed by the owner is the authority I acted on. Recorded
   rather than assumed silently; see the QUESTION.
2. **The chat notification names no sender** — the trigger does not pass a name, so the text falls
   back to the fixed map's neutral `কেউ নতুন বার্তা পাঠিয়েছেন` ("someone sent a new message").
   This is also a deliberate safety property: a notification preview on a shared household phone
   does not reveal who is messaging. If named notifications are wanted, the trigger already accepts
   a `sender_param` — a one-line change in a later migration.
3. A `device_tokens` row is per device, not per person: `fcm_token` is unique, so re-login moves the
   row. Logout does **not** delete the token — nothing in scope could, since logout runs offline
   first. Flagged in OPEN ISSUES #2.

## OPEN ISSUES

1. **Two notification surfaces.** Profile still renders its own notification block from local state
   (`app.নোটিফিকেশন.বিপণন`), which is **not** the database column. The new `/settings` route is the
   §15.4-compliant surface and is reachable by URL only — the same convention as the operator panel
   ("নেভিতে নেই, কেবল URL জেনে ঢোका যায়"). Consolidating Profile onto the DB column, or linking it
   to `/settings`, touches `profile/+page.svelte` — outside this brief's scope. Until then the two
   marketing toggles can disagree.
2. **Token lifecycle after logout.** A logged-out device keeps its `device_tokens` row, so pushes
   would still arrive for the previous user until the next login reassigns the token. Fixing it
   means deleting the row in `লগআউট()` (`app-state.svelte.ts`, out of scope) or anon-visible
   cleanup — worth its own small task.
3. **`google-services.json` must not be committed.** It is gitignored today; keep it that way, and
   keep the service-account JSON in Supabase secrets only.
4. **Gradle deprecation warning** — `Deprecated Gradle features … incompatible with Gradle 9.0`.
   Pre-existing, unrelated to this change, and not a blocker on 8.14.3.
5. **`supabase/.temp/` is untracked** CLI state left by earlier tooling; not committed here.

## QUESTIONS

**One:** `@capacitor/push-notifications` is now a declared dependency, but AGENTS.md §13's locked
stack names only `@capacitor/camera` + `@capacitor-community/sqlite`, and adding a dependency is an
owner decision (CHC-D-008). The brief named the plugin as the locked stack, so I treated that as
authorisation and installed it. Should AGENTS.md §13 be updated to list it (and is the addition
ratified as a CHC-D-008 owner decision), or should the plugin be reverted and the client wiring
left plugin-absent until Phase B? Proposed default if no answer: **keep it installed and have the
orchestrator add it to the §13 stack line** — the native APK is already built and shipped with it,
and reverting would mean rebuilding and re-capping a narrower app for no functional gain.
