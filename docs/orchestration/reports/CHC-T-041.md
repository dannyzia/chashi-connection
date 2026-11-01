# CHC-T-041 — Phase B: Firebase-initialized APK + live FCM send path

**Builder:** A-IMP-1 · **Branch:** `task/CHC-T-041` · **Base:** `8ed4075` (= origin/main at start)
**Date:** 2026-11-01 · **Depends on:** CHC-T-039, CHC-T-040 · **Rulings:** CHC-D-046, CHC-D-047, CHC-D-049

```
=== TASK REPORT ===
TASK ID: CHC-T-041
STATUS:  PARTIAL — the brief's expected PASS for this shape (R0d = NO). R1, R2, R6 PASS;
         R3–R5 BLOCKED on a credential the builder cannot supply.
SUMMARY: The release APK is now genuinely Firebase-initialized — the google-services plugin
         was already wired (at 4.4.4, not the brief's 4.4.2) and fired for the first time
         now that google-services.json exists. Rebuild: 4,102,875 / 3,739,619 B, gate exit 0,
         +2,559 B per ABI, identical on both — shared generated resources plus T-040's web.
         The live FCM proof did NOT run: the Supabase CLI's stored token is dead (401 Invalid
         access token) and no secrets tool is exposed, so FCM_SERVICE_ACCOUNT_JSON could not
         be set. push_config is therefore still silent, by construction.
FILES CHANGED: docs/orchestration/reports/CHC-T-041.md (new), LEDGER row; android/** — NO change
         needed (both plugin lines pre-existed; see R1)
COMMANDS RUN: git log/check-ignore/status; node (JSON field extraction, APK inspection);
         npx cap sync android; ./gradlew clean assembleRelease; check_apk.py; supabase secrets
         list (probe only); MCP execute_sql (push_config state), list_edge_functions
APK: arm64-v8a 4,102,875 B · armeabi-v7a 3,739,619 B (+2,559 B each vs T-039), gate exit 0
=== END REPORT ===
```

---

## R0 — Preflight — **PASS**

```
(a) HEAD: 8ed4075 docs(orchestration): make the CHC-T-040 landing claim ancestry-based
    → T-040 is landed (and is an ancestor of origin/main).
(b) google-services.json — non-secret fields only:
      project_id   = chashi-connection
      package_name = com.chashi.connection      (= applicationId ✓)
(c) git check-ignore -v apps/web/android/app/google-services.json
      apps/web/android/.gitignore:67:google-services.json   ...google-services.json
      exit=0                                     → the T-040 rule is active
(d) .tmp/fcm-service-account.json → NO (absent at the expected path)
```

**Deviation worth stating plainly:** the key itself **is present**, just under the console's
download name — `.tmp/chashi-connection-firebase-adminsdk-*.json`, 2,391 B. Structural check only
(no key material read out): `type = service_account`, `project_id = chashi-connection`,
`private_key` present, `private_key_id`/`client_email` keys present. So the owner's artifact
arrived; the brief's expected **filename** did not.

That distinction does not rescue R3, because the blocker is downstream of the file — see R3.

## R1 — Gradle plugin wiring — **PASS: already satisfied, zero diff**

The brief asked for two additions. Both **already existed in the initial commit** (`164b6da`):

```
apps/web/android/build.gradle  (project level, buildscript.dependencies)
    classpath 'com.google.gms:google-services:4.4.4'

apps/web/android/app/build.gradle:82-91  (app level, Capacitor's guard)
    try {
        def servicesJSON = file('google-services.json')
        if (servicesJSON.text) {
            apply plugin: 'com.google.gms.google-services'
        }
    } catch(Exception e) {
        logger.info("google-services.json not found, google-services plugin not applied. ...")
    }
```

Two deliberate non-changes:

1. **Not downgraded to 4.4.2.** The brief specified 4.4.2; the repo carries 4.4.4. Downgrading a
   plugin that the brief's own build step depends on would be a regression for no reason, so I
   left the newer version and the build proves it resolves.
2. **The conditional apply was left conditional.** It is Capacitor's own guard, and it is why
   T-039's build succeeded with no JSON present. Making it unconditional would break any build on
   a machine without the (gitignored) JSON.

**This also explains T-039's observation** that "the plugin isn't applied": the wiring was always
there, dormant, waiting for the JSON. There was nothing to apply lazily.

## R2 — Firebase-initialized rebuild + re-cap — **PASS**

`npx cap sync android` first (3 plugins found; assets copied) so the APK carries T-040's code
rather than T-039's stale payload — the logout-cleanup fix must be in the handoff build.

```
> Task :app:processReleaseGoogleServices
BUILD SUCCESSFUL in 8m 15s
253 actionable tasks: 222 executed, 31 up-to-date
BUILD_EXIT=0
```

```
PASS  arm64-v8a      4102875 B  (3.91 MB, headroom  2188581 B)  ...app-arm64-v8a-release.apk
PASS  armeabi-v7a    3739619 B  (3.57 MB, headroom  2551837 B)  ...app-armeabi-v7a-release.apk
artifacts: 2  over cap: 0
ALL ARTIFACTS UNDER 6 MB CAP
GATE_EXIT=0
```

**Plugin proof (not assumed — read out of the artifact):**

```
google_app_id          in resources.arsc: True
gcm_defaultSenderId    in resources.arsc: True
google_api_key         in resources.arsc: True
project_id             in resources.arsc: True
assets/public entries: 46
in-APK assets/public = 779761 B
on-disk build/       = 779761 B     → byte-exact, T-040's code ships
```

**Delta attribution** vs T-039 (4,100,316 / 3,737,060): **+2,559 B on each ABI, exactly equal.**
Identical deltas across two ABIs whose native payloads differ by ~363 KB can only come from shared
content: **+801 B** of web payload (T-039's 778,960 → T-040's 779,761) plus **≈1,758 B** of
google-services generated resources (Firebase string resources and their string-pool growth).

## R3 — Secret set — **BLOCKED (credential, not code)**

```
$ supabase secrets list --project-ref bgnndfwksjukvhbpipxb
unexpected list secrets status 401: {"message":"Invalid access token"}
```

The CLI (v2.100.0) is installed but its stored login is dead, there is no `SUPABASE_ACCESS_TOKEN`
in the environment, and the Supabase connector exposes no secrets tool (`list_edge_functions`,
`deploy_edge_function`, `execute_sql`, `apply_migration` — no `set_secrets`). Every available path
to writing a function secret requires a credential only the owner can mint:

- refresh the CLI login (`supabase login`), or
- supply a Personal Access Token to the environment.

I did not ask for the token in chat and did not attempt `supabase login` — it is an interactive
browser flow, and a PAT pasted into a transcript is exactly the exposure the standing rule forbids.

**The key file was NOT deleted.** The brief says delete it *after* the secret is set and verified;
since it was never set, deleting would destroy the owner's only copy of material that has not yet
been stored anywhere. It stays at `.tmp/chashi-connection-firebase-adminsdk-*.json` (`.tmp/` is
gitignored) and is flagged below as an open risk.

`send-fcm` remains `ACTIVE`, v1, `verify_jwt: false` — unchanged, still the correct dry-run build.

## R4 / R5 — Go-live and live handshake — **SKIPPED (per the brief's R0d path, and deliberately)**

The brief's R0(d) = NO instructs: run R1–R2 and R6, skip R3–R5. I followed that, and I would have
skipped R4 even without it: enabling `push_config` while `FCM_SERVICE_ACCOUNT_JSON` is unset would
make the system *look* live while every send silently took the dry-run branch — a green light
pointing at nothing. Live state, verified:

```
push_config: enabled=false, endpoint_set=false, secret_set=false
policies: 27   device_tokens: 0
```

So the trigger is still silent by construction, and no probe residue was created.

## R6 — Land — **PASS**

Branch `task/CHC-T-041` off `8ed4075`:

```
ba02232 docs(orchestration): land the T-040 refinement and the T-041 brief   (2 files, +62/−1)
```

Records landed first (the T-036/T-040 pattern) as `ba02232`, then this report and the row.

The `--no-ff` merge SHA and the `git ls-remote --heads origin main` line are in the delivered task
report rather than printed here, deliberately: any SHA written into this file goes stale the
moment the merge carrying the file lands, which is the exact defect CHC-T-040 had to correct.
The stable, always-true claims are ancestry — both commits below are ancestors of `origin/main`,
and stay so for every later head:

```
$ git merge-base --is-ancestor ba02232 origin/main      ; echo $?   # records commit
$ git merge-base --is-ancestor <this-report-commit> origin/main ; echo $?
```

---

## DEVIATIONS

1. **No `android/**` change was made**, because the brief's R1 edit was already in the initial
   commit. Producing a no-op diff to satisfy the letter of the brief would have been worse.
2. **Plugin version 4.4.4 kept** instead of the brief's 4.4.2 (no downgrade).
3. **Service-account key detected under a different filename** than the brief expected, and used
   only for structural verification — never for a secret set, because R3 is blocked.
4. **Key file retained** (not deleted), because the delete is conditioned on a successful, verified
   secret set that could not happen.
5. **`cap sync` run before the build** so the APK ships T-040's web code; this touched two tracked
   generated gradle files with line-endings only (empty content diff) and both were restored, so
   no churn was committed.

## ASSUMPTIONS

1. `com.google.gms:google-services:4.4.4` is a real, resolvable release — proven by the successful
   `processReleaseGoogleServices` task and the Firebase resources present in `resources.arsc`,
   not by documentation.
2. The generated-resource attribution (≈1,758 B) is derived by subtracting the measured web delta
   from the total, not by byte-level diffing of the generated files.

## OPEN ISSUES

1. **The service-account key sits on disk in `.tmp/`.** Gitignored, but unencrypted on a working
   machine, and it grants FCM send rights for the project. It should be deleted immediately after
   the owner sets the secret. This is the sharpest risk this task leaves behind.
2. **A clone without `google-services.json` silently builds a push-inert APK.** The JSON is
   correctly gitignored (CHC-T-040), so the plugin's guard logs one info line and skips — a build
   that looks fine but cannot receive pushes. Worth a CI note or a build-time assertion in a
   later stage; changing it here would be out of scope.
3. **`push_config` is still silent**, so §15.3 delivery is still unproven end-to-end. Everything
   on the builder side is ready; the switch is one secret away.

## QUESTIONS

**One:** R3 is blocked on a Supabase credential, and the only ways to unblock it are `supabase login`
(interactive, owner at the keyboard) or a PAT in the environment. Which does the orchestrator want —
owner-run CLI login, PAT injected into the environment by the owner (never pasted in chat), or
should the whole Phase-B go-live wait for the next stage? Proposed default: owner runs
`supabase login` on this machine, then I set the secret, run R4 + the live R5 handshake, and delete
the key in the same session.
