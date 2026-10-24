-- ─────────────────────────────────────────────────────────────────────────────
-- ০০০০৬ — §১২.৪ প্রয়োগ: অপারেটর-কর্মের লগ + রিপোর্ট-সীমায় স্বয়ংক্রিয় লুকানো।
-- সূত্র: পিআরডি §১২.৪ ("hide after 2 reports" ভুয়া বিজ্ঞাপন / প্রতারণা,
-- "hide after 3 reports" স্প্যাম, "every admin action is logged");
-- সিদ্ধান্ত CHC-D-038 (এটি পিআরডি-নির্দিষ্ট প্রয়োগ, মালিকের নতুন সিদ্ধান্ত নয়);
-- টাস্ক CHC-T-029 (লগ) ও CHC-T-030 (সীমা)।
--
-- কেন দুটোই এক ফাইলে: দুটোই §১২.৪-এর একই বাক্যের দুই দিক — কে লুকাল তা জানা
-- না থাকলে স্বয়ংক্রিয় লুকানোও নিরীক্ষাযোগ্য নয়। একটি প্রয়োগ-ধাপ, একটি স্কিমা।
--
-- ⛔ সম্পূর্ণ additive: কোনো বিদ্যমান টেবিল/কলাম/নীতি মোছা বা বদলানো হয় না।
-- এখানে তৈরি হয় কেবল নতুন টেবিল, নতুন কলাম, নতুন ফাংশন, নতুন ট্রিগার, এবং
-- নতুন টেবিলের নিজের নীতি/অনুমতি। ০০০১-০০০৫-এর কিছুই স্পর্শ করা হয় না।
--
-- পুনরায় চালানো নিরাপদ (idempotent): if not exists / create or replace /
-- drop-if-exists কেবল *_নিজের_* নতুন অবজেক্টে (এই ফাইলে তৈরি), তারপর পুনঃতৈরি।
-- ─────────────────────────────────────────────────────────────────────────────


-- ── ১) অপারেটর-কর্মের লগ (পিআরডি §১২.৪: প্রতিটি অ্যাডমিন কাজ লগ হয়) ──
--
-- কে, কী, কোন জিনিসে, কখন — চারটিই এক সারিতে। details jsonb রাখা হয়েছে যাতে
-- ভবিষ্যতের অপারেটর-কাজ (যেমন কারণ/পূর্ববর্তী অবস্থা) স্কিমা না বদলেই যোগ হয়।
--
-- actor → users(id): লগের কর্তা সবসময় একজন প্রকৃত ব্যবহারকারী। এই টেবিলে
-- on delete cascade নেই — মুছে ফেলা ব্যবহারকারীর লগ রেকর্ড টিকে থাকে; লগ
-- নিজেই প্রমাণ, তাই সেটি কোনো ডিলিটের সঙ্গে হারিয়ে যাওয়া উচিত নয়।
create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references public.users (id),
  action text not null,
  target_type text not null,
  target_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- অপারেটরের নিজের ইতিহাস (সাম্প্রতিক আগে) এবং একটি নির্দিষ্ট লক্ষ্যের ইতিহাস।
create index if not exists admin_audit_actor_idx
  on public.admin_audit (actor, created_at desc);
create index if not exists admin_audit_target_idx
  on public.admin_audit (target_type, target_id);

alter table public.admin_audit enable row level security;

-- পড়া: কোনো নীতিই নেই — anon/authenticated কেউ লগ পড়তে পারে না (deny-all)।
-- অপারেটর-প্যানেল এই টেবিল পড়ে না; লগ পর্যালোচনা সার্ভার/সার্ভিস-রোলের কাজ,
-- এবং সেই পথ RLS এড়িয়ে যায় (bypassrls)। অর্থাৎ লগ লেখা হয়, দেখা হয় না।
--
-- লেখা: কেবল নিজের নামে, কেবল প্রকৃত অ্যাডমিন। নীতিটি actor = auth.uid()
-- দাবি করে, তাই একজন অপারেটর অন্যের নামে সারি বসাতে পারে না; role যাচাই
-- (০০০০৫-এর users.role) ছাড়া কেউ লগে ঢুকতেও পারে না। এটি ০০০৬-এর একমাত্র
-- নতুন নীতি — কোনো বিদ্যমান নীতির সঙ্গে মেলানো (OR) হয় না, কারণ এটি আলাদা টেবিল।
--
-- কেন নীতি দরকার (শূন্য-নীতির বদলে): ক্লায়েন্ট (admin.ts) লগ লেখে, আর RLS
-- চালু থাকলে শূন্য নীতি মানে প্রতিটি ইনসার্ট ৪২৫০১-এ ব্যর্থ — অর্থাৎ লগ কখনো
-- লেখা হতো না এবং পিআরডি §১২.৪-এর "every admin action is logged" ফাঁকা প্রতিশ্রুতি
-- হতো। নীতি যোগ করলে টেবিলটি লেখা-মাত্র-অ্যাডমিন, পড়া-কারও-নয় থাকে।
drop policy if exists অ্যাডমিন_কর্ম_লগ_যোগ on public.admin_audit;
create policy অ্যাডমিন_কর্ম_লগ_যোগ on public.admin_audit
  for insert to authenticated
  with check (
    actor = auth.uid()
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- অনুমতি স্পষ্টভাবে (CHC-D-016/022/031-এর explicit-grant নিয়ম): anon কিছুই নয়,
-- authenticated কেবল INSERT — SELECT/UPDATE/DELETE নেই, তাই লগ না পড়া যায়,
-- না বদলানো যায়, না মোছা যায়। সার্ভিস-রোল নিজের অনুমতিতে সবই করে (RLS এড়িয়ে)।
revoke all on table public.admin_audit from anon, authenticated;
grant insert on table public.admin_audit to authenticated;


-- ── ২) পণ্যে "স্বয়ংক্রিয়ভাবে লুকানো" চিহ্ন ──
--
-- hidden (মালিকের/অপারেটরের ইচ্ছা) থেকে আলাদা কলাম কেন: অপারেটরের "প্রকাশ
-- করুন" auto_hidden_at মুছে দেয়, আর মালিকের নিজের লুকানো (hidden) অটুট থাকে।
-- একটি কলামে দুটো অর্থ মিশিয়ে দিলে অপারেটর আর মালিকের সিদ্ধান্তের পার্থক্য
-- হারিয়ে যেত — এবং কে লুকিয়েছে তা আর বলা যেত না।
alter table public.products add column if not exists auto_hidden_at timestamptz;


-- ── ৩) রিপোর্ট-সীমার প্রয়োগ (পিআরডি §১২.৪) ──
--
-- কেন ট্রিগারে, ক্লায়েন্টে নয়: reports কেবল নিজের সারি পড়া যায়
-- (reports_পঠন_নিজের)। একজন রিপোর্টকারী কখনো অন্যের রিপোর্ট গুনতে পারে না —
-- তাই "২টি রিপোর্ট হলে লুকাও" ক্লায়েন্টে গণনা করা অসম্ভব এবং ভুল হতো।
-- সার্ভার-সাইড ট্রিগারই একমাত্র জায়গা যেখানে সত্যিকারের গণনা আছে।
--
-- কেন SECURITY DEFINER: ট্রিগার চলে রিপোর্টকারীর (authenticated) অনুমতিতে,
-- আর তার products-এ UPDATE অনুমতি নেই (০০০১: products_সম্পাদনা কেবল
-- seller_id = auth.uid())। Invoker-অধিকারে লুকানোর UPDATE সবসময় ব্যর্থ হতো।
-- তাই ফাংশনটি মালিকের (মাইগ্রেশন-চালক) অধিকারে চলে।
--
-- হাইজ্যাক-প্রতিরোধ: search_path পিন করা হয়েছে (= public), আর প্রতিটি টেবিল
-- পুরো নামে ডাকা হয় (public.reports, public.products)। ফলে কোনো ব্যবহারকারী
-- নিজের স্কিমায় reports/products বসিয়ে definer-এর ক্ষমতা নিজের দিকে ঘুরাতে
-- পারে না। একই কারণে ফাংশনের EXECUTE PUBLIC থেকে প্রত্যাহার করা হয় — এটি কেবল
-- ট্রিগারের ভেতরেই চলে, সরাসরি ডাকার কোনো পথ থাকা উচিত নয়।
--
-- সীমা কেবল সেই দুটো শ্রেণীতে যেগুলো পিআরডি-তে *স্বয়ংক্রিয়* লুকানো বলে
-- (ভুয়া বিজ্ঞাপন / প্রতারণা = ২, স্প্যাম = ৩)। উসকানি/সুদখোরি/অগ্রিম-প্রতারণা
-- শ্রেণীগুলো "+ প্রশাসক পর্যালোচনা" — সেগুলো এখানে স্বয়ংক্রিয় হয় না, অপারেটর
-- নিজে সিদ্ধান্ত নেন (এবং অপারেটরের সেই কাজ লগে যায়)।
--
-- শ্রেণীর লেখা হুবহু রিপোর্ট-মোডালের (logic/safety.ts রিপোর্টশ্রেণী) সঙ্গে
-- মিলতে হবে — এক অক্ষর মিললেও না হলে কাউন্ট শূন্য থাকে এবং লুকানো কখনো ঘটে না।
--
-- নাম সংক্ষিপ্ত কেন: PostgreSQL পরিচয়পত্র ৬৩ বাইটে কেটে ফেলে (NAMEDATALEN)।
-- `moderation_স্বয়ংক্রিয়_লুকানো` ছিল ৬৬ বাইট — অর্থাৎ শেষের "ো" নীরবে হারিয়ে
-- যেত (পার্স যাচাইয়েই ধরা পড়েছে)। `স্বয়ংক্রিয়_লুকানো` = ৫৫ বাইট, নিরাপদ
-- হেডরুমসহ।
create or replace function public.স্বয়ংক্রিয়_লুকানো()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ভুয়াগণনা integer;
  স্প্যামগণনা integer;
begin
  -- কেবল পণ্য-রিপোর্ট। ব্যবহারকারী/বার্তা-রিপোর্ট এই ট্রিগারের বিষয় নয়
  -- (সেগুলোর নিজস্ব ব্যবহার আছে: বার্তা লুকানো, ব্যবহারকারী পর্যালোচনা)।
  if new.target_type <> 'product' then
    return new;
  end if;

  select count(*) filter (where category = 'ভুয়া বিজ্ঞাপন / প্রতারণা'),
         count(*) filter (where category = 'স্প্যাম')
    into ভুয়াগণনা, স্প্যামগণনা
    from public.reports
   where target_type = 'product'
     and target_id = new.target_id;

  -- একই পণ্যে বারবার ট্রিগার চললেও auto_hidden_at প্রথমবারেই বসে
  -- (and auto_hidden_at is null) — পরে যোগ হওয়া রিপোর্ট সময়টা বদলায় না,
  -- তাই "কখন স্বয়ংক্রিয়ভাবে লুকানো হলো" প্রশ্নের উত্তর স্থির থাকে।
  if ভুয়াগণনা >= 2 or স্প্যামগণনা >= 3 then
    update public.products
       set auto_hidden_at = now()
     where id = new.target_id
       and auto_hidden_at is null;
  end if;

  return new;
end;
$$;

revoke all on function public.স্বয়ংক্রিয়_লুকানো() from public;

-- প্রতিটি নতুন রিপোর্টের পরে চলে। after insert (before নয়) কারণ কাউন্টে
-- এই নতুন সারিটিও ধরা দরকার — সীমার অর্থই তো সেটি।
drop trigger if exists reports_স্বয়ংক্রিয়_লুকানো on public.reports;
create trigger reports_স্বয়ংক্রিয়_লুকানো
  after insert on public.reports
  for each row
  execute function public.স্বয়ংক্রিয়_লুকানো();
