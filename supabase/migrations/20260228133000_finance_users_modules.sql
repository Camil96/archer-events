-- Archer Events - Finance + User management module schema
-- Run in Supabase SQL editor (or via migration runner)

create extension if not exists pgcrypto;

create table if not exists public.catering_items (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  name text not null,
  category text,
  item_type text default 'eten',
  unit text default 'per persoon',
  unit_price numeric(10,2) not null default 0,
  vat_rate numeric(5,2) default 6.00,
  is_active boolean default true,
  brand_key text default 'all'
);

create table if not exists public.event_catering (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade,
  catering_item_id uuid references public.catering_items(id),
  quantity integer default 1,
  unit_price_override numeric(10,2),
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.event_budget (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade unique,
  location_cost numeric(10,2) default 0,
  speaker_costs jsonb default '[]',
  material_costs jsonb default '[]',
  marketing_costs jsonb default '[]',
  other_costs jsonb default '[]',
  ticket_price numeric(10,2) default 0,
  income_override numeric(10,2),
  notes text,
  updated_at timestamptz default now()
);

insert into public.catering_items (name, category, item_type, unit, unit_price, vat_rate) values
  ('Koffie & thee (onbeperkt)', 'Koffie & water', 'drank', 'per persoon', 3.50, 6.00),
  ('Water still/sparkling', 'Koffie & water', 'drank', 'per persoon', 2.00, 6.00),
  ('Broodjes lunch (2 stuks)', 'Broodjes & lunch', 'eten', 'per persoon', 8.50, 6.00),
  ('Warme lunch (3-gangen)', 'Broodjes & lunch', 'eten', 'per persoon', 22.00, 12.00),
  ('Receptie drankjes', 'Receptie', 'drank', 'per persoon', 12.00, 21.00),
  ('Dagarrangement basis', 'Dagarrangement', 'pakket', 'per persoon', 45.00, 12.00),
  ('Dagarrangement premium', 'Dagarrangement', 'pakket', 'per persoon', 75.00, 12.00),
  ('Diner (3-gangen)', 'Diner', 'eten', 'per persoon', 55.00, 12.00)
on conflict do nothing;

alter table public.profiles
  add column if not exists role text default 'viewer',
  add column if not exists brand_access text[] default '{academy,invest,fund}',
  add column if not exists avatar_url text,
  add column if not exists language_pref text default 'nl',
  add column if not exists responsibilities text,
  add column if not exists status text default 'actief',
  add column if not exists invited_at timestamptz,
  add column if not exists last_login timestamptz;

create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  payload jsonb
);

