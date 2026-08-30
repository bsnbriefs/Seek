-- SEEK production foundation
create extension if not exists pgcrypto;

create type public.request_status as enum ('pending_review','verification_required','published','partially_funded','fulfilled','closed','rejected');
create type public.offer_status as enum ('pending_review','published','matched','fulfilled','closed','rejected');
create type public.payment_status as enum ('pending','successful','failed','refunded');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  location text,
  role text default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  public_reference text unique not null default ('SEEK-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  category text not null,
  location text not null,
  description text not null,
  amount_needed numeric(14,2),
  amount_raised numeric(14,2) not null default 0,
  urgency text not null default 'normal',
  assistance_type text not null default 'Any form of help',
  verification_status text not null default 'pending',
  status public.request_status not null default 'pending_review',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_private (
  request_id uuid primary key references public.requests(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  description text not null,
  category text,
  location text,
  status public.offer_status not null default 'pending_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  location text not null,
  interests text,
  status text not null default 'pending_review',
  created_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete set null,
  donor_user_id uuid references auth.users(id) on delete set null,
  donor_email text not null,
  donor_name text,
  anonymous boolean not null default false,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'NGN',
  paystack_reference text unique,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  verifier_id uuid references auth.users(id) on delete set null,
  level text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.requests(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists requests_public_idx on public.requests(is_public, status, created_at desc);
create index if not exists requests_category_idx on public.requests(category);
create index if not exists donations_request_idx on public.donations(request_id, status);

alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.request_private enable row level security;
alter table public.offers enable row level security;
alter table public.volunteers enable row level security;
alter table public.donations enable row level security;
alter table public.verifications enable row level security;
alter table public.reports enable row level security;

-- Public can only see approved, published requests. Private contact data is never public.
create policy "public can view published requests" on public.requests for select using (is_public = true and status in ('published','partially_funded','fulfilled'));
create policy "anyone can submit a request" on public.requests for insert with check (status = 'pending_review' and is_public = false);
create policy "anyone can submit request private data" on public.request_private for insert with check (true);
create policy "anyone can submit an offer" on public.offers for insert with check (status = 'pending_review');
create policy "anyone can submit volunteer application" on public.volunteers for insert with check (status = 'pending_review');

-- Donors can create a donation record only through the payment Edge Function; keep direct client access disabled.
-- The service-role key bypasses RLS inside the Edge Function.

-- Admin policies should be added using a dedicated admin role/claim before launch.
