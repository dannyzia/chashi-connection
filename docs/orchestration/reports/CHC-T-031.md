# CHC-T-031 — Task Report (archived from builder relay, 2026-10-24)

> Orchestrator postscript (CHC-D-040): verified — 10-point run ALL_CLAIMS_VERIFIED (merge 5bb1402 parents 45b5ae5+ab8d6df, exactly 3 files +106/−2, secrets zero, feed route + logic/ untouched, gates ×2, remotes match) + browser evidence accepted (8→7 cards, ব্লকতালিকা entries, banner, duplicate guard, zero network on the block action). Deviations accepted (block keys = the filter's actual keys — brief-premise correction #3, mine; the two-entry ব্লকতালিকা design; the offline server-listing boundary; self-block guard; helper placement; commit-body truthfulness; dev-server ownership). DONE — block-add surface live.

```
=== TASK REPORT ===
TASK ID: CHC-T-031 · AGENT: A-IMP-1 · STATUS: MERGED — ORCHESTRATOR-PENDING-VERIFICATION (client-only)

SUMMARY: The listing detail page now has a ব্লক action beside রিপোর্ট করুন (Bengali confirm + banner), a local-first block hiding the seller's posts from the feed with zero network requests, persistence reusing CHC-T-025's ব্যবহারকারীব্লক (ব্লকজমা, queue on failure), and the seller uuid from one probe added to moderation.ts. logic/feed.ts and routes/+page.svelte untouched.

TWO FACTS THAT DECIDED THE DESIGN (both contradicting the brief's premise):
1. The feed filter cannot match a seller uuid — it matches প.বিক্রেতানাম and প.id; ফিডআইটেম carries no seller id and server products all carry the placeholder name. Blocked by the keys the filter actually reads: the real seller name (hides all their posts) or the listing's own id.
2. 00006 applied live: 22 policies, auto_hidden_at column, admin_audit table + trigger; products/blocks/reports empty — no server-backed listing exercisable.

FILES CHANGED (3, +106/−2): listing/[id]/+page.svelte (ব্লক button, confirm modal, success banner, block routine, +77/−2) · moderation.ts (বিক্রেতাইডআনুন probe, +26) · bn.ts (four strings, +5).

ACCEPTANCE: A1 action + confirm beside রিপোর্ট, Bengali-only (accessibility tree pasted) · A2 block hides the seller's posts (8→7 cards, ব্লকতালিকা entries, banner, button disabled) · A3 persistence wiring (ব্যবহারকারীব্লক → ব্লকজমা, queue on failure; বিক্রেতাইডআনুন null-safe guards pasted) · A4 duplicate guard + feed-only boundary documented · A5 gates: validate ALL PASSED, builds exit 0, +3,277 B both states · A6 merge hygiene (ab8d6df → 5bb1402, exactly the 3 scope files, no .env/.mcp.json, docs edits uncommitted).

LIVE-SURFACE NOTE: the block action produced ZERO network entries (seed ids fail the uuid check before any client call); env-less proven via an explicit VITE_*="" build (URL absent from that bundle, present in the normal one).

OPEN ISSUES: (1) server-product siblings stay visible (needs বিক্রেতাইড on ফিডআইটেম + the filter comparison — logic/feed.ts LOCKED → orchestrator decision, queued as CHC-T-033); (2) profile shows raw ids and unblocking an id entry doesn't delete the server row (block-list UI task); (3) offline block of a server listing stays local-only (documented); (4) the authorized path code-verified only (products/blocks empty, no session); (5) carried from T-029: auto_hidden_at badge, count decay, distinct-reporter threshold.
QUESTIONS: none
=== END REPORT ===
```
