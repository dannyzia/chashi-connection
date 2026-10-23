# CHC-T-003 — Brief (archived as sent, 2026-10-23)

> NOTE (appended by orchestrator, CHC-D-006): this brief was executed by an internal subagent instead of the roster builder — process deviation, recorded in DECISIONS.md. Result kept provisionally; correction brief: CHC-T-003r2.

```
=== TASK BRIEF ===
TASK ID:         CHC-T-003
TITLE:           Wire union/upazila dataset into app
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      none (WIP files already on disk, verified)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md
SOURCE OF TRUTH: AGENTS.md (root); .kilo/plans/plan/PRD-V5.0.md §6 (location hierarchy, §6.7 bundling)
OS / SHELL:      Windows 11 / PowerShell 7 (pwsh). All commands from apps/web.

[Agent preamble: read AGENTS.md first → role skill .agents/skills/rhizome-builder/SKILL.md → exact-scope work → evidence with pasted output → TASK REPORT format]

CONTEXT
The app (apps/web, SvelteKit 5 + Svelte runes) has a hand-maintained location file src/lib/data/locations.ts (8 divisions, 64 districts with lat/lng centroids, 494 upazila names inline). A prepared import script scripts/import-locations.mjs reads ../.kilo/resources/BD-Div-Dis-Zilla-Upazila-Union/bd-unions.json (4,617 unions with division/district/upazila names in Bengali) and generates src/lib/data/locations-unions.ts containing ইউনিয়নগাছ (division→district→upazila→union[]) and উপজেলাগাছ (division→district→upazila[]). The script has NOT been run since its last edit. Known data defects to be made irrelevant by this refactor: 9 upazilas in locations.ts are misspelled or wrong (they are towns, not upazilas, or misplaced). All hierarchy names for upazila/union must come from the generated dataset (single source of truth); locations.ts keeps only division/district names and centroids. This is an offline-first Android Go app: all user-facing text MUST be Bengali.

OBJECTIVE
Make signup offer real union dropdowns (4,617 unions) and dataset-driven upazila lists, with locations.ts reduced to centroids, and all checks plus the production build passing.

SCOPE
- apps/web/src/lib/data/locations-unions.ts — regenerate via the script (do not hand-edit)
- apps/web/src/lib/data/locations.ts — modify
- apps/web/src/routes/signup/+page.svelte — modify
- apps/web/.tmp/diag-unions.mjs — delete (temp diagnostic, stale)

OUT OF SCOPE
- bn.ts, app-state.svelte.ts, logic/* (feed/dist/safety), schema.sql, android/, package.json, docs/orchestration/**
- Any git command other than read-only. Installing dependencies. Changing validation scripts.
- Village-level coordinates or GPS anything (villages stay user-entered free text)

REQUIREMENTS
R1. Run the import: `node scripts/import-locations.mjs` — must exit 0 and print 8 divisions, 64 districts, 499 upazilas, 4,617 unions, "✅ জেলা মিল ১০০%". Generated file must export ইউনিয়নগাছ and উপজেলাগাছ.
R2. Refactor locations.ts: জেলাNode → {নাম, lat, lng}; delete all inline উপজেলাসমূহ arrays; import উপজেলাগাছ/ইউনিয়নগাছ; module-private norm() identical to import script's (NFKC, strip U+200B/U+200C/U+200D/U+FEFF, collapse whitespace, trim); উপজেলাতালিকা keeps name/signature, reads উপজেলাগাছ with normalized lookup; add ইউনিয়নতালিকা(বিভাগ, জেলা, উপজেলা); preserve বিভাগসমূহ/বিভাগতালিকা/জেলাতালিকা/জেলাস্থানাঙ্ক behavior.
R3. signup step 5: union select fed by ইউনিয়নতালিকাসমূহ(বিভাগ, জেলা, উপজেলা) with final option "অন্যান্য (লিখুন)" (value অন্যান্য) revealing a free-text input (ইউনিয়নঅন্যান্য); effective union validated non-empty (bn.ত্রুটি_ঠিকানা), stored in user.ইউনিয়ন; dependent resets include ইউনিয়নঅন্যান্য; গ্রাম stays free text; all new UI text Bengali.
R4. Delete apps/web/.tmp/diag-unions.mjs.
R5. `node scripts/validate.mjs` → ALL CHECKS PASSED.
R6. `npm run build` → exit 0; paste last ~15 lines.

ACCEPTANCE CRITERIA
A1 import report 8/64/499/4617, exit 0, 100% district match | A2 Select-String 'উপজেলাসমূহ:' on locations.ts → 0 matches | A3 ইউনিয়নতালিকা present with normalized lookup | A4 signup union select + অন্যান্য branch in diff | A5 validate.mjs ALL CHECKS PASSED | A6 build exit 0

VERIFICATION
1. node scripts/import-locations.mjs
2. Select-String -Path src/lib/data/locations.ts -Pattern 'উপজেলাসমূহ:'
3. node scripts/validate.mjs
4. npm run build

STOP CONDITIONS
- Import exits non-zero (district mismatch) — do not hand-fix the dataset.
- Build fails with errors outside SCOPE files.
- Any AGENTS.md hard rule would be violated.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
