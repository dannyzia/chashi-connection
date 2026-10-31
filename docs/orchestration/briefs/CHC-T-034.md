# CHC-T-034 — Builder Brief (issued to builder via Zia relay, 2026-10-24)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-034
TITLE:           Seller identity on feed items: a block hides ALL of a seller's listings
ASSIGNED TO:      A-IMP-1 (Implementer)
PRIORITY:        P1
DEPENDS ON:      CHC-T-031 (main @ 5bb1402 base)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §12.2 (block = the person, not one listing); CHC-T-031 report (the gap: server-product siblings stay visible); DECISIONS CHC-D-040 (orchestrator ruling: implementable without touching logic/feed.ts)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (tokens, keys, .env — variables only).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
CHC-T-031 shipped the block-add surface. Two facts it surfaced: (1) the feed filter (routes/+page.svelte, NOT the locked logic/feed.ts) matches blocked entries against প.বিক্রেতানাম and প.id — server products all carry the placeholder name (bn.বিক্রেতা), so a uuid block hides nothing and a name block would hide EVERY server listing; the builder therefore appends BOTH the seller uuid (durable, removable via profile) AND the filter key (name when the item has one, the listing's own id otherwise). (2) Consequence: blocking a server seller hides only the ONE listing you blocked — their sibling listings stay visible. THE FIX (orchestrator ruling CHC-D-040): carry the seller uuid on every server-backed feed item (বিক্রেতাআইডি), and add ONE uuid comparison to the route filter. The locked logic/feed.ts is never touched — the band algorithm consumes whatever items exist. purely-local posts keep today's name/id filtering unchanged.

OBJECTIVE
Every server-backed feed item carries বিক্রেতাআইডি; the feed route's block filter also matches it; blocking a server seller hides ALL their listings from the feed — with purely-local posts and the demo path unchanged, and the band algorithm untouched.

SCOPE (the ONLY files you may create or modify)
- apps/web/src/lib/server-feed.ts — modify (the mapping gains বিক্রেতাআইডি: row.seller_id — one line)
- apps/web/src/lib/app-state.svelte.ts — modify (the ফিডআইটেম type gains optional বিক্রেতাআইডি?: string — the ONLY type change)
- apps/web/src/routes/+page.svelte — modify (the block filter gains the uuid comparison — one condition)
- apps/web/src/routes/listing/[id]/+page.svelte — modify ONLY if the block routine needs adjustment to benefit (it already appends the uuid per CHC-T-031 — verify, change only if broken)
- Branch/commit/merge/push

OUT OF SCOPE
- logic/feed.ts (LOCKED — zero changes; the band algorithm is untouched)
- routes/+page.svelte's OTHER logic; bn.ts (no new strings — ব্লক/ব্লকনিশ্চিত/ব্লকবর্ণনা/ব্লকসম্পন্নবার্তা exist); moderation.ts (the probe is unchanged); app-state beyond the one optional field; chat routes; docs/; android/; package.json
- The profile unblock semantics (out of scope — T-031's open-issue #2 is a separate task)

INPUTS (read first)
- apps/web/src/lib/server-feed.ts — the mapping (your one-line addition)
- apps/web/src/lib/app-state.svelte.ts — the ফিডআইটেম type + the block list (ব্লকতালিকা)
- apps/web/src/routes/+page.svelte — the block filter (the exact key comparisons you extend)
- apps/web/src/routes/listing/[id]/+page.svelte — the block routine (verify it already appends the uuid — CHC-T-031 did)
- docs/orchestration/reports/CHC-T-031.md — the gap report

REQUIREMENTS (numbered; each testable)
R1. server-feed.ts maps বিক্রেতাআইডি: row.seller_id onto every server item (one property; null-safe).
R2. ফিডআইটেম gains optional বিক্রেতাআইডি?: string (app-state type) — purely-local items never set it.
R3. The route filter: a blocked entry hides an item when the entry matches the item's বিক্রেতানাম (existing), the item's id (existing), OR — new — the item's বিক্রেতাআইডি. purely-local items (no বিক্রেতাআইডি) are unaffected by uuid entries (their name/id matching is unchanged).
R4. The block routine in listing/[id]: verify it already appends the seller uuid to ব্লকতালিকা (CHC-T-031 did — ব্যবহারকারীব্লক appends both); change NOTHING if it works.
R5. Behavior: blocking a server seller hides ALL their listings (siblings included) from the feed; purely-local listings block by name/id as today; the demo path (no env) is unchanged.
R6. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 with .env and env-less; byte delta vs the current main baseline (rebuild parent if needed) — expect < 1,000 B (one property + one comparison); state it.
R7. Browser evidence (paste DOM/console, no tokens):
    a. With env: insert a test users row + TWO test products (same seller, one hidden=false) via Management API → both appear in the feed → block the seller from one listing's detail page → BOTH vanish → unblock via profile → both return. Paste the card-title lists before/during/after.
    b. purely-local post unaffected by uuid entries — paste the filter behavior.
    c. Demo path (env-less): unchanged — paste.
R8. Commit (explicit pathspec):
   fix(feed): block hides ALL of a seller's listings via seller uuid

   Server-backed feed items carry বিক্রেতাআইডি; the block filter matches
   it — blocking a server seller hides every listing, not just the one
   blocked from. purely-local posts keep name/id filtering. Band
   algorithm untouched.

   Refs: CHC-T-034
   Push task/CHC-T-034; merge --no-ff with ORCHESTRATOR-PENDING-VERIFICATION; push main.

ACCEPTANCE CRITERIA
A1. Mapping + type + filter: the three one-line additions — pasted diff excerpts.
A2. Sibling hiding proven (browser) — pasted card-title lists: before (2+ items from the seller), after block (0), after unblock (2+).
A3. purely-local posts unaffected by uuid entries — pasted filter behavior.
A4. Demo path unchanged (env-less) — pasted.
A5. Gates green both states; byte delta < 1,000 B stated — pasted.
A6. Merged with PENDING-VERIFICATION; logic/feed.ts diff empty; no secrets — pasted.

VERIFICATION (order): code → gates → browser evidence (a–c) → commit/merge.

STOP CONDITIONS
- Any change to logic/feed.ts — absolute STOP (the algorithm is locked).
- The uuid comparison would break the name/id matching for purely-local posts — fix within scope or STOP and report.
- Byte delta > 1,000 B; gate failure; push rejection; any English in UI — BLOCKED with exact output.
- Any English in UI — BLOCKED.

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
