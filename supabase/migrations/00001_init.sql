-- চাষী কানেকশন — প্রাথমিক স্কিমা ও সারি-স্তরের নিরাপত্তা (RLS)
-- সূত্র: পিআরডি V5.0 §১৯ ("✅ Keep" টেবিল) ও §১৭.১ (এমভিপি তালিকা)।
--
-- এটি একটি ডিজিটাল হাটের বিজ্ঞাপন-বোর্ড। প্ল্যাটফর্ম টাকা ধরে না, লেনদেন
-- মধ্যস্থতা করে না — তাই এখানে কোনো আর্থিক বা অর্ডার-ভিত্তিক টেবিল নেই।
-- অনুপস্থিতি ইচ্ছাকৃত, এবং ভবিষ্যতেও যোগ হবে না।
--
-- ব্যবহারকারীর পরিচয় পরে auth.users-এ যুক্ত হবে; id গুলো এখনই uuid।
-- একমাত্র auth নির্ভরতা: RLS নীতিতে auth.uid() — auth চালু হলে এগুলো নিজেই সক্রিয় হবে।

-- ── ব্যবহারকারী ও তাদের গ্রাম ──
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text not null,
  label text not null,
  division text not null,
  district text not null,
  upazila text not null,
  union_name text not null,
  village text not null,
  lat double precision not null,
  lng double precision not null,
  detail text,
  whatsapp text,
  women_safety boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── বিজ্ঞাপন: বিক্রয় ও প্রয়োজন (উইশলিস্ট) একই টেবিলে, type দিয়ে আলাদা ──
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('sale', 'wanted')),
  title text not null,
  price numeric,
  unit text not null default 'কেজি',
  quantity numeric not null default 1,
  category text not null,
  description text,
  photo text,
  division text not null,
  district text not null,
  upazila text not null,
  union_name text not null,
  village text not null,
  lat double precision not null,
  lng double precision not null,
  negotiable boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

-- ── আলাপ (একটি বিজ্ঞাপনের সূত্রে ক্রেতা ও বিক্রেতার মধ্যে) ──
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.products (id) on delete cascade,
  buyer_id uuid not null references public.users (id) on delete cascade,
  seller_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

-- ── বার্তা: শুধু লেখা, ছবি, এলাকা — ভয়েস কলাম নেই ──
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  kind text not null default 'text' check (kind in ('text', 'image', 'location')),
  created_at timestamptz not null default now()
);

-- ── রিপোর্ট (প্রতিটি বিজ্ঞাপন/প্রোফাইল/বার্তায়) ──
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users (id) on delete cascade,
  target_type text not null check (target_type in ('product', 'user', 'message')),
  target_id uuid not null,
  category text not null,
  details text,
  created_at timestamptz not null default now()
);

-- ── ব্লক (নিজের তালিকা, এক জোড়া একবার) ──
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_জোড়া_অদ্বিতীয় unique (blocker_id, blocked_id),
  constraint blocks_নিজেকে_নয় check (blocker_id <> blocked_id)
);

-- ── ফিডের ক্রম (লোকালিটি-প্রথম; band গুলো ক্লায়েন্টে হয়) ──
create index if not exists products_created_idx on public.products (created_at desc);
create index if not exists products_seller_idx on public.products (seller_id);
create index if not exists products_type_created_idx on public.products (type, created_at desc);
create index if not exists messages_chat_created_idx on public.messages (chat_id, created_at);
create index if not exists chats_buyer_idx on public.chats (buyer_id);
create index if not exists chats_seller_idx on public.chats (seller_id);
create index if not exists reports_target_idx on public.reports (target_type, target_id);

-- ── RLS: প্রতিটি টেবিলে চালু ──
alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

-- ── products: পাবলিক বোর্ড, লেখা শুধু মালিকের ──
-- অপ্রকাশিত (hidden) পোস্ট কেবল মালিক দেখে।
create policy products_পঠন_সবার on public.products
  for select to anon, authenticated
  using (not hidden or seller_id = auth.uid());

create policy products_যোগ on public.products
  for insert to authenticated
  with check (seller_id = auth.uid());

create policy products_সম্পাদনা on public.products
  for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

create policy products_মুছে_ফেলা on public.products
  for delete to authenticated
  using (seller_id = auth.uid());

-- ── users: প্রোফাইল দেখা (চ্যাটে নাম/লেবেল), নিজের সারি লেখা ──
create policy users_পঠন_প্রমাণিত on public.users
  for select to authenticated
  using (true);

create policy users_যোগ on public.users
  for insert to authenticated
  with check (id = auth.uid());

create policy users_সম্পাদনা on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── chats: কেবল অংশগ্রহণকারীরা ──
create policy chats_পঠন_অংশীদার on public.chats
  for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy chats_যোগ on public.chats
  for insert to authenticated
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

-- ── messages: অংশীদার পড়ে, নিজের নামে লেখে ──
create policy messages_পঠন_অংশীদার on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.chats c
      where c.id = messages.chat_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy messages_যোগ on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chats c
      where c.id = messages.chat_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- ── reports: নিজের রিপোর্ট লেখা ও পড়া ──
create policy reports_যোগ on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy reports_পঠন_নিজের on public.reports
  for select to authenticated
  using (reporter_id = auth.uid());

-- ── blocks: নিজের তালিকা সম্পূর্ণ নিয়ন্ত্রণ ──
create policy blocks_পঠন_নিজের on public.blocks
  for select to authenticated
  using (blocker_id = auth.uid());

create policy blocks_যোগ on public.blocks
  for insert to authenticated
  with check (blocker_id = auth.uid());

create policy blocks_সম্পাদনা on public.blocks
  for update to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

create policy blocks_মুছে_ফেলা on public.blocks
  for delete to authenticated
  using (blocker_id = auth.uid());
