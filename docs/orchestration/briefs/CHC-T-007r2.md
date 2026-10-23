# CHC-T-007r2 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-007r2
TITLE:           Merge both verified branches into main and smoke-test
ASSIGNED TO:     A-IMP-1 (Implementer, integration hat)
PRIORITY:        P0
DEPENDS ON:      CHC-T-003 (DONE, VERIFIED 4ac1759), CHC-T-004 (DONE, VERIFIED 0f01eee)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: ORCHESTRATOR.md §10; DECISIONS.md CHC-D-015 (owner ruling: merges are builder work via local git merge --no-ff + push; no PR UI); CHC-D-009 (verification of both branches)
OS / SHELL:      Windows 11 / PowerShell 7 (or Git Bash). Commands from repo root.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8) twice — this task IS git work and it pushes to main.
3. Exactly this brief. ZERO file edits. You are only merging and verifying.
4. Paste real output for every step.
5. Never print secrets or credentials.
6. STOP on any conflict, any unexpected main tip, or any push rejection — report BLOCKED with exact output; never force-push, never resolve conflicts.
7. Finish with the TASK REPORT format below.

CONTEXT
Both Stage-1/2 branches are pushed and orchestrator-VERIFIED (DECISIONS.md CHC-D-009): task/CHC-T-003 @ 4ac1759 (5 files, union/upazila dataset) and task/CHC-T-004 @ 0f01eee (3 files, SQLite persistence + Capacitor v8 + measured APKs), stacked linearly. Both merges are proven conflict-free (git merge-tree, orchestrator re-ran it independently: clean tree 4ea1c7c). gh CLI is not installed and the owner has ruled (CHC-D-015) that no UI clicking is ever required — you merge locally with --no-ff merge commits (preserving both feature SHAs in history) and push main directly. The repo has no branch protection, so the push will succeed. Your working tree currently holds uncommitted governance files (AGENTS.md modified; ORCHESTRATOR.md, docs/, .agents/ untracked etc.) — they are NOT yours to commit; they must survive this task untouched and uncommitted.

OBJECTIVE
Merge task/CHC-T-003 then task/CHC-T-004 into main with --no-ff merge commits whose messages carry the VERIFIED/Refs evidence, push main, then run the integration smoke check on main and report the new tip.

SCOPE
- Git state only: branch switches, two merges, one push. ZERO working-tree file edits, ZERO staging of any pre-existing dirty/untracked file.

OUT OF SCOPE
- Any file modification or any git add of the uncommitted governance files (AGENTS.md, ORCHESTRATOR.md, docs/, .agents/, .kilo/resources/**, .clinerules/, .kilocode/, CLAUDE.md, etc.) — they stay exactly as they are
- task branches: do not delete, move, or push them
- GitHub PRs (no gh; owner ruled them out — CHC-D-015)
- apps/web/** changes of any kind

INPUTS (read first)
- docs/orchestration/DECISIONS.md — CHC-D-009, CHC-D-015
- git status --short (snapshot it before starting — paste it; must be identical after)

REQUIREMENTS (numbered; testable)
R1. Preflight: git fetch origin; git ls-remote --heads origin main task/CHC-T-003 task/CHC-T-004 — expect exactly: main = 288c197ce580622eaeb6a301d5cb1e89d1993004, task/CHC-T-003 = 4ac1759b419f66f1325f0755b57b1f1e8270b742, task/CHC-T-004 = 0f01eee62cfa9018ddf701a8e99fdc5b4f3d6e94. Any mismatch → STOP, report BLOCKED. Paste output + the git status snapshot.
R2. git switch main && git pull origin main. Paste git log --oneline -1 (expect 288c197).
R3. Merge 1 (merge commit, portable multi-flag message):
   git merge --no-ff task/CHC-T-003 -m "Merge task/CHC-T-003: union/upazila dataset wiring" -m "ORCHESTRATOR-VERIFIED: three-pillar check complete (docs/orchestration/DECISIONS.md CHC-D-009)." -m "Refs: CHC-T-003"
   Paste the merge summary. Confirm git log --oneline -1 now shows a merge commit whose second parent is 4ac1759 (git log --oneline -3).
R4. Merge 2 (same pattern):
   git merge --no-ff task/CHC-T-004 -m "Merge task/CHC-T-004: SQLite persistence, Capacitor v8, first APK measurement" -m "ORCHESTRATOR-VERIFIED: three-pillar check complete (docs/orchestration/DECISIONS.md CHC-D-009). Measured APKs arm64 3,731,526 B / armeabi 3,368,864 B; 6 MB cap met." -m "Refs: CHC-T-004"
   Paste the merge summary + git log --oneline -6 showing both 4ac1759 and 0f01eee reachable from main.
R5. git push origin main — paste the push output. Any rejection → STOP, report BLOCKED with the exact remote error.
R6. Integration smoke on main (from apps/web): node scripts/import-locations.mjs (expect exit 0, "✅ জেলা মিল ১০০%"); node scripts/validate.mjs (expect ALL CHECKS PASSED); npm run build (expect exit 0; report total build bytes, expect ≈562,822 ± 0). Paste all three outputs.
R7. Close-out checks: git log --oneline -6 (both SHAs in main); git ls-remote origin main (new tip); git status --short (identical to the R1 snapshot — nothing swept, governance files untouched); confirm task branches still at their original SHAs.

ACCEPTANCE CRITERIA
A1. Preflight exact match on all three tips — verified by: pasted ls-remote.
A2. Two --no-ff merge commits on main, messages carry ORCHESTRATOR-VERIFIED + Refs lines, both feature SHAs reachable — verified by: pasted merge outputs + git log.
A3. Push succeeded — verified by: pasted push output + post-push ls-remote.
A4. Smoke green on main (import 0 / validate PASS / build 0, bytes reported) — verified by: pasted outputs.
A5. Working tree unchanged (status identical to pre-task snapshot; task branches unmoved) — verified by: pasted before/after status + branch SHA check.

VERIFICATION (order): R1 → R2 → R3 → R4 → R5 → R6 → R7.

STOP CONDITIONS
- Any tip differs from R1's expected SHAs (someone else pushed) — report, do not proceed.
- Any merge conflict — report, never resolve.
- Push rejected — report, never force.
- Smoke fails on main — report BLOCKED with output; do not revert the merges yourself.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/NEW MAIN TIP/COMMANDS RUN/ACCEPTANCE A1–A5/BYTE ACCOUNTING (build bytes)/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
