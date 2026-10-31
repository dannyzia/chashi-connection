# CHC-T-034 — Task Report (archived from builder relay, 2026-10-24)

> Orchestrator postscript (CHC-D-041): verified — 15-point run ALL_CLAIMS_VERIFIED (merge 1fc28d6 parents 5bb1402+fdeee61, exactly 2 files +24/−7: server-feed mapping + সার্ভারআইটেম type, routes filter; logic/ + app-state + listing/ untouched; secrets zero; remotes match; gates ×3; live sibling proof both directions). Deviations accepted (the type field rides on `সার্ভারআইটেম` — the `ফিডআইটেম` interface lives in the LOCKED logic/feed.ts; the guarded uuid comparison; the mapping null-guard). DONE — **a block now hides ALL of a server seller's listings.**

```
=== TASK REPORT ===
TASK ID: CHC-T-034 · AGENT: A-IMP-1 · STATUS: DONE — merged with ORCHESTRATOR-PENDING-VERIFICATION (client-only; no migration, no apply step)

SUMMARY: Server-backed feed items now carry the seller's uuid (বিক্রেতাআইডি) and the home feed's block filter matches it, so blocking a server seller hides all of their listings instead of the single one you blocked from. Proven live: two products from one seller were both in the feed; putting that seller's uuid in the block list removed both (testCardsVisible: []) while they stayed in state; removing the entry brought both back. Pure-local posts are untouched, the demo path is unchanged, and logic/feed.ts has an empty diff.

ONE FACT THAT CHANGED THE SHAPE: ফিডআইটেম is declared in logic/feed.ts, which is locked. The optional field rides on সার্ভারআইটেম (the ফিডআইটেম & {…} intersection that already carries serverId), and app-state.svelte.ts was not modified — the brief listed it as the place for the "ONLY type change", but the type it named lives in the locked file. Semantically the correct home: only server items ever have it.

A SECOND FINDING: the sibling-hiding benefit needs a session. The uuid is learned by বিক্রেতাইডআনুন (session-gated by design) — with no session the block can only push the listing id. Proven with the UI: block on a real server listing with env but no session → blockList: ["22222222-…"] (one listing). Online and signed in, ব্যবহারকারীব্লক appends the uuid, which is the entry the filter honours.

FILES CHANGED (2, +24/−7): server-feed.ts (সার্ভারআইটেম gains বিক্রেতাআইডি?: string; the mapper sets it from row.seller_id) · +page.svelte (the block filter gains the uuid comparison).

ACCEPTANCE: A1 the three additions (type, mapping, filter — guarded) · A2 sibling hiding live (2 fixtures → uuid block → both hidden → unblock → both back) · A3 pure-local posts unaffected by uuid entries · A4 demo path unchanged · A5 gates and bytes: delta +220 B (.env) / +210 B (env-less), 22% of the 1,000 B allowance; total assets 765,942 B · A6 merge hygiene (fdeee61 → 1fc28d6, exactly the 2 scope files; logic/feed.ts diff empty; no secrets).

NETWORK (offline-first): one normal feed GET and nothing else — the block action made zero requests.

OPEN ISSUES: (1) no session → one listing, not the seller (offline parity: cache সার্ভারফিডআনুন's items so the block can resolve offline — worth a brief if the owner wants parity); (2) server seller name is still a shared placeholder (the sellers join remains a separate task); (3) profile unblock semantics (T-031 open-issue #2) unchanged; (4) the block list accumulates two entries per server block (uuid + listing id) — harmless, shown raw.

QUESTIONS: none

[Orchestrator notes: verified (CHC-D-041); the session-less limitation queued as a candidate; the two-entries-per-block profile display noted for the block-list UI pass.]
=== END REPORT ===
```
