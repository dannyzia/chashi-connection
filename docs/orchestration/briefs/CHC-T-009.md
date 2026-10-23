# CHC-T-009 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-009
TITLE:           Merge the font fix into main
ASSIGNED TO:     A-IMP-1 (Implementer, integration hat)
PRIORITY:        P0
DEPENDS ON:      CHC-T-005 (DONE, VERIFIED, b465b7d)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: DECISIONS.md CHC-D-015 (merge pattern), CHC-D-016 (font verification)
OS / SHELL:      Windows 11 / PowerShell 7 (or Git Bash). Commands from repo root.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8) twice.
3. Exactly this brief. ZERO file edits. Merging and verifying only.
4. Paste real output for every step.
5. Never print secrets or credentials.
6. STOP on any unexpected tip, any conflict, or any push rejection — report BLOCKED with exact output; never force-push.
7. Finish with the TASK REPORT format below.

CONTEXT
task/CHC-T-005 @ b465b7d (true WOFF2 font fix, 3 files) is pushed and orchestrator-VERIFIED (CHC-D-016). main is at 54433d2 (both prior merges). The merge is expected conflict-free: task/CHC-T-005 branched from main @ 54433d2, so it is strictly ahead — a fast-forward lineage with one commit. You still merge with --no-ff per the standing pattern so the merge commit carries the evidence message. Your working tree holds uncommitted governance files — NOT yours to touch.

OBJECTIVE
Merge task/CHC-T-005 into main with a --no-ff merge commit (ORCHESTRATOR-VERIFIED + Refs message), push main, run the smoke check, report the new tip.

SCOPE
- Git state only: branch switches, one merge, one push. ZERO working-tree file edits; ZERO staging of pre-existing dirty/untracked files.

OUT OF SCOPE
- Any file modification; staging/committing governance files (AGENTS.md, docs/, .agents/, .kilo/resources/**, .clinerules/, .kilocode/, CLAUDE.md, the uncommitted +kilo.json .gitignore line, etc.)
- Deleting or moving task branches; GitHub PRs; apps/web/** changes

INPUTS (read first)
- docs/orchestration/DECISIONS.md — CHC-D-015, CHC-D-016
- git status --short snapshot (paste before starting; must be identical after)

REQUIREMENTS (numbered; testable)
R1. Preflight: git fetch origin; git ls-remote --heads origin main task/CHC-T-005 — expect exactly main = 54433d245aa15f6fbfcd4461afe23ee451e28524 and task/CHC-T-005 = b465b7d7d89612bd771b4a0b041bc3d49d61a174. Any mismatch → STOP, BLOCKED. Paste output + status snapshot.
R2. git switch main && git pull origin main. Paste git log --oneline -1 (expect 54433d2).
R3. Merge:
   git merge --no-ff task/CHC-T-005 -m "Merge task/CHC-T-005: true WOFF2 Bengali font subset" -m "ORCHESTRATOR-VERIFIED: font 774f4632 @ 39,864 B, script reproducibility sha256-identical, conjunct shaping confirmed (docs/orchestration/DECISIONS.md CHC-D-016)." -m "Refs: CHC-T-005"
   Paste merge summary + git log --oneline -4 showing b465b7d reachable.
R4. git push origin main — paste output. Rejection → STOP, BLOCKED.
R5. Smoke (from apps/web): node scripts/import-locations.mjs (exit 0, 100% match); node scripts/validate.mjs (ALL CHECKS PASSED); npm run build (exit 0; total build bytes — expect ≈512,346 ± 5). Also verify the built font artifact: node -e "const b=require('fs').readFileSync('build/fonts/NotoSansBengali.woff2'); console.log(b.subarray(0,4).toString('hex'), b.length);" — expect 774f4632 39864. Paste all four outputs.
R6. Close-out: git log --oneline -4 (merge commit + b465b7d reachable); git ls-remote origin main (new tip); git status --short identical to R1 snapshot; task/CHC-T-005 still at b465b7d.

ACCEPTANCE CRITERIA
A1. Preflight tips exact — pasted ls-remote.
A2. --no-ff merge with ORCHESTRATOR-VERIFIED + Refs message; b465b7d reachable from main — pasted merge output + log.
A3. Push succeeded — pasted push + post-push ls-remote.
A4. Smoke green incl. build-font magic/size check — pasted outputs.
A5. Working tree unchanged, task branch unmoved — pasted before/after status + SHA.

VERIFICATION (order): R1 → R2 → R3 → R4 → R5 → R6.

STOP CONDITIONS
- Tip mismatch / conflict / push rejection / smoke failure — report BLOCKED with exact output; never force, never resolve, never revert.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/NEW MAIN TIP/COMMANDS RUN/ACCEPTANCE A1–A5/BYTE ACCOUNTING (build bytes)/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
