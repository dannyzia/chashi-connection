# CHC-T-004 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-004
TITLE:           Wire SQLite persistence; align Capacitor; first APK measurement
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-003 (DONE, pushed — branch task/CHC-T-003 @ 4ac1759 is the base)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: AGENTS.md (esp. 🔐 LOCKED TECH STACK, ⚙️ size constraints); PRD-V5.0 §13, §16; docs/orchestration/DECISIONS.md CHC-D-008; reports/CHC-T-003r2.md
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. You have no memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read AGENTS.md (project root) before anything else. Its hard rules override this brief. If they conflict, stop and report BLOCKED.
2. Load your role skill: .agents/skills/rhizome-builder/SKILL.md (project-local). Git-hygiene checklist (§8) is mandatory before every commit.
3. Do exactly what this brief says. No extra work. No refactors outside SCOPE.
4. Touch only files listed under SCOPE. If you need another file, stop and report BLOCKED.
5. Do not invent facts, numbers, or versions. If you do not know, write UNKNOWN.
6. Run every step under VERIFICATION and paste real output. An acceptance line without pasted evidence is an automatic reject.
7. Never print, store, or request secrets, credentials, keystores, or passwords.
8. If anything is ambiguous, stop and put exactly one question under QUESTIONS.
9. If you cannot complete a step, report BLOCKED with the reason. Do not improvise.
10. Finish by writing the TASK REPORT in the exact format at the end of this brief.

CONTEXT
CHC-T-003 (union dataset) is DONE and pushed on branch task/CHC-T-003. This is Stage 2, task 1: the offline persistence and native-shell phase. The app currently persists ALL state (login, user, posts, chats, sync queue, notifications prefs) to localStorage — including base64 photo thumbnails, which will exceed the 5 MB localStorage quota on device. An SQLite wrapper already exists at apps/web/src/lib/offline/sqlite-wrapper.ts (dynamic import to protect APK budget; 4 tables: cached_products, chat_cache, sync_queue, kv; native-only, returns null on web) but is NOT imported anywhere. Separately, the Capacitor dependency set is version-incoherent: @capacitor/android ^8.5.2 vs @capacitor/camera ^7.0.5 and @capacitor-community/sqlite ^7.0.0 (risk CHC-R-003). No APK has ever been built — the ≤1 MB size stretch target (CHC-D-008) cannot be ruled on until real APK bytes exist (CHC-R-012). Locked stack: you may NOT add any npm package, Capacitor plugin, or library.

OBJECTIVE
(1) Persist app state through SQLite on native (localStorage fallback unchanged on web), (2) align the Capacitor dependency set to one coherent major, (3) build the first release/debug APK and report its exact size in bytes per ABI (or universal), so the owner can rule on the 1 MB target with real numbers.

SCOPE (the ONLY files you may create or modify)
- apps/web/src/lib/app-state.svelte.ts — modify (persistence layer swap)
- apps/web/src/lib/offline/sqlite-wrapper.ts — modify only if the wiring requires an API addition (keep existing exports)
- apps/web/package.json + apps/web/package-lock.json — modify ONLY for Capacitor version alignment (same majors for all three packages; no additions, no removals)
- apps/web/capacitor.config.json — modify only if version alignment requires it
- Branch/commit operations on the resulting change set

OUT OF SCOPE (you MUST NOT do these)
- Adding ANY npm dependency or Capacitor plugin (locked stack, CHC-D-008)
- Editing schema (src/offline/schema.sql or the wrapper's inline schema — 4 tables stay as-is; NO new tables; bright-line: no transaction/order/payment tables ever)
- bn.ts, logic/*, routes/*, seed data, android/ signing config edits, docs/orchestration/**
- Supabase, FCM, ML Kit, any backend work
- Committing files outside SCOPE; merging; force-push

INPUTS (read these first)
- AGENTS.md — 🔐 LOCKED TECH STACK, ⚙️ TECHNICAL CONSTRAINTS (size), 🚫 VALIDATION CHECKLIST
- apps/web/src/lib/app-state.svelte.ts — current state (লোড/সংরক্ষণ via localStorage key 'chashi.state')
- apps/web/src/lib/offline/sqlite-wrapper.ts — existing wrapper (ডিবিচালু/ডিবিপড়া/ডিবিলেখা/ডিবিএক্সিকিউট)
- apps/web/package.json — current versions
- docs/orchestration/DECISIONS.md CHC-D-008 — byte-accounting rule

REQUIREMENTS (numbered; each is testable)
R1. Capacitor alignment: set @capacitor/android, @capacitor/cli, @capacitor/camera, @capacitor-community/sqlite to one coherent Capacitor major. Preferred: latest v8-compatible releases of all plugins (check npm registry: npm view <pkg> versions). If no v8-compatible release exists for @capacitor-community/sqlite or @capacitor/camera, align ALL to the highest coherent v7 set instead and say so in the report. Evidence: pasted npm view output or lockfile resolution lines for each package.
R2. SQLite persistence wiring in app-state.svelte.ts:
   a. Keep the current synchronous $state shape and the localStorage লোড/সংরক্ষণ behavior as the web path (unchanged).
   b. Add a native path: when Capacitor.isNativePlatform() is true, সংরক্ষণ() ALSO writes the same payload to SQLite via the existing wrapper (kv table, key 'chashi.state', value = same JSON string — simplest correct design; if you choose the dedicated-table design instead, document why in the report).
   c. On native boot: after লোড() populates state from localStorage (may be empty on first run), asynchronously read 'chashi.state' from SQLite; if present and non-empty, REPLACE the in-memory state with it (it wins over localStorage on native, because SQLite is the durable store; localStorage on native WebView is unreliable across clearances). Guard: wrap JSON.parse in try/catch; on failure fall back to localStorage state and log a Bengali console.warn.
   d. Thumbnails: no special handling needed in this design (dataURLs ride inside the JSON payload into SQLite) — do NOT move them to a separate store in this task.
   e. Existing exports (app, সংরক্ষণ, লগইনকরুন, লগআউট, সারিতেযোগ, সারিফ্লাশ, পোস্টযোগ, চ্যাটখুলুন, বার্তাপাঠান, ব্যবহারকারীব্লক) keep their names, signatures, and synchronous behavior — no caller may need changes.
R3. Gates (paste all output):
   a. node scripts/import-locations.mjs → exit 0, 100% match (unchanged-regeneration check).
   b. node scripts/validate.mjs → ALL CHECKS PASSED.
   c. npm run build → exit 0; report total build-directory bytes AND the byte delta vs baseline 530,420 (CHC-D-008: state the delta and its cause; a delta of 0 is the ideal).
R4. First APK build:
   a. From apps/web: npx cap sync android (or npx cap update android — whichever the installed CLI expects; paste output).
   b. Build: cd android && ./gradlew assembleDebug (or gradlew.bat on Windows). If a release build is configured and safe, assembleRelease — NEVER paste signing passwords or key material; if signing is blocked, debug APK is acceptable for this measurement.
   c. Report: exact APK path(s), bytes per ABI or universal, MB. If ABI splits are not configured, say so (universal number only).
   d. State whether the Capacitor mismatch risk (CHC-R-003) is now resolved (same major everywhere = yes).
R5. Git: from current checkout (task/CHC-T-003), run git checkout -b task/CHC-T-004 (stacked branch — note this in the report). Stage ONLY the SCOPE files. Commit message exactly:
   feat(offline): wire SQLite persistence; align Capacitor for APK build

   Native path persists to SQLite via existing wrapper (kv key chashi.state);
   web path unchanged (localStorage). Capacitor deps aligned to one major.
   First debug APK built and measured — size evidence for CHC-D-008.

   Refs: CHC-T-004
   Then push: git push -u origin task/CHC-T-004. Paste push output + git log --stat -1 + git status --short leftovers.

ACCEPTANCE CRITERIA (each maps to a check)
A1. Coherent Capacitor major across all packages — verified by: pasted npm view/lockfile evidence.
A2. app-state wiring: native path writes/reads SQLite, web path unchanged, exports unchanged — verified by: pasted diff excerpts of the persistence functions + a pasted grep proving no route/lib file needed modification (git diff --name-only shows only SCOPE files).
A3. Gates: import exit 0 + validate ALL PASSED + build exit 0 with byte delta stated — verified by: pasted outputs.
A4. APK built and measured — verified by: pasted gradle output tail + ls/stat of the APK file(s) with exact bytes.
A5. Branch pushed — verified by: pasted git log --stat -1, ls-remote, status leftovers.

VERIFICATION (run in order; paste output)
1. npm view commands for version evidence (R1)
2. package.json edit + npm install (lockfile update; paste the three packages' resolved versions from lockfile)
3. node scripts/import-locations.mjs
4. node scripts/validate.mjs
5. npm run build + size measure
6. npx cap sync android
7. gradlew assembleDebug (+ size report)
8. git branch/stage/commit/push/status

STOP CONDITIONS (stop and report BLOCKED if)
- No coherent Capacitor major exists (plugins incompatible in both directions) — paste the conflicting version evidence; do not guess.
- gradlew fails for reasons outside your SCOPE files (missing Android SDK, license, etc.) — paste the exact error; do not install global toolchains.
- SQLite wrapper import fails at runtime on web (build or console) — the wrapper must remain lazy/native-guarded; if you cannot make the web path safe, BLOCK.
- Byte delta exceeds 20,000 bytes without a clear cause you can name in one line.
- Any AGENTS.md hard rule would be violated.

REPORT FORMAT: TASK REPORT (below). Return it to the Orchestrator via Zia.
=== END BRIEF ===

=== TASK REPORT ===
TASK ID:
AGENT ID:
STATUS:          DONE | PARTIAL | BLOCKED | FAILED
SUMMARY:         <max 5 lines>
FILES CHANGED:   <path — create/modify/delete — one-line reason>
COMMANDS RUN:    <each command + real output (trim to 40 lines each; long logs → docs/orchestration/reports/CHC-T-004.log, path in report)>
ACCEPTANCE:      A1..A5 PASS|FAIL — evidence
BYTE ACCOUNTING: <web assets bytes + delta vs 530,420, cause; APK bytes per ABI>
DEVIATIONS:      <list; "none" if none>
ASSUMPTIONS:     <list; "none" if none>
OPEN ISSUES:     <list; "none" if none>
QUESTIONS:       <exactly one, or "none">
=== END REPORT ===
```
