-- ARCHER EVENT OPERATIONS - MASTER SCHEMA
-- Run this in the Supabase SQL Editor to set up the entire backend.

-- 1. Events Table
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  title text not null,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz,
  brand text check (brand in ('Academy', 'Invest', 'Fund', 'General')) default 'General',
  timezone text default 'Europe/Brussels',
  capacity int default 0
);

-- 2. Participants Table
create table if not exists public.event_participants (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade,
  created_at timestamptz default now(),
  name text,
  email text,
  company text,
  role text default 'guest', -- 'guest', 'speaker', 'host'
  status text default 'invited', -- 'invited', 'confirmed', 'declined'
  checked_in boolean default false
);

-- 3. Tasks Table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id) on delete cascade,
  created_at timestamptz default now(),
  title text not null,
  status text default 'todo', -- 'todo', 'in_progress', 'done'
  assignee text,
  due_at timestamptz
);

-- 4. Enable RLS (Security)
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.tasks enable row level security;
alter table objects enable row level security;

-- 5. Policies (Allow all for authenticated users/anon for now)
create policy "Enable all access for all users" on public.events for all using (true) with check (true);
create policy "Enable all access for all users" on public.event_participants for all using (true) with check (true);
create policy "Enable all access for all users" on public.tasks for all using (true) with check (true);

-- 6. Storage (Optional: Attachments bucket)
insert into storage.buckets (id, name, public) 
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "Public Access to Attachments" on storage.objects for all using ( bucket_id = 'attachments' );
