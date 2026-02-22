-- ARCHER EVENTS - ENTERPRISE SETTINGS SCHEMA (FIXED)
-- Run this in Supabase SQL Editor to set up enterprise settings functionality

-- 1. Drop existing tables to start fresh
drop table if exists public.user_sessions cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.brand_settings cascade;
drop table if exists public.profiles cascade;

-- 2. Drop existing functions
drop function if exists public.log_audit_changes() cascade;
drop function if exists public.handle_updated_at() cascade;

-- 3. Create Profiles table with role and brand access
create table public.profiles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  email text,
  full_name text,
  avatar_url text,
  role text default 'viewer' check (role in ('admin', 'operations', 'viewer')),
  brand_access text[] default '{}',
  is_active boolean default true,
  last_sign_in_at timestamptz,
  preferences jsonb default '{}'::jsonb,
  
  -- Foreign key to auth.users
  constraint fk_profile foreign key (id) references auth.users(id) on delete cascade
);

-- 4. Create Brand Settings table for visual configuration
create table public.brand_settings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  brand text not null check (brand in ('academy', 'invest', 'fund')),
  brand_name text,
  accent_color text,
  logo_url text,
  logo_wordmark_url text,
  email_contact text,
  is_active boolean default true,
  
  unique(brand)
);

-- 5. Create Audit Log table for activity tracking
create table public.audit_log (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete', 'login', 'logout')),
  resource_type text,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  metadata jsonb default '{}'::jsonb
);

-- 6. Create User Sessions table for session management
create table public.user_sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_token text unique,
  ip_address inet,
  user_agent text,
  is_active boolean default true,
  expires_at timestamptz
);

-- 7. Enable RLS (Security)
alter table public.profiles enable row level security;
alter table public.brand_settings enable row level security;
alter table public.audit_log enable row level security;
alter table public.user_sessions enable row level security;

-- 8. RLS Policies

-- Profiles: Users can read/update own profile, admins can do everything
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can update all profiles" on public.profiles for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can insert profiles" on public.profiles for insert with (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Brand Settings: All authenticated users can read, only admins can write
create policy "All authenticated users can read brand settings" on public.brand_settings for select using (auth.role() = 'authenticated');
create policy "Admins can manage brand settings" on public.brand_settings for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Audit Log: All authenticated users can read, system writes
create policy "All authenticated users can read audit log" on public.audit_log for select using (auth.role() = 'authenticated');
create policy "Service role can write audit log" on public.audit_log for insert with (auth.role() = 'service_role');

-- User Sessions: Users can manage own sessions, admins can view all
create policy "Users can manage own sessions" on public.user_sessions for all using (auth.uid() = user_id);
create policy "Admins can view all sessions" on public.user_sessions for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 9. Functions and Triggers for Audit Logging

-- Function to log changes
create or replace function public.log_audit_changes()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (user_id, action, resource_type, resource_id, new_values, ip_address, user_agent, metadata)
    values (
      auth.uid(),
      'create',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW),
      inet_client_addr(),
      current_setting('request.headers')::json->>'user-agent',
      jsonb_build_object('operation', TG_OP)
    );
    return NEW;
  elsif TG_OP = 'UPDATE' then
    insert into public.audit_log (user_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, metadata)
    values (
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      inet_client_addr(),
      current_setting('request.headers')::json->>'user-agent',
      jsonb_build_object('operation', TG_OP)
    );
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (user_id, action, resource_type, resource_id, old_values, ip_address, user_agent, metadata)
    values (
      auth.uid(),
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      null,
      inet_client_addr(),
      current_setting('request.headers')::json->>'user-agent',
      jsonb_build_object('operation', TG_OP)
    );
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

-- Triggers for audit logging
create trigger audit_profiles_changes
  after insert or update or delete on public.profiles
  for each row execute function public.log_audit_changes();

create trigger audit_brand_settings_changes
  after insert or update or delete on public.brand_settings
  for each row execute function public.log_audit_changes();

create trigger audit_events_changes
  after insert or update or delete on public.events
  for each row execute function public.log_audit_changes();

-- 10. Insert default brand settings
insert into public.brand_settings (brand, brand_name, accent_color, email_contact, is_active) values
  ('academy', 'Archer Academy', '#4d73ff', 'events@archer.finance', true),
  ('invest', 'Archer Invest', '#2d50ef', 'events@archer.finance', true),
  ('fund', 'Archer Investment Fund', '#1032cf', 'events@archer.finance', true);

-- 11. Create indexes for performance
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_brand_access on public.profiles using gin(brand_access);
create index idx_audit_log_user_id on public.audit_log(user_id);
create index idx_audit_log_created_at on public.audit_log(created_at desc);
create index idx_audit_log_resource on public.audit_log(resource_type, resource_id);

-- 12. Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

-- Triggers for updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger handle_brand_settings_updated_at
  before update on public.brand_settings
  for each row execute function public.handle_updated_at();

create trigger handle_audit_log_updated_at
  before update on public.audit_log
  for each row execute function public.handle_updated_at();

-- 13. Grant necessary permissions
grant usage on schema public to postgres;
grant usage on schema public to anon;
