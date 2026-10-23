# CHC-T-022 — Builder Brief (issued to builder via Zia relay, 2026-10-23)

```
=== TASK BRIEF ===
TASK ID:         CHC-T-022
TITLE:           Server-backed feed: products read through RLS into the locality-first feed
ASSIGNED TO:     A-IMP-1 (Implementer)
PRIORITY:        P0
DEPENDS ON:      CHC-T-013 (schema live), CHC-T-021 (docs landing first; branch off post-T-021 main)
PROJECT:         Chashi Connection | ROOT: D:\My Projects\Future Projects\Chashi Connection | CONTEXT FILE: AGENTS.md (project root)
SOURCE OF TRUTH: PRD-V5.0.md §9 (locality-first feed — THE core algorithm, byte-faithful), §8.2 (no-photo demotion), AGENTS.md (offline-first §16, byte rules, Bengali-only)
OS / SHELL:      Windows 11 / PowerShell 7. Commands from apps/web unless stated.

You are A-IMP-1, role Implementer. No memory of earlier work. Everything you need is in this brief and the files it lists.
1. Read AGENTS.md first; hard rules override this brief; conflict → BLOCKED.
2. Load .agents/skills/rhizome-builder/SKILL.md; git hygiene (§8).
3. Exactly this brief. No extras. Touch only SCOPE files.
4. Paste real output for every step; evidence or reject.
5. Never print secrets (.env values, .mcp.json token — read into variables only, never echoed).
6. One question max; BLOCKED with exact reason outside SCOPE.
7. Finish with the TASK REPORT format below.

CONTEXT
The app's feed (home +page.svelte) renders exclusively from local state (seed data + localStorage). The live database has an EMPTY products table with RLS: anon SELECT is allowed (products_পঠন_সবার), hidden rows excluded, 30-day expiry exists but is NOT enforced by RLS (must be handled in the query). This task makes the feed READ server data first, local second — WITHOUT breaking anything offline: the offline contract is (1) if the fetch fails entirely (no env, no network, error), the feed renders EXACTLY as today (seed/local only) — zero UI regression; (2) if the fetch succeeds, server posts are merged into the feed ABOVE local ones per the existing band algorithm — but locality-first ordering is computed on the MERGED set, never per-source. The feed's band algorithm (ফিডব্যান্ডেভাগ in logic/feed.ts) and the no-photo demotion are THE core product rules — they must run unchanged on whatever feed items exist, server or local. The UI reads the feed from app-state (ফিডআইটেম shape); server rows must be mapped into that shape, not rendered separately.

OBJECTIVE
On boot (client-only): fetch non-hidden, non-expired products via supabase-js (anon), map them into the ফিডআইটেম shape, prepend them to the feed state, and let the existing band algorithm order everything — with zero behavior change when the fetch fails. Byte delta measured and stated.

SCOPE (the ONLY files you may create or modify)
- apps/web/src/lib/server-feed.ts — create (fetch + map + merge module)
- apps/web/src/routes/+page.svelte — modify (feed hydration hook on mount)
- apps/web/src/lib/supabase.ts — modify ONLY if a products-select helper belongs there (prefer the new module)
- Branch/commit/merge/push

OUT OF SCOPE
- Writing to the server (post/signup stays local+queue — later task), auth UI, chat, bn.ts changes beyond a null-safe necessity, logic/feed.ts (the algorithm is LOCKED — read it, don't touch it), app-state.svelte.ts unless a minimal export is genuinely required (prefer reading app via the existing exports), android/, docs/
- Any UI change: same band headers, same cards, same Bengali strings. The ONLY visible difference may be MORE posts (server ones) when online.

INPUTS (read first)
- apps/web/src/lib/logic/feed.ts — ফিডব্যান্ডেভাগ + the no-photo demotion (LOCKED algorithm)
- apps/web/src/routes/+page.svelte — current feed rendering + the ফিডআইটেম fields it consumes
- apps/web/src/lib/app-state.svelte.ts — the ফিডআইটেম/পোস্ট types + সংরক্ষণ()
- apps/web/src/lib/supabase.ts — getSupabase() contract (null when env absent)
- apps/web/src/lib/data/seed.ts — the local seed shape (mapping reference)
- .kilo/plans/plan/PRD-V5.0.md §9.1–§9.3 — feed rules your implementation must NOT violate

REQUIREMENTS (numbered; testable)
R1. server-feed.ts exports a single function সার্ভারফিডআনুন(): Promise<{ items: ফিডআইটেম[]; ok: boolean } | { ok: false }>-style result (name it in Bengali per convention; keep it close to this). It:
    a. getSupabase() → null → return { ok:false } immediately (env-less builds: zero network, zero supabase-js cost beyond the module).
    b. SELECT from products: .from('products').select('*').eq('hidden', false).gte('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(200) — one call, no pagination this task.
    c. Map each row to the feed item shape EXACTLY as app-state's ফিডআইটেম expects: type sale→sale / wanted→wanted (map the server 'wanted' to the client's প্রয়োজন semantics — read how seed.ts marks wishlist items and mirror it), title, price (numeric → the client's numeric type), unit, quantity, category, photo (null → the no-photo demotion path), location strings 1:1, lat/lng, created_at → the client's created timestamp shape (ISO string or whatever ফিডআইটেম carries — mirror seed.ts), plus id (server uuid) and a NEW marker field serverId: true on every server item (local items never carry it). Do NOT map fields the feed doesn't consume.
    d. Any fetch/select error → { ok:false } (empty result). NEVER throw.
R2. +page.svelte hydration: on mount (client-only), call সার্ভারফিডআনুন(); on ok:true with items.length > 0 → prepend items into the SAME state array the feed renders from (local seed + any local posts stay AFTER server items — the band algorithm then orders the merged set; do NOT re-sort per-source), then সংরক্ষণ(). On ok:false → do nothing at all (feed untouched). A loading indicator is FORBIDDEN — the feed must render instantly from local data (offline-first), server items appearing is a silent enhancement.
R3. No logic/feed.ts changes: the band algorithm consumes whatever array exists. Prove the no-photo demotion and band grouping work on the MERGED set — this is the PRD's core invariant: a server post with no photo may NEVER appear above a photo post in the same band, and band order is strictly by distance. (The algorithm already does this — your proof is that you didn't break it and that mapped server items flow through it.)
R4. Gates: import exit 0; validate ALL CHECKS PASSED; build exit 0 WITH .env and with .env moved aside (both must be green); byte accounting — the FIRST feed import pulls supabase-js into the route bundle: state the exact total and delta vs 741,213/741,420 (whichever your parent-commit rebuild shows; rebuild the parent if needed) — per CHC-D-025 this growth is authorized; name its cause.
R5. Browser evidence (paste console/DOM transitions, no tokens):
    a. With .env + EMPTY server table (it is empty): feed renders local-only, no errors, no visible change — paste console.
    b. To prove the merge path without waiting for real posts: use the anon REST call from a node script (or the function of the previous task is NOT for this) — simplest: INSERT one clearly-marked test product via the Management API… NO — the anon key cannot insert. Instead: insert one test product via the Management API query endpoint using the PAT from .mcp.json (values never printed), e.g. phone-linked? products requires seller_id → users row… users is empty. Insert a test users row + test product via Management API (service role, no secrets printed), then re-run the app: the server post MUST appear in the feed within a band, ordered by the algorithm. Paste the DOM/console evidence + the SQL you used (it contains no secrets). Then DELETE both test rows via Management API and re-run the app to show the post disappeared (proves live reads, not cache).
    c. Env-less build: no network calls to supabase (browser network tab shows none), feed = local only.
R6. Commit (explicit pathspec; .env never staged):
   feat(feed): server-backed products read with offline-first merge

   Boot fetch of non-hidden non-expired products (anon, ≤200) mapped into
   ফিডআইটেম and prepended to local state; the band algorithm orders the
   MERGED set (locality-first preserved). Any failure → local-only feed,
   zero regression. First real supabase-js import: byte delta stated.

   Refs: CHC-T-022
   Push task/CHC-T-022; merge --no-ff with ORCHESTRATOR-PENDING-VERIFICATION; push main.

ACCEPTANCE CRITERIA
A1. server-feed module: null-safe, never-throws, exact mapping — pasted file + tsc.
A2. Merge behavior on the merged set with band algorithm unchanged — pasted diff (logic/feed.ts must show ZERO changes: git diff main..HEAD -- src/lib/logic/feed.ts → empty).
A3. Empty-table behavior identical to today — pasted console.
A4. Live merge proven (test product appears; delete → disappears) — pasted evidence + the SQL.
A5. Gates green both env states; byte delta measured, named, within CHC-D-025 — pasted.
A6. Merged with PENDING-VERIFICATION; .env untracked; logic/feed.ts untouched in the diff — pasted.

STOP CONDITIONS
- logic/feed.ts would need ANY edit to make server items work — that means your mapping is wrong; fix the mapping, or STOP and report if the algorithm genuinely cannot consume them.
- Byte delta > 150,000 B; any gate failure; any English in UI; any push rejection — BLOCKED with exact output.
- Anything requiring the service-role key in client code — absolute STOP (report).

REPORT FORMAT: TASK REPORT (STATUS/SUMMARY/FILES CHANGED/COMMANDS RUN/ACCEPTANCE A1–A6/BYTE ACCOUNTING/DEVIATIONS/ASSUMPTIONS/OPEN ISSUES/QUESTIONS).
=== END BRIEF ===
```
