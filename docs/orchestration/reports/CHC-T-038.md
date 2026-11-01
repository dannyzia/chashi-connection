# CHC-T-038 — Signed release APK: cap-proven, installable

**Task:** CHC-T-038 · **Agent:** A-IMP-1 (builder) · **Ruling:** CHC-D-047 (orchestrator authority) · **Date:** 2026-11-01
**Base:** `main @ fd675b4` = `origin/main` · **Branch:** `task/CHC-T-038`

```
=== TASK REPORT ===
TASK ID: CHC-T-038
STATUS:  PARTIAL — R1–R4, R6 PASS; R5 BLOCKED (not a defect, a config conflict needing a one-line ruling)
SUMMARY: Signed split-ABI release APKs built and byte-cap-proven under the 6 MB gate:
         arm64-v8a 3,747,106 B (+15,580 vs contract) / armeabi-v7a 3,384,440 B (+15,576).
         Both Verifies under apksigner (APK Signature Scheme v2), minSdk 24 / targetSdk 36 in the
         built manifest, ABI split set identical to debug. The .aab cannot be produced while
         `splits { abi { enable true } }` is on — AGP rejects ABI splits + bundle together, so R5
         needs one authorised line before it can run. Zero secret exposure; keystore never read.
FILES CHANGED: docs/orchestration/reports/CHC-T-038.md (new), docs/orchestration/LEDGER.md (CHC-T-038 row)
WEB ASSETS: 43 files / 771,752 B — method: recursive walk of apps/web/build summing
         fs.statSync().size over every regular file (no rebuild this task; assets unchanged since
         T-037's second build, carried into the APK by the cap sync that already ran in T-037)
APK (release, signed): arm64-v8a 3,747,106 B · armeabi-v7a 3,384,440 B · cap 6,291,456 B → gate exit 0
=== END REPORT ===
```

---

## R1 — Signing config preflight — **PASS**

`android/app/build.gradle` contains **no literal secret values**: the signing config reads property
names at build time. Nothing in the block needed redaction, so it is pasted verbatim and the values
simply never appear in the file.

```groovy
def keystoreProps = new Properties()
def keystorePropsFile = rootProject.file("keystore.properties")
if (keystorePropsFile.exists()) {
    keystorePropsFile.withInputStream { keystoreProps.load(it) }
}

android {
    signingConfigs {
        if (keystorePropsFile.exists()) {
            release {
                storeFile     rootProject.file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias      keystoreProps['keyAlias']
                keyPassword   keystoreProps['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            if (keystorePropsFile.exists()) {
                signingConfig signingConfigs.release      // ← release build type binds the release config
            }
        }
    }
}
```

Redaction ledger: **0 values were present in the inspected file**, so no `<redacted-N>` markers were
needed. Property *names* only: `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.

Keystore material on disk — **names and sizes only, neither file opened**:

```
-rw-r--r-- 1 callz 197609 2728  chashi-release.keystore
-rw-r--r-- 1 callz 197609  110  keystore.properties
```

Both match the brief's expected sizes exactly (2,728 B / 110 B). The release build type binds
`signingConfigs.release` whenever `keystore.properties` exists — so the `assembleRelease` in R2 was
signed, and no signing flags were passed on the command line (the gradle config consumed the
properties, not this agent).

## R2 — Signed release build — **PASS**

```
> Task :app:minifyReleaseWithR8
> Task :app:convertShrunkResourcesToBinaryRelease
> Task :app:optimizeReleaseResources
> Task :app:packageRelease
> Task :app:assembleRelease

BUILD SUCCESSFUL in 4m 21s
206 actionable tasks: 182 executed, 24 up-to-date
```

Outputs (exact bytes, `find -printf '%p %s\n'`):

```
android/app/build/outputs/apk/release/app-arm64-v8a-release.apk     3747106
android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk   3384440
```

Debug reference from T-037, still on disk:

```
android/app/build/outputs/apk/debug/app-arm64-v8a-debug.apk        10560151android/app/build/outputs/apk/debug/app-armeabi-v7a-debug.apk     10152089
```

## R3 — Byte cap — **PASS** (release artifacts)

Default invocation walks the whole outputs tree, which on this machine still contains T-037's debug
APKs. That run therefore reports the *debug* overage (structurally exempt per CHC-D-046) alongside
the passing release rows:

```
root: android\app\build\outputs
cap:  6291456 bytes (6.00 MB) absolute

FAIL  arm64-v8a     10560151 B  (10.07 MB, headroom -4268695 B)  ...\apk\debug\app-arm64-v8a-debug.apk
FAIL  armeabi-v7a   10152089 B  (9.68 MB, headroom -3860633 B)  ...\apk\debug\app-armeabi-v7a-debug.apk
PASS  arm64-v8a      3747106 B  (3.57 MB, headroom  2544350 B)  ...\apk\release\app-arm64-v8a-release.apk
PASS  armeabi-v7a    3384440 B  (3.23 MB, headroom  2907016 B)  ...\apk\release\app-armeabi-v7a-release.apk

artifacts: 4  over cap: 2
APK CAP BREACH — 6 MB absolute hard cap exceeded
EXIT=1
```

Scoped to the shipping artifacts — the gate's authoritative verdict for this task:

```
root: android/app/build/outputs/apk/release
cap:  6291456 bytes (6.00 MB) absolute

PASS  arm64-v8a      3747106 B  (3.57 MB, headroom  2544350 B)  ...app-arm64-v8a-release.apk
PASS  armeabi-v7a    3384440 B  (3.23 MB, headroom  2907016 B)  ...app-armeabi-v7a-release.apk

artifacts: 2  over cap: 0
ALL ARTIFACTS UNDER 6 MB CAP
EXIT=0
```

**Deltas vs the contract figures** (AGENTS.md: arm64 3,731,526 B / armeabi 3,368,864 B):

| ABI | measured | contract | delta |
|---|---|---|---|
| arm64-v8a | 3,747,106 B | 3,731,526 B | **+15,580 B (+0.42 %)** |
| armeabi-v7a | 3,384,440 B | 3,368,864 B | **+15,576 B (+0.46 %)** |

**Explanation of the delta.** The two ABIs moved by almost the same amount (4 B apart). An
ABI-specific change — a native library, a per-ABI `.so` — would move them by different amounts,
because the ABI payloads differ (362,666 B between the two APKs). A near-identical shift across both
points at the **shared payload**, and this build's shared payload is the web asset set, stored
**uncompressed** (`useLegacyPackaging = true`): `assets/public` measures **771,752 B inside the APK**,
byte-for-byte equal to `apps/web/build` on disk. So the growth sits in the web bundle and shared
resources, not in native code. The size collapse from debug to release is R8 minification +
resource shrinking: a single `classes.dex` at **2,127,952 B**, against debug's *two* dex files
(9,649,140 B + 6,921,160 B).

## R4 — Signature verification — **PASS**

`build-tools/36.1.0/apksigner verify -v` on both release APKs:

```
=== app-arm64-v8a-release.apk ===
Verifies
Verified using v1 scheme (JAR signing): false
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): false
Verified using v3.1 scheme (APK Signature Scheme v3.1): false
Verified using v4 scheme (APK Signature Scheme v4): false
Verified for SourceStamp: false
Signer #1 certificate SHA-256 digest: 68125773946ee86f…(truncated)
EXIT=0

=== app-armeabi-v7a-release.apk ===
Verifies
Verified using v2 scheme (APK Signature Scheme v2): true
Signer #1 certificate SHA-256 digest: 68125773946ee86f…(truncated)
EXIT=0
```

Both artifacts are signed by the same certificate (identical SHA-256 prefix), which is what a
two-ABI release from one signing config must show. v1/v3/v4 false is expected for an
`apksigner`-independent AGP v2-only signing output at this toolchain version.

**Subject redacted entirely** (`grep -vi "subject\|DN:"`); no fingerprint is reproduced beyond the
first 16 hex characters of the SHA-256 digest. See OPEN ISSUES #2 for a handling note on the
intermediate console output.

## R5 — Store-format bundle — **BLOCKED** (config conflict, not a defect)

`bundleRelease` exists as a task and fails deterministically. Verbatim:

```
* What went wrong:
Execution failed for task ':app:buildReleasePreBundle'.
> Multiple shrunk-resources files found in directory '...\app\build\intermediates\
  shrunk_resources_proto_format\release\minifyReleaseWithR8':
  [shrunk-resources-proto-format-arm64-v8a-release.ap_,
   shrunk-resources-proto-format-armeabi-v7a-release.ap_]
  Please disable building multiple APKs when building an Android app bundle.
  See https://issuetracker.google.com/402800800 for more details.

BUILD FAILED in 7s
GRADLE_EXIT=1
```

**Cause.** `android/app/build.gradle` enables ABI splits
(`splits { abi { enable true; include 'arm64-v8a', 'armeabi-v7a'; universalApk false } }`). AGP
cannot produce an app bundle from a project whose build produces multiple APKs — the bundle
supersedes ABI splits, and the two configurations are mutually exclusive by design. Nothing in the
signing path is involved; a keystore-free `bundleRelease` fails identically.

**The exact diff needed** (not applied — see below):

```diff
     splits {
         abi {
-            enable true
+            // AGP forbids ABI splits together with an app bundle (issuetracker 402800800):
+            // bundles do their own per-device splitting, so skip splits for bundle tasks.
+            enable !gradle.startParameter.taskNames.any { it.toLowerCase().contains('bundle') }
             reset()
             include 'arm64-v8a', 'armeabi-v7a'
             universalApk false
         }
     }
```

**Why it was not applied.** The brief's scope permits `android/**` edits only for a build-blocking
fix "beyond version-field plumbing → STOP and report instead". Enabling/disabling ABI splits per
task is packaging configuration, not version plumbing, so it falls on the STOP side of that line.
It is also not free: the guard makes the APK-split path conditional on an invocation detail, and it
sits in the same block that produces the cap-proof artifacts — an owner-visible packaging semantic.

**What R5 could have settled, and does not.** An `.aab` is a *distribution container*, not an
installed artifact; Play re-splits it per device, so its own byte count does not map onto the 6 MB
installed-size cap. The cap therefore has to be proven on derived/split APKs (R2/R3) either way. R5's
value is store-format readiness for a later upload stage (owner-gated forever), not cap evidence.

## R6 — Installability evidence — **PASS**

`defaultConfig` / `android/variables.gradle` (no secrets here):

```groovy
defaultConfig {
    applicationId "com.chashi.connection"
    minSdkVersion rootProject.ext.minSdkVersion      // 24
    targetSdkVersion rootProject.ext.targetSdkVersion // 36
    versionCode 1
    versionName "1.0"
    ...
}
compileSdkVersion = 36
minSdkVersion = 24
targetSdkVersion = 36
```

Confirmed **inside the built artifacts** (`aapt2 dump xmltree --file AndroidManifest.xml` on the
release APK), not merely in the gradle file:

```
A: http://schemas.android.com/apk/res/android:minSdkVersion(0x0101020c)=24
A: http://schemas.android.com/apk/res/android:targetSdkVersion(0x01010270)=36
package: name='com.chashi.connection' versionCode='1' platformBuildVersionName='16'
         compileSdkVersion='36'
```

**ABI split parity, release vs debug** (`aapt2 dump badging`, `native-code:` line):

```
release/app-arm64-v8a-release.apk     native-code: 'arm64-v8a'
release/app-armeabi-v7a-release.apk   native-code: 'armeabi-v7a'
debug/app-arm64-v8a-debug.apk         native-code: 'arm64-v8a'
debug/app-armeabi-v7a-debug.apk       native-code: 'armeabi-v7a'
```

Identical set, identical `applicationId`, `versionCode 1`, `minSdk 24`, `targetSdk 36`. minSdk 24
covers Android Go handsets the PRD targets.

**Payload identity.** `assets/public` in the release APK sums to **771,752 B** — exactly the on-disk
`apps/web/build` total (43 files), and the bundled Bengali font is present:

```
2127952  1981-01-01 01:01   classes.dex
  39864  1981-01-01 01:01   assets/public/fonts/NotoSansBengali.woff2
assets/public bytes=771752
```

The release APK ships the same web payload as the verified build, including the 39,864 B Bengali
WOFF2 (T-037's R5 evidence carries the full font/asset listing).

## R7 — Land — **PASS**

Branch `task/CHC-T-038` cut from `main @ fd675b4` (= `origin/main` at task start).

```
9ae24ea docs(orchestration): CHC-T-038 signed release APK evidence — cap-proven, ABB blocked
cb94577 Merge task/CHC-T-038: signed release APK evidence
        parents: fd675b409110d2493ea8bb8ff02e9245a4bb857e 9ae24ead931f25a44eb03b3dd32c065bbb28583d
fd675b4..cb94577  main -> main
```

`git ls-remote --heads origin main`:

```
cb94577ece4f440bedc06565e38e5045f1a33890	refs/heads/main
```

The merge carried exactly two files (+361): the new report (360) and one added ledger row (1). No
`apps/web/**`, `supabase/**`, or `android/**` file was touched by this task, so nothing on the app or
schema side could regress — and the shipped artifact is the build output, not a repo file.

**Landing-scope note.** The working tree also holds the orchestrator's uncommitted
`docs/orchestration/DECISIONS.md` hunk plus their in-flight rewrite of the T-036/T-037 ledger rows and
the untracked `briefs/CHC-T-038.md`. Those are not this task's scope, so only the report and the
CHC-T-038 row were committed; the orchestrator's ledger file was restored byte-for-byte afterwards
(see OPEN ISSUES #5).

**Final landing head — the evidence commit was itself merged.** The landing-evidence edit above is a
commit on `main`, so the head advanced one further merge after `cb94577`. The report's R7 readings
above are true as of the first merge; the chain below is the closing state:

```
9ae24ea docs(orchestration): CHC-T-038 signed release APK evidence — cap-proven, ABB blocked
cb94577 Merge task/CHC-T-038: signed release APK evidence
00119e1 docs(orchestration): CHC-T-038 landing evidence (merge cb94577)
08a2c6d Merge task/CHC-T-038: landing evidence        ← FINAL HEAD
```

`git ls-remote --heads origin main` at closure:

```
08a2c6dcd2e537067f97d45db106eb7c0adddd5f	refs/heads/main
```

**Orchestrator verification and closure.** He confirmed all ten flags YES against `08a2c6d`, including
the release artifacts on disk byte-exact, the release-scoped gate rerun (exit 0), apksigner v2 on both
ABIs with the matching digest prefix, the Bengali font byte-exact inside the release APK, the DEX
collapse, `assets/public` = 771,752 B inside the APK, the SDK metadata, and the ABB's absence as
claimed. He also found that his own pending working-tree T-038 ledger cell is a same-row refinement
rather than a duplicate, so the duplicate-row hazard flagged in OPEN ISSUES #5 does not exist.

**The QUESTION below is ANSWERED — `CHC-D-048`: the stage closes APK-only; the ABB defers to the
store-upload stage.** Reasoning recorded: an `.aab` is a distribution container, not the installed
artifact, so its own bytes never prove the installed cap; the one-line `splits.abi.enable` guard rides
the upload stage's brief, which is owner-gated forever per CHC-D-047. R5 staying BLOCKED is therefore
the ruled outcome, not a gap. His gate-discipline note is also adopted: future gate runs must scope
`--root` to the variant under judgment, because the default root mixes debug and release.

---

## WEB ASSETS

| | |
|---|---|
| files | 43 |
| bytes | **771,752** |
| method | `rm -rf build`-free this task; recursive walk of `apps/web/build`, summing `fs.statSync().size` over every regular file (node one-liner) |
| determinism | ±5 B per build (`_app/version.json` timestamp), per CHC-D-045; this task did **not** rebuild, so the figure is T-037's second build carried forward by cap sync |
| delta this task | **0 B** — T-038 changed no web source |

## APK (release, signed)

| ABI | bytes | MB | headroom vs 6,291,456 B | vs contract |
|---|---|---|---|---|
| arm64-v8a | 3,747,106 | 3.57 | 2,544,350 | +15,580 (+0.42 %) |
| armeabi-v7a | 3,384,440 | 3.23 | 2,907,016 | +15,576 (+0.46 %) |

ABB: **not produced** (R5 blocked).

## DEVIATIONS

1. **R3 reported two gate runs instead of one.** The script has no variant selector and its default
   root includes T-037's debug APKs, so the default run exits 1 on exempt debug artifacts. The
   scoped `--root .../apk/release` run (exit 0) is the shipping-artifact verdict. Both pasted; no
   threshold, cap, or script logic was altered — the script is out of scope.
2. **R4 evidence pasted with all three digests redacted to a SHA-256 prefix.** The first apksigner
   invocation printed full SHA-1 and MD5 lines; those were re-run with digest output filtered rather
   than reproduced. Handling note in OPEN ISSUES #2.
3. **`android/**` unchanged.** No build-blocking fix was needed for R1–R4/R6, and R5's fix is outside
   the permitted edit class — reported as the diff, not applied.

## ASSUMPTIONS

1. The contract's 3,731,526 / 3,368,864 B figures were measured at an earlier revision with a smaller
   web payload; the +15.5 KB shift is attributed to the shared payload (web assets stored
   uncompressed at 771,752 B) rather than to native code, on the evidence that both ABIs moved by
   within 4 B of each other. Not independently re-measured against that earlier revision.
2. A v2-only signature is sufficient for an internal/installable artifact at this stage; v1/v3/v4
   schemes are not required until store submission is specified.
3. Debug APKs remaining under `android/app/build/outputs` is accepted as normal local build state
   (gitignored), not residue to be cleaned.

## OPEN ISSUES

1. **R5 needs one line of authorisation** — the `enable` guard above, or an explicit "no ABB this
   stage". Until then the project has no store-format artifact. Related: ABI splits and app bundles
   cannot coexist in one build config, so whichever way it is ruled, the cap proof stays on split
   APKs.
2. **Secret-handling note.** `chashi-release.keystore` and `keystore.properties` were never opened;
   only `ls` sizes were taken. During R4, apksigner's default output printed full SHA-1/MD5
   certificate fingerprints to the console before filtering; no property value, password, key
   material, or certificate subject was ever produced, and the committed report carries only a
   redacted SHA-256 prefix. Flagged rather than silently dropped.
3. **Gate ergonomics (out of scope to fix).** `scripts/check_apk.py` walks every variant, so any
   debug build present makes the default invocation exit 1. It needs a `--variant`/release-only
   default before it can be a CI gate. Not modified here.
4. **Version identity is static.** `versionCode 1` / `versionName "1.0"` are hard-coded; consecutive
   signed releases would collide on `versionCode` at any store hand-off.
5. **The orchestrator's pending ledger rewrite was left untouched.** The uncommitted
   `docs/orchestration/LEDGER.md` in the working tree replaces the T-036/T-037 rows with the
   orchestrator's verified wording and adds a CHC-T-038 row that is still stamped `QUEUED` — landing it
   as-is would reset this task's status and drop the evidence now recorded above. Only the CHC-T-038
   row was committed (on `main`'s own base), then the orchestrator's file was restored unchanged. Before
   that hunk lands, its T-038 row should be dropped in favour of the committed one, or `main` will carry
   two conflicting CHC-T-038 entries.

## QUESTIONS

**One (ANSWERED — `CHC-D-048` closes the stage APK-only; the ABB moves to the store-upload stage):** authorise the `splits.abi.enable` per-task guard (exact diff in R5) so `bundleRelease` can
produce the ABB this stage, or rule that the ABB belongs to the (owner-gated) store-upload stage and
close this stage APK-only? Proposed default if no answer: **close APK-only** — the cap is proven on
the split APKs, and the bundle is a distribution-format concern for the upload stage.
