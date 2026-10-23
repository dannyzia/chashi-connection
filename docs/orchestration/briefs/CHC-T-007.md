# CHC-T-007 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-007
TITLE:           Open PRs and merge Stage-1/2 branches to main
ASSIGNED TO:     A-IMP-1 (Implementer, integration hat)
PRIORITY:        P0
DEPENDS ON:      CHC-T-003 (DONE, VERIFIED, `4ac1759`), CHC-T-004 (DONE, VERIFIED, `0f01eee`)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: ORCHESTRATOR.md §10 (integration is its own task); AGENTS.md (🔐 stack, ⚙️ size — final numbers below); DECISIONS CHC-D-010
OS / SHELL:      Windows 11 / PowerShell 7. Commands from repo root.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8) is mandatory — this task IS git work, so read §8 twice.
3. Exactly this brief. No source-code edits whatsoever. Touch only GitHub state + branches as instructed.
4. Paste real output for every step.
5. Never print secrets, tokens, or keystore material.
6. STOP immediately if any merge would require a force-push or conflict resolution — report BLOCKED with the exact conflict; never resolve conflicts on branches you did not author in this task.

CONTEXT
Two branches are pushed, stacked, and orchestrator-VERIFIED:
- task/CHC-T-003 @ 4ac1759 — union/upazila dataset wiring (5 files)
- task/CHC-T-004 @ 0f01eee — SQLite persistence + Capacitor v8 + first measured APKs (3 files; strictly ahead of 4ac1759)
Both were verified against repo + gates + artifacts by the orchestrator (docs/orchestration/DECISIONS.md CHC-D-009). The size story is final per owner ruling CHC-D-010: 6 MB hard cap met (arm64 3,731,526 B = 3.56 MB; armeabi 3,368,864 B = 3.21 MB); ≤1 MB stretch target retired. A third branch (task/CHC-T-005, font fix) is being worked separately and is NOT part of this task.

OBJECTIVE
Open one PR per branch into main, merge both with merge commits (never squash — ledger evidence references the exact SHAs 4ac1759 and 0f01eee), then run the integration smoke check on main and report the new main tip.

SCOPE (the ONLY state you may change)
- GitHub: two PRs (task/CHC-T-003 → main, task/CHC-T-004 → main) — create and merge
- Local git: branch switching + merges ONLY; no edits to any working-tree file
- Post-merge: run validation on main

OUT OF SCOPE
- Any working-tree file modification (zero — this is integration only)
- task/CHC-T-005 (font branch — separate task, do not open or merge its PR)
- Deleting branches, force-push, rebase, squash, resolving conflicts
- The governance files still uncommitted in the working tree (AGENTS.md, ORCHESTRATOR.md, docs/, .agents/ etc.) — leave them untouched and uncommitted

INPUTS (read first)
- AGENTS.md — size + stack rules (for the PR descriptions)
- docs/orchestration/DECISIONS.md — CHC-D-009, CHC-D-010 (for the PR descriptions)

REQUIREMENTS (numbered; testable)
R1. Preflight: git fetch origin; verify origin/task/CHC-T-003 = 4ac1759 and origin/task/CHC-T-004 = 0f01eee (git ls-remote). Paste output. If either SHA differs → STOP, report BLOCKED.
R2. Open PR task/CHC-T-003 → main via gh (gh pr create --base main --head task/CHC-T-003). If gh is not authenticated or unavailable, STOP and report BLOCKED with the exact error — do not work around it; Zia will use the web link instead. Title: "feat(locations): wire union/upazila dataset into signup (CHC-T-003)". Description must include: what changed (4,617 unions bundled, locations.ts → centroids, signup union dropdown with অন্যান্য fallback, canonical-alias fix), verification (import 8/64/499/4617 100% match; validate ALL CHECKS PASSED; build 530,420 B; orchestrator-VERIFIED), Refs: CHC-T-003.
R3. Merge PR 1 with a MERGE COMMIT (gh pr merge 1 --merge). Paste merge output. NO squash, NO rebase.
R4. Open PR task/CHC-T-004 → main similarly. Title: "feat(offline): SQLite persistence; Capacitor v8; first APK measurement (CHC-T-004)". Description: Capacitor aligned to v8 (CHC-R-003 resolved); native SQLite kv['chashi.state'] write + non-blocking restore, web path unchanged; measured release APKs arm64 3,731,526 B / armeabi 3,368,864 B (6 MB cap met, ≤1 MB retired per CHC-D-010); web assets 562,822 B (+32,402 native-only lazy chunks, 0 B over-the-wire on web); orchestrator-VERIFIED; Refs: CHC-T-004.
R5. Merge PR 2 with a MERGE COMMIT. Paste merge output.
R6. Integration smoke on main: git switch main; git pull; run node scripts/import-locations.mjs (expect exit 0, 100% match) and node scripts/validate.mjs (expect ALL CHECKS PASSED) and npm run build (expect exit 0; report total build bytes — expect ≈562,822 ± 0). Paste all three outputs.
R7. Report: main tip SHA after merges (git log --oneline -4), both PR numbers/URLs, and that task branches still exist.

ACCEPTANCE CRITERIA
A1. Both origin SHAs match the VERIFIED commits — verified by: pasted ls-remote.
A2. Two PRs created with the required descriptions — verified by: pasted gh pr create outputs.
A3. Both merged via merge commits (history preserves 4ac1759 and 0f01eee) — verified by: pasted merge outputs + post-merge git log --oneline showing both SHAs in main history.
A4. Post-merge smoke on main green (import 0 / validate PASS / build 0, bytes reported) — verified by: pasted outputs.
A5. No working-tree file modified by you — verified by: pasted git status --short (only the pre-existing uncommitted governance items remain, identical list to before your task).

VERIFICATION (order): R1 preflight → R2 PR1 → R3 merge1 → R4 PR2 → R5 merge2 → R6 smoke on main → R7 report.

STOP CONDITIONS
- SHA mismatch on either branch (someone else pushed) — report, do not proceed.
- Merge conflict of any kind — report, never resolve.
- gh unavailable/unauthenticated — report BLOCKED with exact error.
- Smoke check fails on main — report BLOCKED with output; the merge stands, the defect needs an orchestrator decision.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/PRs MERGED/COMMANDS RUN/ACCEPTANCE/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
