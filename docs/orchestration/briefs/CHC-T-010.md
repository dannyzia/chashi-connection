# CHC-T-010 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-010
TITLE:           Move the font-subset script out of static/ so it stops shipping
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P2
DEPENDS ON:      CHC-T-008 (main @ 52b988a is the base)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: AGENTS.md ⚙️ size (byte deltas mandatory); DECISIONS CHC-D-008/015/018
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. Touch only SCOPE files.
4. Paste real output for every step. An acceptance line without pasted evidence = an automatic reject.
5. Never print secrets or credentials.
6. One question max; BLOCKED with exact reason if a step fails outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
SvelteKit copies everything under static/ into the web build. static/fonts/subset_woff2.py (5,410 B of Python, the CHC-T-005r2 rewrite) therefore ships to every user in build/fonts/ — waste under the byte-budget rule (CHC-D-008). The script belongs with the other build scripts in apps/web/scripts/ (import-locations.mjs lives there). fonts.css must stay in static/fonts/ — it is served. The git switch-blocker is gone (CHC-D-018: kilo.json retired), so this task works on branches in place.

OBJECTIVE
Relocate subset_woff2.py to apps/web/scripts/subset-font.py, fix its internal path resolution, prove it still reproduces the committed font byte-for-byte, verify the build no longer contains any .py, then commit, push, and merge per the standing pattern.

SCOPE (the ONLY files you may create or modify)
- apps/web/static/fonts/subset_woff2.py — delete (via git mv semantics: new file + deletion in one commit)
- apps/web/scripts/subset-font.py — create (the relocated, path-fixed script)
- Branch/commit/merge/push operations

OUT OF SCOPE
- fonts.css (stays in static/fonts/ — served asset)
- NotoSansBengali.woff2 (the committed artifact must remain byte-identical — prove it)
- package.json, .gitignore, docs/, android/, any route/lib file
- The venv (apps/web/.venv-font/ — untouched, still gitignored)

INPUTS (read first)
- apps/web/static/fonts/subset_woff2.py — the current script (relocation source)
- docs/orchestration/reports/CHC-T-005r2.md — its verification evidence (sha256 a9db5165…)

REQUIREMENTS (numbered; testable)
R1. git switch main && git pull; verify tip 52b988a. git switch -c task/CHC-T-010.
R2. Relocate: read the current script, write apps/web/scripts/subset-font.py with (a) the venv path resolved from the NEW location (apps/web/.venv-font — one directory up from scripts/, not the old static/fonts-relative path), (b) the source-TTF argument behavior unchanged, (c) the same pyftsubset flags as constants (layout-features='*', the full --unicodes set incl. U+200C-200D, --no-hinting, --flavor=woff2), (d) the Bengali header comment updated to the new path + pinned versions (fontTools 4.67.0, brotli 1.2.1). Delete the old static/fonts/subset_woff2.py.
R3. Reproduction proof: re-derive the source TTF (zlib.decompress of the committed font's bytes[12:] to a temp path), run the relocated script against it to a temp output, sha256-compare with apps/web/static/fonts/NotoSansBengali.woff2 — must match (a9db5165…). Paste both hashes. The committed font file must be untouched: git status must show NO modification to it.
R4. Gates + byte proof (from apps/web): node scripts/import-locations.mjs → exit 0 100% match; node scripts/validate.mjs → ALL CHECKS PASSED; rm -rf build && npm run build → exit 0; report total build bytes and delta vs 512,341 (expect −5,410: the .py no longer copied). Verify: node -e "const fs=require('fs'); console.log(fs.readdirSync('build/fonts'));" — expect NO .py entry (only NotoSansBengali.woff2 and fonts.css). Also re-check build font magic 774f4632 39864.
R5. Commit (explicit pathspec; nothing else staged):
   build(fonts): move subset script out of static so it stops shipping

   static/ is copied verbatim into the web build, so subset_woff2.py
   (5,410 B Python) shipped to users. Relocated to apps/web/scripts/
   with path resolution fixed for the new location; reproduction proof
   unchanged (sha256-identical). Web assets −5,410 B.

   Refs: CHC-T-010
R6. Push task/CHC-T-010; then merge to main per CHC-D-015: git switch main && git pull; git merge --no-ff task/CHC-T-010 -m "Merge task/CHC-T-010: font-subset script relocation" -m "ORCHESTRATOR-PENDING-VERIFICATION: byte proof −5,410 B, reproduction sha256-identical (evidence in task report)." -m "Refs: CHC-T-010"; git push origin main. (Use the PENDING marker — do NOT stamp ORCHESTRATOR-VERIFIED; that is mine after audit.) Paste all outputs.

ACCEPTANCE CRITERIA
A1. Script relocated; old file gone; new file resolves the venv correctly — verified by: pasted R3 reproduction (sha256 pair identical) + git show --stat of the commit (2 files: A scripts/subset-font.py, D static/fonts/subset_woff2.py).
A2. Committed font byte-untouched — verified by: git status (no modification) + magic/size read 774f4632 39864 after build.
A3. Build contains no .py; total bytes delta = −5,410 ± 5 — verified by: readdirSync('build/fonts') + byte report.
A4. Gates green — verified by: pasted import/validate/build outputs.
A5. Merged to main and pushed — verified by: pasted merge + push outputs + ls-remote.

VERIFICATION (order): R1 → R2 → R3 → R4 → R5 → R6.

STOP CONDITIONS
- Reproduction sha256 mismatch (script behavior changed) — stop, report, do not commit.
- Build delta does not match −5,410 ± 5 — stop, report the number and cause.
- Any gate fails; any push rejection; any tip mismatch — report BLOCKED with exact output.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A5/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
