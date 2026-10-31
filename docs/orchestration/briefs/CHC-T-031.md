# CHC-T-031 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-031
TITLE:           Block-add surface: ব্লক action beside রিপোর্ট on listing detail
ASSIGNED TO:      A-IMP-1 (Implementer)
PRIORITY:        P1
DEPENDS ON:      CHC-T-025 (moderation persistence — ব্লকজমা/আনব্লকজমা + queue + flush are LIVE); verify the actual main tip at preflight (it has moved past fa0efe1)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §12.2 (block = silent, one-way, no notification); CHC-T-025 report (persistence wiring + the disclosed assumptions); AGENTS.md (offline-first, Bengali-only, bright lines)
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
T-025 wired moderation PERSISTENCE: moderation.ts (রিপোর্টজমা/ব্লকজমা/আনব্লকজমা — session-gated, offline-queued, unique-pair idempotent), the flush extension, ব্লকসিঙ্ক. But NO surface calls ব্যবহারকারীব্লক — the profile has only the unblock button; there is no way for a user to block anyone. The listing detail page already has the রিপোর্ট modal; the ব্লক action goes beside it. The feed's block filter reads LOCAL state only (an offline device must keep filtering) — the server write is a silent background enhancement. For purely-local posts (offline-created, unflushed), the seller has no server uuid: the block is LOCAL-ONLY for that seller (documented limitation — the same rule as chat creation, CHC-T-026).

OBJECTIVE
A ব্লক action beside রিপোর্ট on the listing detail page: blocking adds the seller to the local block list (their posts vanish from the feed immediately via the existing local filter), persists through the existing moderation helpers when a session exists, queues offline — with a Bengali confirm step and a success state.

SCOPE (the ONLY files you may create or modify)
- apps/web/src/routes/listing/[id]/+page.svelte — modify (the ব্লক action + confirm + wiring)
- apps/web/src/lib/moderation.ts — modify ONLY if a block-by-seller helper is cleaner than inline (document; keep the existing exports intact)
- apps/web/src/lib/bn.ts — ONLY if a genuinely new Bengali string is needed (check bn.ব্লক/bn.আনব্লক/bn.রিপোর্ট first — reuse)
- Branch/commit/merge/push

OUT OF SCOPE
- Unblock (stays on the profile — unchanged); feed logic (logic/feed.ts LOCKED); the block list UI beyond what exists; chat route; bn.ts rewrites; package.json; docs/; android/
- Any notification to the blocked user (PRD §12.2: block is SILENT and one-way — no UI, no queue entry, nothing)

INPUTS (read first)
- apps/web/src/routes/listing/[id]/+page.svelte — the report modal (your action mirrors its pattern: local-first, confirm, Bengali)
- apps/web/src/lib/moderation.ts — ব্লকজমা (session-gated, unique-pair idempotent)
- apps/web/src/lib/app-state.svelte.ts — the block list state + the feed filter's matching key
- apps/web/src/lib/server-feed.ts — what the mapped feed item carries (the seller's server uuid availability — see R3)

REQUIREMENTS (numbered; each testable)
R1. A ব্লক action beside the report entry on listing/[id]: Bengali label (bn.ব্লক or equivalent — reuse), opens a small confirm step (Bengali: blocking is one-way; unblock lives on the profile), no English.
R2. On confirm: the seller goes into the LOCAL block list via the existing state mechanism (whichever key the feed filter matches — read the filter first and block by THAT key: server uuid when the listing is server-backed, the local identifier otherwise) → their posts vanish from the feed on the next render (paste the DOM evidence). Then ব্লকজমা attempt (session-gated; offline/no-session → today's queue path).
R3. Server uuid resolution: for server-backed listings, resolve the seller's uuid with ONE .from('products').select('seller_id').eq('id', listing).single() call (the CHC-T-026 creation-probe pattern); for purely-local listings, block by the local identifier (local-only block — documented limitation, same as chat creation).
R4. Duplicate guard: blocking an already-blocked seller is a no-op (the state mechanism or a check — paste which).
R5. After blocking: the UI confirms in Bengali and the listing page behaves consistently (the blocked seller's own listing may stay visible on ITS detail page — only the FEED filters; document this boundary in a code comment).
R6. Offline-first absolute: env-less build → zero network on the block action (paste network evidence); with env but no session → local block + queue entry; failure → queue entry, local state unchanged.
R7. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 with .env and env-less; byte delta vs the current main baseline (rebuild parent if needed) — expect < 5,000 B; state it.
R8. Commit (explicit pathspec):
   feat(moderation): block-add surface beside রিপোর্ট on listing detail

   ব্লকজমা persistence was wired in CHC-T-025 with no caller; the listing
   detail page gains the ব্লক action (local-first, confirm step, server
   uuid when server-backed, local-only for purely-local posts). Feed
   filter stays local-only. Offline-first: queue on failure.

   Refs: CHC-T-031
   Push task/CHC-T-031; merge --no-ff with ORCHESTRATOR-PENDING-VERIFICATION; push main.

ACCEPTANCE CRITERIA
A1. The action + confirm exist beside রিপোর্ট, Bengali-only — pasted diff excerpt.
A2. Block → local list + feed filter hides the seller's posts — pasted DOM/console evidence.
A3. Persistence: ব্লকজমা (session) / queue (offline) — pasted diff excerpt + code path.
A4. Duplicate guard + purely-local-post boundary documented — pasted excerpt + report note.
A5. Gates green both states; byte delta stated — pasted.
A6. Merged with PENDING-VERIFICATION; .env untracked; secrets zero — pasted.

STOP CONDITIONS
- Any change to logic/feed.ts (the filter is LOCKED — read it, block by its key, never edit it).
- Any notification/queue entry TO the blocked user (PRD §12.2: silent, one-way) — absolute STOP.
- Byte delta > 5,000 B; gate failure; push rejection; any English in UI — BLOCKED with exact output.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
