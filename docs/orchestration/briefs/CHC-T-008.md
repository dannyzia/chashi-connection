# CHC-T-008 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-008
TITLE:           Land the governance record set (contract + orchestration docs)
ASSIGNED TO:     A-IMP-1 (Implementer, housekeeping hat)
PRIORITY:        P0
DEPENDS ON:      CHC-T-007 (both Stage-1/2 branches merged to main first — see ORDER note)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: DECISIONS.md CHC-D-007 (commit/push = builder work); the files themselves
OS / SHELL:      Windows 11 / PowerShell 7. Commands from repo root.

You are A-IMP-1, role Implementer. No memory of earlier work.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8) twice — this task IS git work.
3. Exactly this brief. ZERO source-code edits. You are only landing already-written documentation.
4. Paste real output for every step.
5. Never print secrets or tokens.

ORDER NOTE (critical): run this task AFTER CHC-T-007 has merged task/CHC-T-003 and task/CHC-T-004 into main. Start this branch from updated main (git switch main && git pull first), so the docs PR shows only documentation.

CONTEXT
The project's contract and orchestration records were written by the orchestrator directly (Zia-authorized) but live only in the uncommitted working tree: AGENTS.md is modified-uncommitted; ORCHESTRATOR.md, docs/ (orchestration records), and .agents/ (role skills) are entirely untracked. Until committed, the verified size story, decisions, risks, briefs and reports exist only on this machine, and CHC-D-007 (commits are builder work) means the landing is your job. The builder working on the prior task correctly identified this gap.

OBJECTIVE
Commit and push exactly the governance record set on branch task/CHC-T-008, open its PR, and merge with a merge commit — making the contract (AGENTS.md v-current with LOCKED TECH STACK + size rulings) and the full orchestration history part of the repository.

SCOPE (the ONLY paths to stage — explicit pathspec, never `git add -A`)
- AGENTS.md                          (modified tracked file — commit as-is)
- ORCHESTRATOR.md                    (new — project root)
- docs/                              (new — entire tree: LEDGER.md, DECISIONS.md, RISKS.md, briefs/*, reports/*)
- .agents/                           (new — role skills: .agents/skills/rhizome-orchestrator/**, .agents/skills/rhizome-builder/**)
- .gitignore                         (modified tracked file — commit as-is)
- kilo.json                          (deletion ALREADY staged in the index — include it; do not re-stage)

OUT OF SCOPE (must remain uncommitted — do not stage, do not delete, do not gitignore)
- All of .kilo/resources/** (both the staged legacy deletions Jasons.zip/Jasons*/json.zip/json* AND the untracked BD-Div-Dis-Zilla-Upazila-Union/** directory) — Zia's data reorg gets its own decision; not this task
- .clinerules/, .kilocode/, CLAUDE.md, .agent-tracker.json, "10 mcp-local-tunnel.bat", .mcp.json (gitignored), .tmp/ (gitignored)
- Any file under apps/web/

INPUTS (read first)
- docs/orchestration/DECISIONS.md — CHC-D-007 (why you are doing this)
- The final git status --short you will start from — paste it before staging so the pre-state is on record

REQUIREMENTS (numbered; testable)
R1. Preflight: git switch main && git pull origin main. Verify CHC-T-003 and CHC-T-004 SHAs (4ac1759, 0f01eee) are in main history (git log --oneline -6). Paste output. If they are NOT there → STOP, report BLOCKED (CHC-T-007 has not completed).
R2. Paste git status --short (the pre-state).
R3. git switch -c task/CHC-T-008
R4. Stage the SCOPE paths with an explicit pathspec (one git add command with all six paths). Verify with git status --short that ONLY the intended paths are staged and NOTHING from OUT OF SCOPE is staged. Paste the staged list.
R5. Commit message exactly:
   docs(orchestration): land contract and orchestration records

   AGENTS.md (boot sequence, orchestrator protocol, locked stack,
   size rulings CHC-D-008/010), ORCHESTRATOR.md v2.1, full
   docs/orchestration/ tree (ledger, decisions, risks, briefs,
   reports), and project role skills under .agents/skills/.

   Refs: CHC-T-008
R6. git push -u origin task/CHC-T-008 (paste output). Open PR: gh pr create --base main --head task/CHC-T-008, title "docs(orchestration): land contract and orchestration records (CHC-T-008)", description = one paragraph: lands the verified contract + full 2026-10-23 orchestration history; docs-only, zero code. If gh unavailable → STOP with exact error (Zia merges via web link).
R7. Merge with merge commit (gh pr merge --merge). Paste output.
R8. Post-merge: git switch main && git pull; run node apps/web/scripts/validate.mjs (expect ALL CHECKS PASSED — sanity that nothing in apps/web was disturbed); paste git log --oneline -3.

ACCEPTANCE CRITERIA
A1. Branch started from main containing both Stage-1/2 SHAs — verified by: pasted preflight log.
A2. Staged set == exactly the six SCOPE paths, nothing from OUT OF SCOPE — verified by: pasted git status --short (staged section) and git diff --cached --stat.
A3. Commit message exact with Refs: CHC-T-008 — verified by: pasted git log -1.
A4. PR opened and merged via merge commit; main history shows the docs commit — verified by: pasted gh outputs + post-merge log.
A5. validate.mjs on main still ALL CHECKS PASSED — verified by: pasted output.

VERIFICATION (order): R1 preflight → R2 status → R3 branch → R4 stage+verify → R5 commit → R6 push+PR → R7 merge → R8 main sanity.

STOP CONDITIONS
- CHC-T-007 not yet merged into main (R1) — report BLOCKED, do not proceed.
- Any OUT-OF-SCOPE path would be included by git's pathspec resolution — stop, list the conflict.
- gh unavailable — report BLOCKED with the exact error.
- validate fails on main post-merge — report BLOCKED with output.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
