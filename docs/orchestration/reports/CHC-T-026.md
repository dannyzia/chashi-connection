# CHC-T-026 — Task Report (archived from builder relay, 2026-10-24)

> Orchestrator postscript (CHC-D-035): verified — 10-point run ALL_CLAIMS_VERIFIED (merge d667158, parents 833d270+7cade3b, 5 files +184/−12, protected paths untouched, secrets zero incl. service_role/Tmp026Fixture, remotes match, validate ×2, import idempotent; live DB teardown 0/0/0/0 + grant intact). Deviations accepted (write primitives in app-state for cycle avoidance; two-step creation with re-key; ended_at:null on INSERT; flush-before-hydrate closing T-024 open-issue #2). DONE. **CHAT STAGE COMPLETE (read T-024 + write T-026 + hardening T-016).**

```
=== TASK REPORT ===
TASK ID: CHC-T-026 | AGENT ID: A-IMP-1 | STATUS: DONE — ORCHESTRATOR-PENDING-VERIFICATION

SUMMARY: Chat writing is server-backed through RLS. Opening a chat from a server-known listing INSERTs chats (buyer = session uid), sends on server threads INSERT messages, and "চ্যাট শেষ" writes ended_at — and nothing else — through 00003's column grant. All three paths session-gated and fire-and-forget: the thread opens locally first, nothing waits on the network, every failure lands exactly where it does today. Proven live with a real session: chat row created (buyer/seller/listing correct), message row 201, ended_at set (PATCH 204), one thread after reload, duplicate click inserted nothing, env-less build zero external requests across create→send→end.

GIT: task/CHC-T-026 @ 7cade3b (pushed). main @ d667158 (no-ff, PENDING-VERIFICATION), pushed. ls-remote both exact. Base 833d270. Merge range exactly the 5 scoped paths; logic/, supabase.ts, supabase/, package.json diff 0 lines.

FILES CHANGED (5, +184/−12): app-state.svelte.ts (+159/−1: সার্ভারেচ্যাটখুলুন creation+duplicate-guard, বার্তাসার্ভারেপাঠান, ended_at write, flush extension, re-key চ্যাটস্থানান্তর) · server-chats.ts (4 header-comment lines) · chat/+page.svelte (+5/−1) · chat/[id]/+page.svelte (+9/−2) · listing/[id]/+page.svelte (+19/−1).

ACCEPTANCE: A1 creation (existence-based detection — products seller_id probe; FK-aware fallback; duplicate guard re-attaches) · A2 sends (server thread → INSERT; else queue; no-session → today) · A3 ended_at ONLY (the 00003 grant is the proof; PATCH 204 live; DB null→timestamp) · A4 flush extension (রিপোর্ট/ব্লক/আনব্লক/প্রোফাইল untouched; বার্তা flushes only server-known threads; purely-local stays queued — demonstrated) · A5 offline invariance (env-less full flow: thread s1, server:false, queue ['বার্তা'], rating prompt, zero external requests) · A6 merged PENDING, teardown 0/0/0/0 + grant intact.

LIVE: fixtures users aa/bb + product cc via MCP SQL · creation: seller_id probe 200 → POST /chats 201 → row correct (buyer = session uid) · send: POST /messages 201 (sender=uid, text) · চ্যাট শেষ: PATCH /chats 204, ended_at null→timestamp · reload: threadCount 1, msgs 1, rating prompt · duplicate click: chats_total still 1 · flush: server-keyed entry flushed (messages 2), listing-keyed purely-local entry stayed queued · no-session: /chat/cc… local thread, zero chat requests · env-less: zero external requests across create+send+end. Teardown: messages 0, chats 0, products 0, users 0, fixture auth user deleted (pre-existing OTP-test auth user 101c646b… untouched).

BYTE ACCOUNTING: env 751,152 B (+3,181 vs 747,971); env-less 750,612 (+3,171). Cause: write helpers + re-keying in the app-state chunk + inlined handler/onMount changes. No new dependency/chunk/fonts.

DEVIATIONS: (1) write primitives in app-state (server-chats imports app-state — cycle avoidance; app-state owns the mapper precedent and must mutate the store anyway; server-chats.ts comments only, still read-only); (2) two-step creation (local thread + navigation synchronous, server chat background, re-key counterpart-uid + URL replace — "UI never waits" literal; re-key mandatory: read model keys by counterpart uid, leaving the listing-id twin would duplicate in the list and 404 the URL after boot); (3) ended_at:null on INSERT (typed requirement; not a mutation); (4) flush-before-hydrate in both chat routes (closes T-024 open-issue #2); (5) env-present/no-session path makes no chat requests at all (stronger than briefed); (6) test session via disposable SQL-created auth user + password grant (harness in gitignored .tmp, session JSON in static/ deleted; token by digest only).

OPEN ISSUES: (1) same-counterpart collapse now REACHABLE (two listings from one seller → two chats rows; read model keys by counterpart uid keeps newest — needs chats.id keying, route-param change → follow-up); (2) no realtime yet (PRD §10); (3) unpaginated reads; (4) queued বার্তা on a never-server thread stays queued indefinitely (documented); (5) cold deep link 404s until feed hydrates (pre-existing).

QUESTIONS: none
=== END REPORT ===
```
