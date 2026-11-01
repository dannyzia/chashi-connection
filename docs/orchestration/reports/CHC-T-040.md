# CHC-T-040 — Push hardening + repo hygiene + records consolidation

**Builder:** A-IMP-1 · **Branch:** `task/CHC-T-040` · **Base:** `c6585c9` (= origin/main at start)
**Date:** 2026-11-01 · **Depends on:** CHC-T-039 · **Ruling basis:** CHC-D-046, CHC-D-047, CHC-D-049

```
=== TASK REPORT ===
TASK ID: CHC-T-040
STATUS:  DONE
SUMMARY: Logout now deletes the device's push row before the session dies, and profile's
         marketing toggle writes users.marketing_optin through the same RLS shape as
         /settings. google-services.json is finally gitignored — it was on disk and
         untracked, one `git add -A` from being committed. supabase/.temp/ ignored, the
         APK gate gained --variant, AGENTS.md §13 records the ratified push stack, and
         the pending orchestrator records landed in a docs-first commit.
FILES CHANGED: apps/web/src/lib/push.ts, apps/web/src/lib/app-state.svelte.ts,
         apps/web/src/routes/profile/+page.svelte, apps/web/android/.gitignore, .gitignore,
         apps/web/scripts/check_apk.py, AGENTS.md, this report, LEDGER row
WEB ASSETS: 44 files / 779,761 B  (T-039: 45 / 778,960 B → +801 B, −1 emitted file)
         method: rm -rf build && npm run build, recursive walk summing fs.statSync().size
APK: unchanged this task — no native change, no rebuild (T-039 artifacts stand:
         arm64-v8a 4,100,316 B · armeabi-v7a 3,737,060 B, gate exit 0)
=== END REPORT ===
```

---

## R1 — Logout token cleanup — **PASS**

`push.ts` retains the token (module state + `localStorage` fallback, because module state is
empty after the app restarts while the row still sits on the server) and exports
`পুশটোকেনমুছুন()`, a best-effort RLS self-delete:

```ts
export async function পুশটোকেনমুছুন(): Promise<void> {
  const টোকেন = টোকেনপড়া();
  if (!টোকেন) return;
  const সার্ভার = getSupabase() as unknown as টোকেনক্লায়েন্ট | null;
  if (!সার্ভার) {
    টোকেনভুলেজাও();
    return;
  }
  try {
    const { error } = await সার্ভার.from('device_tokens').delete().eq('fcm_token', টোকেন);
    if (!error) টোকেনভুলেজাও();
  } catch {
    // অফলাইন/নেটওয়ার্ক ব্যর্থ — সারিটি পরের বার চেষ্টার জন্য রয়ে যায়
  }
}
```

The token is written locally **before** the DB upsert, so an offline registration that never
reached the server can still be cleaned up. The changed logout path:

```ts
export function লগআউট() {
  app.লগইন = false;
  app.ব্যবহারকারী = null;
  সংরক্ষণ();
  void (async () => {
    try {
      await পুশটোকেনমুছুন();
    } catch {
      // কখনো নয় — পুশ পরিষ্কার লগআউট আটকাতে পারে না
    }
    await signOutSession();
  })();
}
```

Local state clears synchronously (UI is instant), then the delete runs **while the session is
still alive** — RLS needs `auth.uid()` to authorise it — and only then is the session torn
down. Failure cannot block logout: the function never throws and its rejection is caught.

## R2 — Profile toggle consolidation — **PASS**

Profile now reads `users.marketing_optin` on mount and writes it through the same
`update({ marketing_optin }).eq('id', uid)` shape as `/settings`, reverting on error:

```svelte
<input
  type="checkbox"
  bind:checked={বিপণন}
  disabled={!সেশনআছে || ব্যস্ত}
  onchange={() => বিপণনবদল(বিপণন)}
/>
{#if বার্তা}
  <p style="font-size: 12px; color: #4CAF50;">{বার্তা}</p>
{/if}
```

Both surfaces now read and write one column, so they cannot disagree. Session absent or env
absent → the toggle is disabled and reads OFF (the PRD default).

**Interpretation, flagged:** the brief said "leave the always-on pair out of profile". The pair
already existed in that card as read-only green labels (`সর্বদাসচালু`), so I read the clause as
*do not extend them*, and left those two rows untouched rather than deleting UI nobody asked me
to remove. See QUESTIONS.

## R3 — Phase-B file safety — **PASS (and this was live, not hypothetical)**

`apps/web/android/app/google-services.json` **already existed on disk and was untracked but NOT
ignored** — the owner's Phase-B artifact had arrived. Before the fix:

```
$ git check-ignore -v apps/web/android/app/google-services.json
exit=1                      # no rule matched — one `git add -A` commits a Firebase secret
$ git ls-files --error-unmatch apps/web/android/app/google-services.json
error: pathspec ... did not match any file(s) known to git
```

After uncommenting the rule (`apps/web/android/.gitignore:67`) and adding `supabase/.temp/`
to the root `.gitignore:32`:

```
$ git check-ignore -v apps/web/android/app/google-services.json
apps/web/android/.gitignore:67:google-services.json   apps/web/android/app/google-services.json
exit=0
$ git check-ignore -v supabase/.temp/cli-latest
.gitignore:32:supabase/.temp/   supabase/.temp/cli-latest
exit=0
$ git status --short supabase apps/web/android/app
(empty)
```

The file itself was never opened, read or printed — only its pathspec was queried.

## R4 — Gate ergonomics — **PASS**

`check_apk.py` gained `--variant <substring>` (path filter applied after collection, composing
with `--root`) plus a docstring note explaining why: `apk/debug/` and `apk/release/` share a
root, and debug artifacts are exempt (CHC-D-046) yet structurally over cap.

```
$ python scripts/check_apk.py --variant release      # gate of record
root: android\app\build\outputs
variant filter: 'release'
cap:  6291456 bytes (6.00 MB) absolute

PASS  arm64-v8a      4100316 B  (3.91 MB, headroom  2191140 B)  ...\app-arm64-v8a-release.apk
PASS  armeabi-v7a    3737060 B  (3.56 MB, headroom  2554396 B)  ...\app-armeabi-v7a-release.apk

artifacts: 2  over cap: 0
ALL ARTIFACTS UNDER 6 MB CAP
EXIT=0
```

**Honest note on the default run:** it also exits **0** right now, because T-039's
`clean assembleRelease` removed the debug APKs from the tree — so the mixed-set defect is not
currently reproducible live. The filter is therefore proven by selection, not by a red default:

```
$ python scripts/check_apk.py --variant debug
NO ARTIFACTS: no .apk/.aab under android\app\build\outputs matching --variant 'debug'
EXIT=1                        # filter selects nothing; nothing is silently judged

$ python scripts/check_apk.py --variant arm64
variant filter: 'arm64'
PASS  arm64-v8a      4100316 B ...
artifacts: 1  over cap: 0     # exactly one artifact judged
EXIT=0
```

Default behavior is unchanged: no `--variant` judges every artifact under the root.

## R5 — AGENTS.md §13 — **PASS**

```
$ git diff --stat AGENTS.md
 AGENTS.md | 5 +++--
 1 file changed, 3 insertions(+), 2 deletions(-)
```

Added lines (the only ones — two modified §13 lines plus the citation; nothing else touched):

```
+- **Native:** Capacitor (Android-first) + `@capacitor/camera` + `@capacitor-community/sqlite` + `@capacitor/push-notifications`.
+- **Backend (when built):** Supabase only — ... **No Firebase except FCM** (push only) — Supabase Edge Functions + FCM HTTP v1 (push).
+<!-- CHC-D-049: `@capacitor/push-notifications` + the `send-fcm` Edge Function (FCM HTTP v1) are ratified stack; T-040 recorded them here. -->
```

## R6 — Records landing — **PASS (first commit on the branch)**

```
7acac10 docs(orchestration): land orchestrator records for T-036..T-040
 docs/orchestration/DECISIONS.md        |  5 +++
 docs/orchestration/LEDGER.md           |  9 ++---
 docs/orchestration/briefs/CHC-T-037.md | 58 +++++++++++++++++++++++++++++++
 docs/orchestration/briefs/CHC-T-038.md | 59 ++++++++++++++++++++++++++++++++
 docs/orchestration/briefs/CHC-T-039.md | 58 +++++++++++++++++++++++++++++++
 docs/orchestration/briefs/CHC-T-040.md | 63 ++++++++++++++++++++++++++++++++++
 6 files changed, 248 insertions(+), 4 deletions(-)
```

One row per task, verified mechanically rather than by eye:

```
$ git show HEAD:docs/orchestration/LEDGER.md | grep -o "^| CHC-T-0[0-9][0-9]" | sort | uniq -d
(empty — no duplicates)
$ ... | grep -c "^| CHC-T-"
38                                  # 38 rows, 38 distinct tasks, each exactly once
```

The brief predicted "6 rows" for the `CHC-T-03` prefix; the ledger actually holds 38 task rows
across the whole project. The invariant that matters — **no duplicate row per task** — holds
exactly.

**Ownership note:** after the records commit, the orchestrator wrote two new in-tree items —
a `CHC-T-041` QUEUED ledger row and `briefs/CHC-T-041.md`. I did not commit, edit or revert
either; they remain uncommitted in the working tree (their `T-041` line is byte-intact).

## R7 — Gates + landing — **PASS**

```
$ node scripts/validate.mjs
✅ Bright Line Scan: OK
✅ Locality-First Scan: OK
✅ Bengali-Only Scan: OK (manual review required)
✅ MVP Scope Scan: OK
✅ ALL CHECKS PASSED
validate_exit=0

$ rm -rf build && npm run build
✓ built in 15.16s
Wrote site to "build"
build_exit=0
WEB ASSETS: 44 files / 779,761 B
```

**No APK rebuild, deliberately:** this task changed no native input (no `android/**` source, no
plugin, no Capacitor config), only web TypeScript and one Python gate script. The T-039 release
artifacts remain the installed candidate and were re-measured under the release-scoped gate
above (4,100,316 / 3,737,060 B, exit 0).

Byte attribution vs T-039's 45 files / 778,960 B: **+801 B** across the three changed modules
(profile's DB binding is the bulk). One fewer emitted file — bundle composition shifted as
`push.ts` became reachable through a static import edge; nothing regressed and the cap is
untouched.

Commits on `task/CHC-T-040`:

```
7acac10 docs(orchestration): land orchestrator records for T-036..T-040
fc6c88f feat(push): drop the device token on logout and unify marketing consent   (3 files, +161/−6)
d296e33 chore(repo): ignore Firebase config and supabase CLI cache, scope the APK gate (3 files, +26/−2)
c3c9d44 docs(agents): record the ratified push stack in the locked stack list      (1 file, +3/−2)
```

Bright-line scan on **added lines only**:

```
+      <div style="...; border-top: 1px solid #eee; margin-top: 8px;">
scan: 1 hit    per-term: order=1  cart=0 checkout=0 payment=0 escrow=0 refund=0
               invoice=0 payout=0 fee=0 commission=0
```

The single hit is the CSS property **`border-top`** containing "order" — the same substring
false positive as T-039, accepted under the CHC-D-045/046 interpretation. Zero genuine terms;
nothing reworded or suppressed.

**Merge:** two `--no-ff` merges landed this task — `fc92baf` (records, code, hygiene, evidence)
and `5d58346` (the landing addendum below). Both are pushed.

### R7 landing addendum

**How to verify this landed without chasing a moving head.** Equality against `main` head is a
trap: this very addendum's merge advances the head past whatever SHA it prints — exactly the
stale pointer an auditor should never be handed. Ancestry is the stable claim, and it stays true
for every later head:

```
$ git merge-base --is-ancestor fc92baf origin/main ; echo "fc92baf ancestor exit=$?"
fc92baf ancestor exit=0
$ git merge-base --is-ancestor 5d58346 origin/main ; echo "5d58346 ancestor exit=$?"
5d58346 ancestor exit=0
```

At the time of writing (`5d58346` = `main`):

```
$ git push origin main
   fc92baf..5d58346  main -> main
$ git ls-remote --heads origin main
5d58346b732c51e07b3fcf7f95b4d4f208cfcddb	refs/heads/main
```

Branch history merged by `fc92baf`:

```
50a80aa docs(orchestration): record CHC-T-040 evidence and close the row
c3c9d44 docs(agents): record the ratified push stack in the locked stack list
d296e33 chore(repo): ignore Firebase config and supabase CLI cache, scope the APK gate
fc6c88f feat(push): drop the device token on logout and unify marketing consent
7acac10 docs(orchestration): land orchestrator records for T-036..T-040
```

Post-landing working-tree state (`git status --short apps/web supabase docs`) is **empty** apart
from the orchestrator's own in-flight `LEDGER.md` line and `briefs/CHC-T-041.md`, which are
preserved uncommitted and byte-identical to how they were found
(`sha256 f39c28c9…` before and after).

Evidence-commit scan note: the `50a80aa` added lines do match the bright-line terms — because that
report *quotes the per-term count table it is presenting*. That is meta-documentation of the scan,
the same accepted case as CHC-T-037. The **code** commits' added lines carry only the CSS
`border-top` substring; the gate result that matters is unchanged.

---

## DEVIATIONS

1. **Profile's always-on pair left in place.** Read "leave the always-on pair out of profile" as
   *don't extend them*; they were already read-only labels. No UI was deleted.
2. **No APK rebuild.** The brief's R7 explicitly does not require one ("no native change"); the
   T-039 signed artifacts stand and were re-gated.
3. **Records commit is the branch's first commit**, not a docs-only side branch — the brief asked
   for one commit, before any code commit, which is what landed.
4. **`supabase/.temp/` ignored at the root `.gitignore`** rather than a new `supabase/.gitignore`,
   matching the repo's existing single-root ignore style.

## ASSUMPTIONS

1. `delete().eq('fcm_token', …)` is authorised by the existing `device_tokens` self-policy
   (`user_id = auth.uid()`), i.e. a token belonging to another user cannot be deleted.
   Not re-proven live this task (no new SQL; the policy set is unchanged at 27 from T-039).
2. `localStorage` is available in the Android WebView; the code tolerates it being
   disabled/absent via try/catch, degrading to module state only.

## OPEN ISSUES

1. **Offline logout leaves the row.** If the delete fails (no network at logout), the
   `device_tokens` row survives until the next login reassigns it — the window the brief asked
   to close is closed in the normal case, not in the no-network case. A retry-on-next-boot sweep
   would close it fully; that is new work, not a defect in this change.
2. **`app.নোটিফিকেশন.বিপণন` is now dead** in `app-state` (profile was its only reader; the DB
   column is the source of truth). Left in place — removing it means touching offline-state
   persistence outside this brief's scope. Worth a hygiene task.
3. **Gate default scope still mixes variants** by design (the flag is opt-in). Making the
   default release-scoped would change behaviour for any past caller; left as the brief specified.
4. **`docs/orchestration/LEDGER.md` in the working tree still shows T-040 as QUEUED** and carries
   the orchestrator's `T-041` line; the committed ledger holds the DONE row. Their consolidation
   pass supersedes the working-tree copy, exactly as with T-039.

## QUESTIONS

**One:** the brief's R6 acceptance says to verify the `CHC-T-03` row count is "6 rows, one per
task", but the committed ledger has **38** task rows (38 distinct tasks, zero duplicates) — the
"6" does not correspond to any slice I can identify. I verified the invariant (exactly one row
per task) rather than the literal number. Should the brief's figure be corrected to 38, or did it
mean a narrower subset I should have counted? Proposed default: keep the committed ledger as is
and correct the brief's number.
