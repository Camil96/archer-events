/*
  FIX SCHEMA COMPREHENSIVE
  Restoring table structure for reconstruction.
*/

create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  deleted_at timestamptz,
  title text not null,
  description text,
  location text,
  start_at timestamptz,
  end_at timestamptz,
  brand text check (brand in ('Academy', 'Invest', 'Fund')),
  timezone text default 'Europe/Brussels',
  capacity int default 0
);

create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id),
  title text,
  status text default 'todo',
  due_at timestamptz
);

create table if not exists public.event_participants (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events(id),
  name text,
  email text,
  role text default 'guest',
  status text default 'invited'
);

-- RLS (Basic)
alter table public.events enable row level security;
create policy "Public Access" on public.events for all using (true);

alter table public.tasks enable row level security;
create policy "Public Access" on public.tasks for all using (true);

alter table public.event_participants enable row level security;
create policy "Public Access" on public.event_participants for all using (true);
