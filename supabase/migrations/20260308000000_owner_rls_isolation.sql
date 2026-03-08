-- Archer Events - Owner isolation + RLS
-- Let op: dit script NIET automatisch uitgevoerd door de app.
-- Voer handmatig uit in Supabase SQL Editor.

begin;

alter table if exists public.events add column if not exists owner_id uuid;
alter table if exists public.tasks add column if not exists owner_id uuid;
alter table if exists public.subtasks add column if not exists owner_id uuid;
alter table if exists public.task_assignments add column if not exists owner_id uuid;
alter table if exists public.event_participants add column if not exists owner_id uuid;
alter table if exists public.attachments add column if not exists owner_id uuid;
alter table if exists public.event_catering add column if not exists owner_id uuid;
alter table if exists public.event_budget add column if not exists owner_id uuid;

alter table if exists public.events
  alter column owner_id set default auth.uid();

-- Backfill bestaande events (fallback naar eerste auth user als owner ontbreekt).
do $$
begin
  if exists (select 1 from auth.users) then
    update public.events e
       set owner_id = coalesce(e.owner_id, u.id)
      from (select id from auth.users order by created_at asc limit 1) u
     where e.owner_id is null;
  end if;
end $$;

-- Backfill owner_id voor gerelateerde tabellen via event relatie.
update public.tasks t
   set owner_id = e.owner_id
  from public.events e
 where t.event_id = e.id
   and t.owner_id is null;

update public.event_participants p
   set owner_id = e.owner_id
  from public.events e
 where p.event_id = e.id
   and p.owner_id is null;

update public.attachments a
   set owner_id = e.owner_id
  from public.events e
 where a.event_id = e.id
   and a.owner_id is null;

update public.event_catering c
   set owner_id = e.owner_id
  from public.events e
 where c.event_id = e.id
   and c.owner_id is null;

update public.event_budget b
   set owner_id = e.owner_id
  from public.events e
 where b.event_id = e.id
   and b.owner_id is null;

update public.subtasks s
   set owner_id = t.owner_id
  from public.tasks t
 where s.task_id = t.id
   and s.owner_id is null;

update public.task_assignments ta
   set owner_id = t.owner_id
  from public.tasks t
 where ta.task_id = t.id
   and ta.owner_id is null;

-- Koppel owner_id aan auth.users waar mogelijk.
alter table if exists public.events
  drop constraint if exists events_owner_id_fkey;
alter table if exists public.events
  add constraint events_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete cascade;

alter table if exists public.tasks
  drop constraint if exists tasks_owner_id_fkey;
alter table if exists public.tasks
  add constraint tasks_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;

alter table if exists public.subtasks
  drop constraint if exists subtasks_owner_id_fkey;
alter table if exists public.subtasks
  add constraint subtasks_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;

alter table if exists public.task_assignments
  drop constraint if exists task_assignments_owner_id_fkey;
alter table if exists public.task_assignments
  add constraint task_assignments_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;

alter table if exists public.event_participants
  drop constraint if exists event_participants_owner_id_fkey;
alter table if exists public.event_participants
  add constraint event_participants_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;

alter table if exists public.attachments
  drop constraint if exists attachments_owner_id_fkey;
alter table if exists public.attachments
  add constraint attachments_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;

alter table if exists public.event_catering
  drop constraint if exists event_catering_owner_id_fkey;
alter table if exists public.event_catering
  add constraint event_catering_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;

alter table if exists public.event_budget
  drop constraint if exists event_budget_owner_id_fkey;
alter table if exists public.event_budget
  add constraint event_budget_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete set null;

-- NOT NULL alleen afdwingen als alle rows ingevuld zijn.
do $$
begin
  if not exists (select 1 from public.events where owner_id is null) then
    alter table public.events alter column owner_id set not null;
  end if;
end $$;

create index if not exists idx_events_owner_id on public.events(owner_id);
create index if not exists idx_events_owner_start_at on public.events(owner_id, start_at);
create index if not exists idx_tasks_event_id on public.tasks(event_id);
create index if not exists idx_event_participants_event_id on public.event_participants(event_id);
create index if not exists idx_attachments_event_id on public.attachments(event_id);
create index if not exists idx_event_catering_event_id on public.event_catering(event_id);
create index if not exists idx_event_budget_event_id on public.event_budget(event_id);

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) = 'admin'
  );
$$;

create or replace function public.can_access_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_user()
     or exists (
       select 1
       from public.events e
       where e.id = target_event_id
         and e.owner_id = auth.uid()
     );
$$;

alter table if exists public.events enable row level security;
alter table if exists public.tasks enable row level security;
alter table if exists public.subtasks enable row level security;
alter table if exists public.task_assignments enable row level security;
alter table if exists public.event_participants enable row level security;
alter table if exists public.attachments enable row level security;
alter table if exists public.event_catering enable row level security;
alter table if exists public.event_budget enable row level security;

-- Verwijder oude brede policies.
drop policy if exists "Enable all access for all users" on public.events;
drop policy if exists "Enable all access for all users" on public.tasks;
drop policy if exists "Enable all access for all users" on public.event_participants;

-- Events
drop policy if exists events_owner_select on public.events;
drop policy if exists events_owner_insert on public.events;
drop policy if exists events_owner_update on public.events;
drop policy if exists events_owner_delete on public.events;

create policy events_owner_select
on public.events
for select
using (owner_id = auth.uid() or public.is_admin_user());

create policy events_owner_insert
on public.events
for insert
with check (owner_id = auth.uid() or public.is_admin_user());

create policy events_owner_update
on public.events
for update
using (owner_id = auth.uid() or public.is_admin_user())
with check (owner_id = auth.uid() or public.is_admin_user());

create policy events_owner_delete
on public.events
for delete
using (owner_id = auth.uid() or public.is_admin_user());

-- Tasks
drop policy if exists tasks_owner_all on public.tasks;
create policy tasks_owner_all
on public.tasks
for all
using (public.can_access_event(event_id))
with check (public.can_access_event(event_id));

-- Subtasks
drop policy if exists subtasks_owner_all on public.subtasks;
create policy subtasks_owner_all
on public.subtasks
for all
using (
  exists (
    select 1
    from public.tasks t
    where t.id = subtasks.task_id
      and public.can_access_event(t.event_id)
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = subtasks.task_id
      and public.can_access_event(t.event_id)
  )
);

-- Task assignments
drop policy if exists task_assignments_owner_all on public.task_assignments;
create policy task_assignments_owner_all
on public.task_assignments
for all
using (
  exists (
    select 1
    from public.tasks t
    where t.id = task_assignments.task_id
      and public.can_access_event(t.event_id)
  )
)
with check (
  exists (
    select 1
    from public.tasks t
    where t.id = task_assignments.task_id
      and public.can_access_event(t.event_id)
  )
);

-- Participants
drop policy if exists participants_owner_all on public.event_participants;
create policy participants_owner_all
on public.event_participants
for all
using (public.can_access_event(event_id))
with check (public.can_access_event(event_id));

-- Attachments
drop policy if exists attachments_owner_all on public.attachments;
create policy attachments_owner_all
on public.attachments
for all
using (public.can_access_event(event_id))
with check (public.can_access_event(event_id));

-- Catering lines
drop policy if exists event_catering_owner_all on public.event_catering;
create policy event_catering_owner_all
on public.event_catering
for all
using (public.can_access_event(event_id))
with check (public.can_access_event(event_id));

-- Event budget
drop policy if exists event_budget_owner_all on public.event_budget;
create policy event_budget_owner_all
on public.event_budget
for all
using (public.can_access_event(event_id))
with check (public.can_access_event(event_id));

commit;
