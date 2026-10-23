# CHC-T-003r2 — Correction Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-003r2
TITLE:           Fix district alias mismatch; audit, commit and push CHC-T-003
ASSIGNED TO:     A-IMP-1 (Implementer; you are also auditor for this task — no other agent touched this code except the recorded internal-subagent deviation, see docs/orchestration/DECISIONS.md CHC-D-006)
PRIORITY:        P0
DEPENDS ON:      CHC-T-003 (work already on disk, uncommitted)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: AGENTS.md; .kilo/plans/plan/PRD-V5.0.md §6; docs/orchestration/briefs/CHC-T-003.md (original brief); docs/orchestration/DECISIONS.md (CHC-D-005/006/007)
OS / SHELL:      Windows 11 / PowerShell 7. Commands run from D:\My Projects\Future Projects\Chashi Connection\apps\web unless stated.

You are A-IMP-1, role Implementer. You have no memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read the project context file (AGENTS.md at project root) before anything else. Its hard rules override this brief. If they conflict, stop and report BLOCKED.
2. Load your role skill: .agents/skills/rhizome-builder/SKILL.md (project-local copy). Its git-hygiene checklist (§8) is mandatory for step 4 of this brief.
3. Do exactly what this brief says. Do no extra work. Do not refactor, rename, or reformat anything not listed under SCOPE.
4. Touch only the files listed under SCOPE. If you need another file, stop and report BLOCKED.
5. Do not invent facts, numbers, or names. If you do not know, write UNKNOWN.
6. Run every step under VERIFICATION and paste the real output. Never write "should work" without pasted output. An acceptance line without pasted evidence is an automatic reject.
7. Never print, store, or request secrets, credentials, or personal data.
8. If anything is ambiguous, stop and put exactly one question under QUESTIONS. Do not guess.
9. If you cannot complete a step, report BLOCKED with the reason. Do not improvise.
10. Finish by writing the TASK REPORT in the exact format given at the end of this brief.

CONTEXT
CHC-T-003 integrated a Bengali union dataset into the app but is IN_REVIEW with one verified defect and a pending commit. DEFECT (verified by the orchestrator, exit code 1): scripts/import-locations.mjs cross-checks every district declared in src/lib/data/locations.ts against the generated dataset. locations.ts declares `নারায়ণগঞ্জ` (standard spelling) while the dataset contains only `নারায়াণগঞ্জ` (39 rows, extra আ-কার; see .kilo/resources/BD-Div-Dis-Zilla-Upazila-Union/bd-unions.json lines ~19144–19486). NFKC normalization does not unify vowel signs, so the lookup misses and the script exits 1. The dataset is the declared source of truth for upazila/union names, but the UI must keep the standard district spelling. The agreed fix is a canonical-spelling ALIAS applied inside BOTH norm() implementations (script and locations.ts), identical in behavior. All other gates already pass when the script's exit code is ignored: validate.mjs ALL CHECKS PASSED; npm run build exit 0 (web assets 530,284 bytes = 0.506 MB); generated file byte-deterministic across runs (SHA256 77F7B3D4… repeated). After the fix you will audit the whole CHC-T-003 change, then commit it on a task branch and push — commit and push are YOUR duties per project standing rule (DECISIONS.md CHC-D-007).

OBJECTIVE
Make the import script pass its own district cross-check via a documented canonical-spelling alias, re-verify all gates, then commit the complete CHC-T-003 change set on task/CHC-T-003 and push it to origin.

SCOPE (the ONLY files you may create or modify)
- apps/web/scripts/import-locations.mjs — modify (add alias map to its norm())
- apps/web/src/lib/data/locations.ts — modify (add the same alias map to its norm())
- apps/web/src/lib/data/locations-unions.ts — regenerate via the script only
- Branch/commit operations on the existing uncommitted change set (no other file edits)

OUT OF SCOPE (you MUST NOT do these)
- Editing .kilo/resources/** data files
- bn.ts, app-state.svelte.ts, logic/*, schema.sql, android/, package.json, docs/orchestration/**
- Committing any file not listed under "COMMIT SET" below; merging to main; touching other branches
- Installing dependencies

INPUTS (read these first)
- AGENTS.md (project root) — hard rules incl. Bengali-only text, bright lines, validation checklist
- .agents/skills/rhizome-builder/SKILL.md — especially §8 git hygiene checklist
- apps/web/scripts/import-locations.mjs — current norm() at top of file
- apps/web/src/lib/data/locations.ts — current norm() at lines ~12–18
- docs/orchestration/DECISIONS.md — CHC-D-006/007 for the commit rules

REQUIREMENTS (numbered; each is testable)
R1. Add a canonical-spelling alias map to scripts/import-locations.mjs: a module-level constant, e.g.
    `const নামেরঅ্যালিয়াস = { 'নারায়াণগঞ্জ': 'নারায়ণগঞ্জ' };`
    applied at the END of norm() (after NFKC/zero-width-strip/whitespace-collapse/trim): if the normalized string is a key in the map, return the mapped value. Add a one-line Bengali comment explaining the alias maps dataset spelling variants to the canonical spelling used in the UI. Do not change any other normalization behavior.
R2. Apply the IDENTICAL alias map and logic to norm() in src/lib/data/locations.ts (same constant name, same comment).
R3. Run `node scripts/import-locations.mjs` — must exit 0 with counts 8 divisions / 64 districts / 499 upazilas / 4,617 unions and print "✅ জেলা মিল ১০০%". The regenerated locations-unions.ts must remain byte-deterministic: run the script twice, SHA256 both outputs (Get-FileHash), hashes must be equal.
R4. Run `node scripts/validate.mjs` — must end "✅ ALL CHECKS PASSED", exit 0.
R5. Run `npm run build` — must exit 0; report total build-directory bytes (must stay < 6,000,000).
R6. AUDIT: re-verify the CHC-T-003 change against the original brief (docs/orchestration/briefs/CHC-T-003.md): no inline 'উপজেলাসমূহ:' in locations.ts; ইউনিয়নতালিকা/উপজেলাতালিকা dataset lookups present; signup union select with 'অন্যান্য (লিখুন)' fallback and effective-union validation; all new UI text Bengali; no bright-line words (cart|checkout|order|payment|escrow|refund|invoice|payout|fee|commission) in the three source files. Paste your audit evidence (grep/Select-String outputs).
R7. GIT (builder-only duty per CHC-D-007). From the repo root:
    a. `git checkout -b task/CHC-T-003` (if the branch already exists, use it: `git switch task/CHC-T-003`).
    b. Stage EXACTLY the COMMIT SET below (use explicit paths; do NOT `git add -A`/`git add .`).
    c. COMMIT SET (only these paths):
       - apps/web/scripts/import-locations.mjs
       - apps/web/src/lib/data/locations-unions.ts
       - apps/web/src/lib/data/locations.ts
       - apps/web/src/routes/signup/+page.svelte
       - .kilo/resources/BD-Div-Dis-Zilla-Upazila-Union/bd-unions.json   (dataset required for reproducibility; not gitignored — verified .kilo/.gitignore and root .gitignore)
    d. Commit message exactly:
       feat(locations): wire union/upazila dataset into signup
       4,617 unions bundled (PRD §6.7); locations.ts reduced to district
       centroids; signup union dropdown with অন্যান্য fallback; canonical-
       spelling alias for নারায়াণগঞ্জ.

       Refs: CHC-T-003
    e. `git push -u origin task/CHC-T-003` — must succeed.
    f. Paste: `git log --stat -1` (full), `git status --short` after commit (list what REMAINS uncommitted — you must NOT have swept in: .gitignore modification, kilo.json staged deletion, deleted legacy .kilo/resources files, .agents/.clinerules/.kilocode dirs, docs/).

ACCEPTANCE CRITERIA (each maps to a check)
A1. Import exits 0 with 8/64/499/4617 and "✅ জেলা মিল ১০০%" — verified by: pasted full output of `node scripts/import-locations.mjs`.
A2. Alias maps present and identical in both norm() implementations — verified by: pasted Select-String output for 'নামেরঅ্যালিয়াস' in both files.
A3. Determinism — verified by: pasted SHA256 of locations-unions.ts from two consecutive runs, equal.
A4. validate.mjs ALL CHECKS PASSED, exit 0 — verified by: pasted full output.
A5. Build exit 0, total bytes < 6,000,000 — verified by: pasted tail + byte count.
A6. Audit evidence per R6 — verified by: pasted Select-String/grep outputs (উপজেলাসমূহ: zero matches in locations.ts; bright-line grep empty; signup excerpt).
A7. Branch pushed — verified by: pasted `git log --stat -1` (shows the 5 files, message with Refs: CHC-T-003), push output, and post-commit `git status --short` listing leftover uncommitted items.

VERIFICATION (run in order; paste output)
1. node scripts/import-locations.mjs
2. node scripts/import-locations.mjs  (again, for determinism) + Get-FileHash both runs
3. node scripts/validate.mjs
4. npm run build  + build-size measure
5. git operations per R7 (checkout/stage/commit/push/status)

STOP CONDITIONS (stop and report BLOCKED if)
- The alias fix does not make the import exit 0 (report the exact remaining mismatch pairs instead of inventing more aliases).
- Push is rejected (auth/remote policy) — paste the error, do not force-push.
- Any file outside the COMMIT SET would be required for the commit to work.
- Any AGENTS.md hard rule would be violated.

REPORT FORMAT: TASK REPORT (below). Return it to the Orchestrator via Zia.
=== END BRIEF ===

=== TASK REPORT ===
TASK ID:
AGENT ID:
STATUS:          DONE | PARTIAL | BLOCKED | FAILED
SUMMARY:         <max 5 lines>
FILES CHANGED:   <path — create/modify/delete — one-line reason>
COMMANDS RUN:    <each command + real output (trim to 40 lines each)>
ACCEPTANCE:      A1..A7 PASS|FAIL — evidence
DEVIATIONS:      <list; "none" if none>
ASSUMPTIONS:     <list; "none" if none>
OPEN ISSUES:     <list; "none" if none>
QUESTIONS:       <exactly one, or "none">
=== END REPORT ===
```
