# CHC-T-033 — Task Report (stage-closing E2E: moderation + trust chain, zero credits)

> Runner: A-IMP-1 (builder, single-agent — Rhizome hub not bootstrapped per `AGENTS.md`).
> Mode: evidence-gathering only. No code, schema, policy or migration was changed; every finding is recorded, none repaired.
> Date: 2026-11-01. Live project: `bgnndfwksjukvhbpipxb` (ref read from `apps/web/.env`; the brief's ref string matches).

```
=== TASK REPORT ===
TASK ID: CHC-T-033
AGENT ID: A-IMP-1 (builder, via relay; no hub — single-agent binding)
STATUS: PARTIAL — P0, P1, P2, P4, P5, P6, P7, P8 PASS; P3 FAIL (one real policy-scope finding, recorded not fixed)

SUMMARY:
One continuous run of the §12.4 chain on a live fixture set, zero OTP/credits: report → auto-hide → visibility → admin unhide + audit → queue order → block → cleanup to zero residue.
Auto-hide thresholds are exact (ভুয়া#2 trips, স্প্যাম#3 trips, idempotent thereafter) and the trigger writes no audit row; the app writes audit rows explicitly.
The operator path is sound: unhide updates 1 row under RLS, audit insert is actor-self + role-checked, admin reads it, buyer sees 0.
P3 FAILED its expected counts: auto-hidden listings stay readable to anon and to any buyer through REST — `auto_hidden_at` is filtered in the app query (`server-feed.ts:72`), not in RLS. That is FINDING 1.
DB returned to P0 state exactly (users=1, products/reports/blocks/admin_audit=0, policies=23); validate ALL CHECKS PASSED; build exit 0, 43 files / 771,693 B.

FILES CHANGED:
- docs/orchestration/reports/CHC-T-033.md — create — this evidence report
- docs/orchestration/LEDGER.md — modify — CHC-T-033 row only (status → DONE-PENDING-VERIFICATION with the evidence ref)
- .tmp/* — throwaway harness scripts (sql.mjs, p2.mjs, p3.mjs, p4.mjs, p5.mjs, p6.mjs, *.sql), deleted after the run; never committed

COMMANDS RUN (trimmed; each pasted below in its phase):
 1  git branch --show-current; git status --short; git log --oneline -8
 2  node .tmp/sql.mjs .tmp/p0.sql                      (P0 counts + policy count)
 3  node .tmp/sql.mjs .tmp/p1a.sql / p1b.sql           (schema probe: tables, users columns)
 4  node .tmp/sql.mjs .tmp/p1c.sql                     (3 users + 3 products)
 5  node .tmp/p2.mjs                                   (6 report inserts under buyer RLS context)
 6  node .tmp/p3.mjs                                   (anon REST + buyer/admin/owner contexts)
 7  node .tmp/sql.mjs .tmp/p3b.sql                     (live products policy quals)
 8  node .tmp/p4.mjs                                   (admin unhide + audit read/write)
 9  node .tmp/p5.mjs                                   (queue order as the page sorts it)
10  node .tmp/p6.mjs                                   (block insert + feed-shaped query)
11  node .tmp/sql.mjs .tmp/trg.sql                     (trigger inventory)
12  node .tmp/sql.mjs .tmp/p7.sql                      (cleanup + zero-residue count)
13  cd apps/web && node scripts/validate.mjs           → ALL CHECKS PASSED
14  cd apps/web && npm run build                       → exit 0 (×2, clean rebuild)
15  find build -type f | wc -l ; find build -type f -printf '%s\n' | awk '{s+=$1} END {print s}'
16  git status --short apps/web supabase docs

────────────────────────────────────────────────────────────────────────────
P0 — PRECONDITIONS: PASS
  {"users":1,"products":0,"reports":0,"blocks":0,"admin_audit":0,"policies":23}
  Matches the brief exactly (1 owner row, all other tables empty, 23 policies).

P1 — FIXTURES: PASS (with one brief-premise deviation)
  Schema probe — there is no location table and no location_id column:
    tables: admin_audit, blocks, chats, messages, otp_sends, products, public_sellers, reports, users
    users columns: id, phone, name, label, division, district, upazila, union_name, village,
                   lat, lng, detail, whatsapp, women_safety, verified, created_at, role
  Substitution (see DEVIATIONS 1): dataset-valid tuple খুলনা → বাগেরহাট → মরেলগঞ্জ → মোড়েলগঞ্জ ইউনিয়ন,
  village টেংরাখালী, lat 22.651568 / lng 89.785938 (district centre, locations.ts:62).
  Created (fixed uuids, role left at the column default 'user'):
    aaaaaaaa-…-000000000001  টেস্ট বিক্রেতা ক  (seller A)   01700000001
    aaaaaaaa-…-000000000002  টেস্ট বিক্রেতা খ  (seller B)   01700000002
    aaaaaaaa-…-000000000003  টেস্ট ক্রেতা     (buyer)     01700000003
  Products, all hidden=false / auto_hidden_at=null:
    bbbbbbbb-…-000000000001  টেস্ট ধান ক-১  seller A
    bbbbbbbb-…-000000000002  টেস্ট ধান ক-২  seller A
    bbbbbbbb-…-000000000003  টেস্ট পাট খ-১  seller B

P2 — AUTO-HIDE CHAIN: PASS
  Every insert ran as `begin; set local role authenticated; set_config('request.jwt.claims',
  '{"sub":"<buyer>"}'); insert … ; commit;` — i.e. through `reports_যোগ` (reporter_id = auth.uid()).
  P2.1 A-1 + ভুয়া #1 → {"auto_hidden_at_set": false, "hidden": false}
  P2.2 A-1 + ভুয়া #2 → {"auto_hidden_at_set": true, "hidden": false}
        admin_audit rows after the threshold trip: 0  ← verified, not assumed
  P2.3 A-1 + ভুয়া #3 → {"auto_hidden_at_set": true, "timestamp_unchanged_vs_P2_2": true}   (idempotent)
  P2.4 B-1 + স্প্যাম #1 → auto_hidden_at_set false
  P2.5 B-1 + স্প্যাম #2 → auto_hidden_at_set false
  P2.6 B-1 + স্প্যাম #3 → auto_hidden_at_set true
  Category counts at the end: A-1 ভুয়া বিজ্ঞাপন / প্রতারণা = 3 · B-1 স্প্যাম = 3 · reports total 6.
  Audit rows written by the trigger across all six reports: 0. Trigger inventory confirms why —
  the only trigger in the schema is `reports_স্বয়ংক্রিয়_লুকানো` (AFTER INSERT on reports); nothing on products.

P3 — VISIBILITY SPLIT ON HIDDEN A-1: FAIL (expected anon 0 / buyer 0; both got 1)
  P3.1 anon REST GET (real HTTP, shipped anon key, no session):
        {"status":200,"rows_returned":1,
         "body":[{"id":"bbbbbbbb-…0001","title":"টেস্ট ধান ক-১","hidden":false,
                  "auto_hidden_at":"<set>"}]}
  P3.2 buyer context     → visible_rows = 1     (expected 0)
  P3.3 test-admin context→ visible_rows = 1     (expected 1) ✔
  P3.4 owner-uid context → visible_rows = 1     (expected 1) ✔
  Cause, from the live policy quals on public.products:
    products_পঠন_সবার (anon,authenticated, SELECT)  qual: ((NOT hidden) OR (seller_id = auth.uid()))
    products_অ্যাডমিন_পঠন (authenticated, SELECT)   qual: EXISTS (… u.role = 'admin')
    — neither predicate mentions auto_hidden_at. The marker is enforced only by the app query
    (server-feed.ts:72 `.is('auto_hidden_at', null)`), so any reader that does not run that
    filter sees auto-hidden listings. User-facing behaviour is unaffected (the feed query filters);
    the data layer is not. Recorded as FINDING 1, not fixed (out of scope by brief).

P4 — ADMIN UNHIDE + AUDIT: PASS
  P4.0 fixture reset (A-1 re-hidden by SQL, audit table emptied) → {"auto_hidden_set":true,"audit_rows":0}
  P4.1 admin context UPDATE products SET hidden=false, auto_hidden_at=NULL WHERE id=A-1 → rows_updated = 1
  P4.2 admin_audit rows written by that UPDATE alone → 0
  P4.3 app-shaped explicit write (admin.ts কর্মলগলেখা: actor=self, action='unhide', target_type='product')
       → audit_rows_after_app_insert = 1
  P4.4 read as admin → 1 row: actor aaaaaaaa-…0004 · action unhide · target product bbbbbbbb-…0001
  P4.5 read as buyer → rows_visible_to_buyer = 0
  P4.6 A-1 after unhide → hidden=false, auto_hidden_cleared=true
  MECHANISM (from code): the app writes audit rows explicitly — admin.ts `setHidden` calls
  `কর্মলগলেখা` (fire-and-forget insert into admin_audit at admin.ts:271) after a successful update;
  no database trigger writes audit rows, so a raw SQL UPDATE logs nothing (P4.2 = 0 is correct behaviour
  of the implementation as built, not a failure).

P5 — §12.4 QUEUE ORDER: PASS
  The admin page sorts its product list by: report-count DESC, then created_at DESC
  (admin/+page.svelte:76-81, over `fetchProductsAdmin`: created_at desc, limit 100).
  Fixtures arranged so both keys discriminate (A-1 08:00 / B-1 08:10 / A-2 08:20):
    queue as implemented → 1) B-1 (count 3, 08:10)  2) A-1 (count 3, 08:00)  3) A-2 (count 0, 08:20)
    recency-only order   → 1) A-2 (0)              2) B-1 (3)               3) A-1 (3)
  Observed order matches the implementation's intent: the count key dominates recency (A-2 is the
  newest listing yet sorts last with 0 reports), and created_at breaks the 3-vs-3 tie (B-1 above A-1).
  Both §12.4 groups surface (A-1's ভুয়া group, B-1's স্প্যাম group). No mismatch → no finding on order,
  but see FINDING 2 for the missing final tie-break.

P6 — BLOCK CHAIN: PASS
  P6.1 buyer context insert into blocks (buyer → seller A uuid) → my_blocks = 1
  P6.2 buyer reads own blocks → blocked_id = aaaaaaaa-…0001
  P6.3 duplicate block → unique_violation swallowed by the harness's exception block; still_one = 1
       (constraint blocks_জোড়া_অদ্বিতীয় holds)
  Mapping line (no code change): server-feed.ts:50 sets `বিক্রেতাআইডি` from `সারি.seller_id`
       (type declared server-feed.ts:23); the client filter reads it at routes/+page.svelte:57.
  P6.4 feed-shaped product query AS BUYER, without the client filter:
       {"feed_rows_before_client_filter":2,"seller_a_rows":2}
  P6.5 same query as anon: {"feed_rows_before_client_filter":2,"seller_a_rows":2}
  P6.6 the two rows still server-visible: টেস্ট ধান ক-১, টেস্ট ধান ক-২ (both seller A).
  Conclusion: the block is entirely a client-side filter over server rows — consistent with the
  browser proofs in T-031 / T-034 (cited, not re-run: no browser was driven in this task).

P7 — CLEANUP: PASS
  Deleted in dependency order (admin_audit → blocks → messages → chats → reports → products → users),
  all scoped to the fixture uuid prefixes.
  {"users":1,"products":0,"reports":0,"blocks":0,"admin_audit":0,"chats":0,"messages":0,"policies":23}
  Exactly the P0 state; zero residue.

P8 — GATES: PASS (one precondition not met — see FINDING 4)
  node scripts/validate.mjs →
      ✅ Bright Line Scan: OK · ✅ Locality-First Scan: OK · ✅ Bengali-Only Scan: OK · ✅ MVP Scope Scan: OK
      ✅ ALL CHECKS PASSED          (exit 0)
  npm run build → exit 0, twice (clean rebuild) → 43 files / 771,693 B both times (deterministic).
  Byte delta attributable to this task: 0 B (docs only; `git status --short apps/web` empty).

FINDINGS:

1. Auto-hide is enforced in the app query, not in RLS — auto-hidden listings are publicly readable.
   Verbatim (P3.1, anon key from the shipped app, plain REST, no session):
     {"status":200,"rows_returned":1,"body":[{"id":"bbbbbbbb-0000-4000-8000-000000000001",
      "title":"টেস্ট ধান ক-১","hidden":false,"auto_hidden_at":"2026-11-01T08:21:22.602565+00:00"}]}
   Verbatim (live policy qual):  products_পঠন_সবার → ((NOT hidden) OR (seller_id = auth.uid()))
   Only `server-feed.ts:72` filters `auto_hidden_at`. Consequence: §12.4's "hide after 2/3 reports"
   is an app-layer guarantee only — the same anon key that ships in the APK enumerates auto-hidden
   listings, and any future consumer (admin panel export, web surface, analytics job, a client that
   forgets the filter) sees them. The user-facing feed is correct. Not fixed (out of scope).
   Note for any fix: the operator panel deliberately reads auto-hidden rows (badge), so an RLS change
   must keep the admin predicate as the bypass.

2. §12.4 queue has no final tie-break. The sort is count DESC → created_at DESC and then stops
   (admin/+page.svelte:76-81). Two listings with the same report count AND the same created_at
   (reachable: a batch insert stamps identical `now()` values) render in whatever order the REST
   response returned, because Array.prototype.sort is stable. Observed golden path is correct;
   this is a robustness gap, not a current defect. Not fixed (out of scope).

3. Web-asset byte figure does not reproduce CHC-D-043's recorded value: this run measures
   43 files / 771,693 B on two independent clean builds, while the close-out record says
   43 files / 771,688 B (+5 B). No `apps/web` source changed in this task, so the delta is
   pre-existing, not caused here. Not investigated (outside an evidence task); flagged so the
   ledger figure gets reconciled rather than silently diverging.

4. P8's stated precondition was already false at session start: `git status --short apps/web supabase docs`
   returned three pre-existing modified paths authored by the orchestrator —
     M docs/orchestration/DECISIONS.md
     M docs/orchestration/LEDGER.md
     M docs/orchestration/briefs/CHC-T-033.md
   apps/web and supabase were clean. Those edits are not mine and were left untouched/unstaged; the
   merge below therefore carries only this task's docs (see DEVIATIONS 7 on the ledger row).

DEVIATIONS:

1. No location table exists in the schema (users/products carry division/district/upazila/union_name/
   village + lat/lng; the hierarchy is bundled TS data, `apps/web/src/lib/data/locations.ts`). Instead of
   a `location_id`, fixtures use a dataset-valid tuple (খুলনা → বাগেরহাট → মরেলগঞ্জ → মোড়েলগঞ্জ ইউনিয়ন)
   and a village name — village is user-written free text by design (`locations-unions.ts:3`).
2. P3 was run and reported as built, not as hoped: its expected anon/buyer counts did not hold (FINDING 1).
   No fix attempted.
3. P4 was re-run once from a reset fixture state using count-shaped selects, because the Management API
   returns only the last result-producing statement: the first pass showed the `set_config` echo when the
   audit SELECT legitimately returned zero rows, which was ambiguous. Fixture state only (A-1 re-hidden,
   audit emptied) — no schema, policy or code touched.
4. P4 additionally exercised the app's own audit write shape (admin.ts কর্মলগলেখা) under the real admin
   RLS policy, because a bare SQL UPDATE correctly produces no audit row and would otherwise leave the
   write path untested end to end.
5. P5 set the three fixture products to distinct `created_at` values (08:00/08:10/08:20). With a single
   batch insert all three share one timestamp, which would have made the secondary sort key
   indistinguishable and the order test vacuous. Fixture data only.
6. Fixture users were created by service-role SQL as the brief's P1 mandates; `/auth/v1/signup` was not
   used, so no fixture email accounts exist. Zero OTP sends, zero SMS credits — the whole run cost nothing.
   The test-admin's `role='admin'` was set by SQL, mirroring the owner's management-API promotion
   (CHC-D-042); the app itself cannot self-promote (00005 column grants).
7. `docs/orchestration/LEDGER.md` already carried the orchestrator's uncommitted rows (T-033 rewrite to
   "brief ready", T-035 close-out) when this session started. My CHC-T-033 row update sits in the same
   file, so committing the ledger would also land another agent's in-flight hunks. Resolved by staging only
   my own hunk (the CHC-T-033 row) with a crafted patch, leaving the orchestrator's rows uncommitted.

ASSUMPTIONS:
- "The location table" refers to the bundled dataset (no such table in the database) — DEVIATION 1.
- The owner's uid was used only as an RLS claim value inside transactions that never modified owner data.
- Anon visibility was probed with the same anon key the app ships (`VITE_SUPABASE_ANON_KEY`), over real HTTPS.
- 771,693 B is total bytes of `apps/web/build` by `find -printf '%s'` sum (same method family as prior reports).

OPEN ISSUES:
1. FINDING 1 — auto-hidden listings readable via REST by anon and non-admin authenticated users.
   Needs an owner/orchestrator decision: close it in RLS (add `auto_hidden_at is null` to
   `products_পঠন_সবার` with the admin predicate as bypass) or accept app-layer filtering as the design.
2. Pre-existing from T-029/030 (#3): counts never decay after an operator unhide, so the next report on
   an unhidden listing re-hides it instantly. Not re-tested here (the reset in P4.0 was a direct SQL write,
   which would not have proven the report-driven path); still open.
3. FINDING 2 — queue tie-break (equal count + identical timestamp) is order-of-arrival dependent.
4. FINDING 3 — 5 B asset-count discrepancy vs the CHC-D-043 record.
5. Pre-existing and untouched: `users_পঠন_প্রমাণিত` is authenticated-wide (any signed-in user can list all
   users); noted in admin.ts's own comment, out of this brief's scope.

QUESTIONS: (exactly one)
Should the auto-hide gap in FINDING 1 be closed at the data layer — i.e. a follow-up brief that adds
`auto_hidden_at is null` to the products SELECT policy (with the admin read predicate as the bypass,
since the operator panel must still see auto-hidden rows) — or is app-query filtering the accepted
design for §12.4 hiding?

=== END REPORT ===
```

## Landing

| Item | Value |
|---|---|
| Branch | `task/CHC-T-033` |
| Commit | `f2d9aea docs(orchestration): CHC-T-033 stage-closing E2E evidence` (`Refs: CHC-T-033`), exactly 2 files: report (new, 232 lines) + `LEDGER.md` (CHC-T-033 row, 1 line) |
| Merge | `a76f4c97b36267b345e8790df4206f7b3b1e53c6` — merge `--no-ff` of `f2d9aea` into `main`, parents `e5e2583` + `f2d9aea`, docs-only |
| Push | `e5e2583..a76f4c9  main -> main` |
| Remote check | `a76f4c97b36267b345e8790df4206f7b3b1e53c6\trefs/heads/main` |

Merge hygiene: zero `apps/web/**`, zero `supabase/**` paths — the diff is the report plus one ledger row.
The orchestrator's uncommitted `DECISIONS.md` / `briefs/CHC-T-033.md` / `LEDGER.md` (T-035 row) edits were
left unchanged and uncommitted (DEVIATION 7); the ledger file was restored byte-identically after the merge
(sha256 match against the pre-merge backup).
