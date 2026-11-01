-- ─────────────────────────────────────────────────────────────────────────────
-- ০০০৯ — পুশ নোটিফিকেশন: ডিভাইস টোকেন, বিপণন-সম্মতি, বার্তা-ট্রিগার।
-- সূত্র: পিআরডি §১৫.৩ (নতুন পোস্ট / নতুন বার্তা), §১৫.৪ (টগল), টাস্ক CHC-T-039।
--
-- কী যোগ হয় (চারটি স্বতন্ত্র অংশ):
--   ১. device_tokens — প্রতি ডিভাইসের FCM টোকেন, কেবল নিজের সারি।
--   ২. users.marketing_optin — বিপণন-সম্মতি, ডিফল্ট false (অর্থাৎ বন্ধ)।
--   ৩. push_config — ফাংশনের URL ও ট্রিগার-সিক্রেটের একমাত্র ঘর; কোনো
--      ক্লায়েন্ট পড়তে বা লিখতে পারে না, আর এই ফাইলে কোনো সিক্রেট বসানো হয় না
--      (দুটোই খালি অবস্থায় বীজ করা হয়; অপারেটর Phase B-তে বসাবেন)।
--   ৪. messages-এ AFTER INSERT ট্রিগার — pg_net দিয়ে send-fcm-এ ডাক।
--
-- ⛔ বাংলা-শুধু নোটিফিকেশন টেক্সট এই ফাংশনে নয় — সেটি Edge Function-এর
--    নির্দিষ্ট মানচিত্রে (supabase/functions/send-fcm/index.ts)। এখানে কোনো
--    টাকা/পেমেন্ট-সংক্রান্ত ধারণা নেই (প্ল্যাটফর্ম টাকা ছোঁয় না — §১.১)।
--
-- পুনরায় চালানো নিরাপদ: প্রতিটি বস্তু if-not-exists / drop-if-exists /
-- create-or-replace দিয়ে লেখা; grant- revoked-ও idempotent।
-- ইতিমধ্যে প্রয়োগ করা মাইগ্রেশন (০০০১–০০০৮) সম্পাদনা করা হয়নি।
-- ─────────────────────────────────────────────────────────────────────────────

-- ১) pg_net — SQL থেকে ডাকার একমাত্র পথ। ডিফল্ট স্কিমা `net`।
--    (এক্সটেনশনটি প্রকল্পে আগে থেকেই উপলব্ধ; এখানে কেবল সক্রিয় করা হচ্ছে।)
create extension if not exists pg_net;

-- ── ২) ডিভাইস টোকেন ─────────────────────────────────────────────────────────
-- এক টোকেন = এক ডিভাইস (unique)। ইউজার মুছলে টোকেনও যায় (cascade) — মুছে ফেলা
-- অ্যাকাউন্টে পুশ যাওয়ার কোনো পথ থাকে না।
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  fcm_token text not null unique,
  platform text not null default 'android' check (platform in ('android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_ইউজার_সূচি
  on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

-- anon কিছুই নয় (লগইনের আগে টোকেন লেখার দরকার নেই); authenticated শুধু নিজের
-- সারি — আর সেটাও RLS নীতিই ঠিক করে, grant নয়। দুটি স্তর আলাদা (০০০৫-এর নিয়ম)।
revoke all on table public.device_tokens from anon, authenticated;
grant select, insert, update, delete on table public.device_tokens to authenticated;

drop policy if exists device_tokens_নিজের_পঠন on public.device_tokens;
create policy device_tokens_নিজের_পঠন on public.device_tokens
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists device_tokens_নিজের_যোগ on public.device_tokens;
create policy device_tokens_নিজের_যোগ on public.device_tokens
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists device_tokens_নিজের_হালনাগাদ on public.device_tokens;
create policy device_tokens_নিজের_হালনাগাদ on public.device_tokens
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists device_tokens_নিজের_মুছে_ফেলা on public.device_tokens;
create policy device_tokens_নিজের_মুছে_ফেলা on public.device_tokens
  for delete to authenticated
  using (user_id = auth.uid());

-- ── ৩) বিপণন-সম্মতি (§১৫.৪) ────────────────────────────────────────────────
-- ডিফল্ট false = বন্ধ। নতুন পোস্ট ও চ্যাট বার্তার টগল ডেটাবেসে রাখা হয় না —
-- সেগুলো §১৫.৪ অনুযায়ী সবসময় চালু, ব্যবহারকারী বন্ধ করতে পারেন না।
alter table public.users
  add column if not exists marketing_optin boolean not null default false;

comment on column public.users.marketing_optin is
  'বিপণন-সম্মতি — ডিফল্ট false (বন্ধ)। নতুন পোস্ট ও চ্যাট বার্তা সবসময় চালু, এই কলামে থাকে না (§১৫.৪)।';

-- ০০০৫ users-এর অনুমতি কলাম-সীমিত করে রেখেছে (revoke all + নির্দিষ্ট কলাম-তালিকা)।
-- নতুন কলাম তাই নিজের grant ছাড়া ক্লায়েন্টের কাছে অদৃশ্য ও অলিখনযোগ্য হতো।
-- grant additive — বিদ্যমান কলাম-তালিকা অটুট, role/verified/phone আগের মতোই বন্ধ।
grant select (marketing_optin) on table public.users to authenticated;
grant update (marketing_optin) on table public.users to authenticated;

-- ── ৪) push_config — এক সারি, কোনো নীতি নেই ─────────────────────────────────
-- কেন আলাদা টেবিল: ট্রিগারকে ফাংশনের URL ও একটি ভাগ-করা সিক্রেট জানতে হয়।
--   • service-role কী টেবিলে বসানো হয় না — সেটি সবচেয়ে ক্ষমতাধর ক্রেডেনশিয়াল,
--     আর ট্রিগার-পথের জন্য কেবল পুশ-অনুমতিই যথেষ্ট (least privilege)।
--   • RLS চালু, কোনো নীতি নেই → anon/authenticated-এর জন্য শূন্য সারি;
--     service_role (ফাংশন) RLS বাইপাস করে পড়ে। revoke অতিরিক্ত বেল্ট।
--   • দুটি মানই খালি বীজ করা হয় — এই ফাইলে কোনো সিক্রেট নেই। শূন্য থাকলে
--     ট্রিগার কিছুই পাঠায় না (নিচে দেখুন), তাই ভুলে পুশ বেরোনোর পথ নেই।
create table if not exists public.push_config (
  id text primary key default 'default' check (id = 'default'),
  endpoint_url text,
  trigger_secret text,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.push_config enable row level security;
revoke all on table public.push_config from anon, authenticated;

insert into public.push_config (id)
values ('default')
on conflict (id) do nothing;

comment on table public.push_config is
  'পুশ ট্রিগারের কনফিগ — endpoint_url ও trigger_secret অপারেটর Phase B-তে বসান। enabled=false মানে ট্রিগার নীরব।';

-- ── ৫) বার্তা-ট্রিগার ───────────────────────────────────────────────────────
-- নতুন বার্তায় প্রাপক (অর্থাৎ যে পাঠায়নি সে) নির্ধারণ করে send-fcm-এ ডাকা হয়।
-- ব্যর্থতা কখনো বার্তা লেখা আটকায় না: pg_net ডাক সারিবদ্ধ (async), আর যেকোনো
-- অনুপস্থিত কনফিগে ট্রিগার নীরবে ফিরে যায়।
create or replace function public.বার্তা_পুশ_পাঠাও()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
declare
  চ্যাট record;
  কনফিগ record;
  প্রাপক uuid;
begin
  -- প্রাপক = চ্যাটের অপর পক্ষ। প্রেরক চ্যাটের পক্ষ না হলে কিছুই নয়।
  select c.buyer_id, c.seller_id into চ্যাট
  from public.chats c
  where c.id = new.chat_id;

  if চ্যাট is null then
    return new;
  end if;

  if new.sender_id = চ্যাট.buyer_id then
    প্রাপক := চ্যাট.seller_id;
  elsif new.sender_id = চ্যাট.seller_id then
    প্রাপক := চ্যাট.buyer_id;
  else
    return new;
  end if;

  select endpoint_url, trigger_secret, enabled into কনফিগ
  from public.push_config
  where id = 'default';

  -- কনফিগ অসম্পূর্ণ (Phase B-র আগে) → নীরব প্রত্যাবর্তন, কোনো ডাক নয়।
  if কনফিগ is null
     or not কনফিগ.enabled
     or coalesce(কনফিগ.endpoint_url, '') = ''
     or coalesce(কনফিগ.trigger_secret, '') = '' then
    return new;
  end if;

  perform net.http_post(
    url := কনফিগ.endpoint_url,
    body := jsonb_build_object(
      'target_user_id', প্রাপক,
      'kind', 'chat_message',
      'chat_id', new.chat_id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', কনফিগ.trigger_secret
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

-- ট্রিগার-ফাংশন ক্লায়েন্টের জন্য কলযোগ্য নয় — কেবল ট্রিগারই চালায়।
revoke all on function public.বার্তা_পুশ_পাঠাও() from public, anon, authenticated;

drop trigger if exists messages_পুশ on public.messages;
create trigger messages_পুশ
  after insert on public.messages
  for each row
  execute function public.বার্তা_পুশ_পাঠাও();
