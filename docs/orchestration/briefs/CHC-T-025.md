# CHC-T-025 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-025
TITLE:           Moderation persistence: reports + blocks through RLS
ASSIGNED TO:      A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-026 (main @ d667158 base)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §12.4 (report categories — verbatim), §12.2 (block = silent, one-way); AGENTS.md (offline-first, Bengali-only, bright lines); migrations 00001 (reports/blocks policies: reports INSERT own + SELECT own only; blocks own-row CRUD)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (tokens, keys, .env — variables only; session tokens digest-only).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
Moderation is the last persistence face still local-only. The report modal on listing/[id] (all PRD §12.4 categories, Bengali) currently ends in an alert — nothing persists. Blocks are local-only (profile block list + the feed's block filter). The live tables: reports (reporter_id, target_type CHECK product|user|message, target_id, category, details; RLS: INSERT own via reports_যোগ, SELECT own only — nobody sees others' reports, by design) and blocks (blocker/blocked + UNIQUE pair + self-block CHECK; RLS: own-row CRUD via blocks_পঠন_নিজের/যোগ/সম্পাদনা/মুছে_ফেলা). OFFLINE-FIRST absolute: reports and blocks are exactly the operations that must work with NO network (a woman reporting harassment on a 2G connection cannot be told "no internet") — so the pattern is: local state FIRST, queue entry, session-gated server INSERT with flush, failures stay queued. Session absent → queue only.

OBJECTIVE
(1) Report submissions INSERT into reports (session-gated; queued offline), (2) block/unblock persists into blocks (session-gated; queued offline), (3) the feed's block filter continues to work identically from local state regardless, (4) zero changes to the feed algorithm or any other feature, (5) gates + bytes, (6) merged with ORCHESTRATOR-PENDING-VERIFICATION.

SCOPE (the ONLY files you may create or modify)
- apps/web/src/lib/moderation.ts — create (report/block/unblock helpers + queue flush extension)
- apps/web/src/lib/app-state.svelte.ts — modify (flush extension for 'রিপোর্ট'/'ব্লক' queue kinds; a blocks-server-sync hook mirroring সেশনসিঙ্ক pattern — minimal)
- apps/web/src/routes/listing/[id]/+page.svelte — modify ONLY the report modal submit (persist instead of alert-only)
- apps/web/src/routes/profile/+page.svelte — modify ONLY the block/unblock actions (persist alongside local)
- apps/web/src/lib/bn.ts — ONLY if a genuinely new Bengali string is needed (reuse first)
- Branch/commit/merge/push

OUT OF SCOPE
- Admin anything (no admin UI, no admin policies, no "hide after N reports" logic server-side — the operator dashboard handles that era; here we only PERSIST reports/blocks)
- Any change to feed logic, chat, auth, the function, migrations (reports/blocks tables already exist with policies — do not touch schema.sql or migrations)
- package.json; docs/; android/
- Showing other users' reports anywhere (reports are SELECT-own only — preserve that)

INPUTS (read first)
- apps/web/src/routes/listing/[id]/+page.svelte — the report modal (categories, submit → alert today)
- apps/web/src/routes/profile/+page.svelte — the block list UI (local add/remove)
- apps/web/src/lib/app-state.svelte.ts — blocks state shape, সারি item kinds, সারিফ্লাশ (T-026 version), সেশনসিঙ্ক pattern
- apps/web/src/lib/server-feed.ts + server-chats.ts — the established null-safe/session-gated module pattern (mirror it)
- supabase/migrations/00001_init.sql — reports/blocks columns + policies (reports_যোগ: reporter_id = auth.uid(); blocks own-row)

REQUIREMENTS (numbered; testable)
R1. src/lib/moderation.ts (mirror the server-feed/server-chats pattern: null-safe, never-throw, session-gated):
    a. রিপোর্টজমা(target_type, target_id, category, details): INSERT {reporter_id: session uid, target_type, target_id, category, details: null-if-empty}; returns {ok} — failure never throws.
    b. ব্লকজমা(blocked_id): INSERT {blocker_id: session uid, blocked_id} — duplicate pair is IMPOSSIBLE to re-insert (UNIQUE) → treat the unique-violation as success (idempotent; detect via error code 23505 and return {ok:true}); any other failure {ok:false}.
    c. আনব্লকজমা(blocked_id): DELETE .eq('blocker_id', uid).eq('blocked_id', blocked_id).
    d. All session-gated: no client or no uid → {ok:false, error:'no-session'} — callers queue instead.
R2. Report modal (listing/[id]): submit → local behavior unchanged (modal closes, Bengali confirmation) + রিপোর্টজমা attempt; failure/no-session → সারিতেযোগ('রিপোর্ট', payload) (queue kind 'রিপোর্ট'). The modal must NOT gain any network waiting state — fire-and-forget with a Bengali success confirmation either way (offline-first: the confirmation means "recorded on this device").
R3. Blocks (profile): block action → local state (as today) + ব্লকজমা attempt; failure/no-session → সারিতেযোগ('ব্লক', payload). Unblock → local removal (as today) + আনব্লকজমা attempt; failure → সারিতেযোগ('আনব্লক', payload). Feed block filtering keeps reading LOCAL state only (never the server — an offline device must still filter).
R4. Queue flush extension (app-state সারিফ্লাশ): handle 'রিপোর্ট'/'বার্তা'/'পোস্ট' as today PLUS 'রিপোর্ট' → রিপোর্টজমা, 'ব্লক' → ব্লকজমা, 'আনব্লক' → আনব্লকজমা; same success-removes/failure-stays discipline; session-gated; fire-and-forget with catch; never blocks UI.
R5. Server-side block visibility: after a successful ব্লকজমা, a boot-time sync (mirror সেশনসিঙ্ক's minimalism: a ব্লকসিঙ্ক() that pulls the user's own blocks rows and reconciles the LOCAL block list when the local list is empty-of-an-entry — keep it minimal: ONLY reconcile when the local list has no pending queue entries, so offline additions are never overwritten) — document the exact reconciliation rule in code + report. If this proves more than ~20 lines, DESCOPE it to the report (document as follow-up) rather than expanding the diff.
R6. Offline-first absolute: env-less build → zero network everywhere (report modal, blocks, boot); with env but no session → queue only; failures never surface as errors to the user beyond the existing Bengali confirmations.
R7. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 both env states; byte delta vs the post-T-026 baseline (rebuild parent if needed; expect < 5,000 B — moderation module + modal/profile wiring; state it).
R8. Commit (explicit pathspec):
   feat(moderation): reports + blocks persist through RLS

   Report modal submissions INSERT reports (own-row RLS; PRD §12.4
   categories); block/unblock persists into blocks (UNIQUE-pair idempotent).
   Offline-first: local state first, queue entries, session-gated flush.
   Feed block filter still reads local state only. NOT deployed... (no — nothing to deploy; adjust last line:)

   Refs: CHC-T-025
   (Final line:) Push task/CHC-T-025; merge --no-ff with ORCHESTRATOR-PENDING-VERIFICATION; push main.
   [Compose the full message in this spirit; keep it exact in your report.]
R9. Evidence (paste, no tokens): tsc on changed modules; browser: i) report modal submit with session → reports count +1 via Management API (count only); ii) report modal submit env-less → queue entry, zero network; iii) block → blocks row count +1; unblock → the pair row gone; iv) feed block filter unchanged (blocked seller's post hidden from LOCAL state); v) gates.

ACCEPTANCE CRITERIA
A1. moderation.ts contract (null-safe, session-gated, unique-pair idempotent) — pasted file + tsc.
A2. Report modal persists (session) / queues (offline) — pasted diff + Management API count evidence.
A3. Blocks persist + unblock deletes (session) / queue (offline) — pasted diff + count evidence.
A4. Feed filter local-only invariant — pasted code/read excerpt.
A5. Flush extension (রিপোর্ট/ব্লক/আনব্লক kinds) — pasted diff excerpt.
A6. Gates green both states; delta stated — pasted.
A7. Merged with PENDING-VERIFICATION; .env untracked; secrets zero — pasted.

VERIFICATION (order): R1 module → R2 → R3 → R4 → R5 → gates → evidence → commit/merge.

STOP CONDITIONS
- Any schema/migration change; any admin-visibility code (reports are own-select only — if a requirement seems to need otherwise, STOP and report).
- Any English in UI; any bright-line term; byte delta > 5,000 B; gate/push failure — BLOCKED with exact output.
- R5's sync exceeding ~20 lines — descope per the brief and document.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A7/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
