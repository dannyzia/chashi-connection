# CHC-T-005r2 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-005r2
TITLE:           Authorize venv tooling; ship a real WOFF2 subset; rewrite the font script
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P1
DEPENDS ON:      CHC-T-007r2 — the builder's --no-ff merges of task/CHC-T-003 and task/CHC-T-004 into main must have landed first (this brief's preflight verifies both SHAs are reachable from main; it also completes CHC-T-007's smoke check)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: AGENTS.md (🔐 locked stack; ⚙️ size; fonts = WOFF2 required); DECISIONS.md CHC-D-013/014 (orchestrator answers in-plan technical questions; owner takes business decisions only); RISKS CHC-R-013
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work. Everything you need is in this brief.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8) before every commit.
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step. An acceptance line without pasted evidence = an automatic reject.
5. Never print secrets or credentials.
6. One question max under QUESTIONS; BLOCKED with exact reason if a step fails for reasons outside SCOPE.
7. Finish with the TASK REPORT format below.

ANSWER TO YOUR PRIOR QUESTION (recorded by orchestrator, CHC-D-013/014):
May I install fontTools + Brotli into an isolated, gitignored venv inside the project?
→ YES, with conditions: (a) venv lives at apps/web/.venv-font/ and that path is added to the repo .gitignore in this task; (b) pip installs pinned exact versions (you report the exact pinned strings); (c) nothing is added to package.json, package-lock.json, or any requirements manifest; (d) nothing global; (e) the tools never ship in the APK or web bundle. The owner reserves a one-line veto on this authorization (CHC-D-014) — if Zia vetoes mid-task, stop and report BLOCKED.
Your prior forensics are accepted as evidence: the committed font is a fabricated container (wOFF + zlib, no table directory); the buried payload is a valid 200,048 B / 17-table TTF; subset_woff2.py cannot reproduce its own output (references a nonexistent NotoSansBengali-Regular.ttf). Your rejection of the .woff1 fallback was correct (AGENTS.md:90 requires WOFF2; fallback would ship 200 KB unsubsetted). Your GSUB/GPOS/GDEF and ZWJ/ZWNJ concerns are mandated below.

ORDER NOTE (critical): CHC-T-007r2 (builder, prompted per CHC-D-015) merges task/CHC-T-003 and task/CHC-T-004 into main with --no-ff merge commits and pushes — no UI clicking. Your preflight MUST verify both feature SHAs (4ac1759, 0f01eee) are reachable from main before any other work; that check works regardless of how the merges landed.

CONTEXT
The app has never shipped a working bundled font — every build to date renders Bengali via system-font fallback (risk CHC-R-013). You have already proven the fix is one subset command against the recovered TTF; what was missing was tooling authorization, now granted. This task also completes CHC-T-007: CHC-T-007r2 (prompted builder, CHC-D-015) merges the two verified branches into main with --no-ff merge commits and pushes; your preflight on updated main is the post-merge smoke check.

OBJECTIVE
(1) Verify the two merges landed and smoke-test main, (2) build a true WOFF2 Bengali subset with the authorized venv tooling and install it as the bundled font, (3) rewrite subset_woff2.py so it reproduces that artifact, (4) commit and push on task/CHC-T-005 and open its PR.

SCOPE (the ONLY files you may create or modify)
- apps/web/static/fonts/NotoSansBengali.woff2 — replace (true WOFF2)
- apps/web/static/fonts/subset_woff2.py — rewrite (must call pyftsubset via the venv and reproduce the committed artifact)
- .gitignore — append exactly one line: apps/web/.venv-font/
- apps/web/.venv-font/ — create (gitignored; never staged)
- Scratch TTF + temp scripts — OUTSIDE the repo (system temp dir); never staged, never committed
- Branch/commit/PR operations on the resulting change set

OUT OF SCOPE
- fonts.css (its format('woff2') declaration stays — fix the FILE, not the declaration)
- package.json / package-lock.json — untouched
- Global installs; committing the venv, the recovered TTF, or any scratch file
- android/, routes/, lib/, docs/orchestration/**
- task/CHC-T-008 and its files

INPUTS (read first)
- AGENTS.md — 🔐 locked stack, ⚙️ size constraints
- apps/web/static/fonts/subset_woff2.py — current broken script (rewrite target)
- apps/web/static/fonts/fonts.css — the @font-face contract (do not edit)
- Your CHC-T-005 report — your own forensics; re-derive everything from committed bytes (do NOT reuse /tmp/recovered.ttf from the prior session)

REQUIREMENTS (numbered; each testable)
R0. PREFLIGHT (this doubles as the CHC-T-007 post-merge smoke):
    a. git switch main && git pull origin main. Verify both SHAs are in main history: git log --oneline -6 must show 4ac1759 and 0f01eee (merge commits acceptable). If absent → STOP, report BLOCKED (merges not done yet).
    b. From apps/web: node scripts/import-locations.mjs → expect exit 0, "✅ জেলা মিল ১০০%"; node scripts/validate.mjs → expect ALL CHECKS PASSED; npm run build → expect exit 0, report total bytes (expect ≈562,822 ± 0). Paste all three outputs. This closes CHC-T-007's outstanding smoke.
R1. Venv: python -m venv apps/web/.venv-font; activate it (or call its python by path); pip install with EXACT pins — resolve current stable versions first (pip index or pip install fonttools== brotli== with the versions you resolve; paste the exact pinned install line and the pip show output for both packages). Add the .gitignore line from SCOPE. Paste git status --short proving the venv is ignored.
R2. Re-derive the source TTF from committed bytes (do not trust prior /tmp files): read apps/web/static/fonts/NotoSansBengali.woff2 as bytes, zlib.decompress(b[12:]), write to a temp path outside the repo; verify sfnt magic 00010000, size 200,048, 17 tables. Paste the verification output.
R3. Produce the true WOFF2 subset (the exact command, adjusted only for the resolved pins/paths):
    <venv-python> -m fontTools.subset <temp-recovered.ttf> --flavor=woff2 --layout-features='*' --unicodes="U+0020-007E,U+00A0,U+00B7,U+0980-09FF,U+200C-200D,U+2013,U+2014,U+2018-201D,U+2026" --no-hinting --output-file=apps/web/static/fonts/NotoSansBengali.woff2
    (The '--layout-features=*' and the U+200C-200D range are MANDATORY — Bengali conjuncts and ZWJ/ZWNJ shaping break silently without them; do not trim either.)
    Overwrite the committed file. Verify: first four bytes = 77 4f 63 32 ("wOF2" — note: 77 4f 46 32; paste the hex check). Report the new file size in bytes and the delta vs the old 94,819 B.
R4. Rewrite subset_woff2.py: it must (a) take the source-TTF path as an argument, (b) invoke the venv's python -m fontTools.subset with the SAME flags as R3 (constants in the script), (c) document the venv path + pinned versions + activation in a Bengali header comment, (d) actually reproduce the R3 output (prove it: run the rewritten script on the recovered TTF to a temp output, sha256-compare against the committed R3 artifact — paste both hashes, they must match). The script must no longer reference NotoSansBengali-Regular.ttf or contain any hand-rolled container code.
R5. Browser check: npx vite preview; confirm console has NO "Failed to decode downloaded font" error and /fonts/NotoSansBengali.woff2 returns 200; also confirm Bengali conjuncts render (the signup page's "বাংলাদেশ" and any ক্ষ/ত্র conjunct visible on the home feed are enough). Paste console/network evidence. Stop the preview server.
R6. Gates + bytes: node scripts/import-locations.mjs → exit 0; node scripts/validate.mjs → ALL CHECKS PASSED; npm run build → exit 0; report total build bytes and delta vs the R0 baseline (a shrink is expected — the font shrank; state the number).
R7. Git: git switch -c task/CHC-T-005 (from updated main). Stage ONLY: apps/web/static/fonts/NotoSansBengali.woff2, apps/web/static/fonts/subset_woff2.py, .gitignore. Verify staged list; commit message exactly:
   fix(fonts): replace fabricated font container with true WOFF2 subset

   subset_woff2.py hand-rolled wOFF+zlib (no WOFF table directory), so
   every build to date shipped a font browsers rejected and Bengali
   rendered via system fallback. Regenerated a real WOFF2 subset from the
   TTF recovered out of the old container (fontTools+brotli in a pinned,
   gitignored build venv); script rewritten to reproduce it.

   Refs: CHC-T-005
   Push: git push -u origin task/CHC-T-005. If gh is unavailable: report the push output + the compare URL and stop — the branch gets merged by a later prompted merge pass in the CHC-T-007r2 pattern (CHC-D-015: no UI clicking, ever). If gh IS available: open the PR (same description as the commit body) and leave it unmerged pending orchestrator VERIFIED.

ACCEPTANCE CRITERIA (each maps to a check)
A1. Merges verified on main + smoke green — verified by: pasted R0 outputs (log with both SHAs, import/validate/build).
A2. Venv created, pinned, gitignored, nothing global/manifest — verified by: pasted pip install line, pip show outputs, git status --short (venv absent/ignored).
A3. True WOFF2 installed (magic 77 4f 46 32) + size delta stated — verified by: pasted hex check + byte figures.
A4. Conjunct shaping preserved (layout-features '*', ZWJ/ZWNJ in unicodes) — verified by: pasted exact pyftsubset command line.
A5. Script reproducibility — verified by: pasted sha256 pair (script output == committed artifact).
A6. Browser clean (no decode error, 200, conjuncts render) — verified by: pasted evidence.
A7. Gates + build exit 0 with byte delta — verified by: pasted outputs.
A8. Branch pushed; PR opened if gh exists, else compare URL reported — verified by: pasted git log --stat -1 + push/PR output.

VERIFICATION (order): R0 preflight/smoke → R1 venv → R2 re-derive → R3 subset → R4 script rewrite + reproducibility → R5 browser → R6 gates → R7 git.

STOP CONDITIONS
- Main does not contain both SHAs (R0) — report BLOCKED; do not proceed.
- pip install fails (network/registry) — paste the exact error; do not retry more than twice; do not install globally.
- Subset output exceeds 94,819 B — do not ship silently; report the number and stop for orchestrator review (a true WOFF2 subset should be smaller; larger means the flags or coverage need review).
- Browser still shows a decode error after R3 — report with evidence; do not ship additional format experiments.
- Owner vetoes the venv authorization mid-task (CHC-D-014) — stop, report BLOCKED.
- Any AGENTS.md hard rule would be violated.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A8/BYTE ACCOUNTING (old font, new font, build total + delta)/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
