-- ARCHER EVENTS - ENTERPRISE SETTINGS SCHEMA
-- Run this in Supabase SQL Editor to add enterprise settings functionality

-- 1. Create/Update Profiles table with role and brand access
create table if not exists public.profiles (
  id uuid default auth.uid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  email text,
  full_name text,
  avatar_url text,
  role text default 'viewer' check (role in ('admin', 'operations', 'viewer')),
  brand_access text[] default '{}', -- Array of brands user can access: ['academy', 'invest', 'fund']
  is_active boolean default true,
  last_sign_in_at timestamptz,
  preferences jsonb default '{}'::jsonb, -- {language: 'nl', notifications: true, theme: 'light'}
  
  -- Foreign key to auth.users
  constraint fk_profile foreign key (id) references auth.users(id) on delete cascade
);

-- 2. Create Brand Settings table for visual configuration
create table if not exists public.brand_settings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  brand text not null check (brand in ('academy', 'invest', 'fund')),
  brand_name text, -- Custom display name
  accent_color text, -- Primary brand color (hex)
  logo_url text, -- Custom logo URL
  logo_wordmark_url text, -- Custom wordmark URL
  email_contact text, -- Contact email for brand
  is_active boolean default true,
  
  unique(brand)
);

-- 3. Create Audit Log table
create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null, -- 'create', 'update', 'delete', 'login', 'logout'
  resource_type text, -- 'event', 'user', 'brand_setting', 'profile'
  resource_id uuid, -- ID of the affected resource
  old_values jsonb, -- Previous state (for updates)
  new_values jsonb, -- New state
  ip_address inet,
  user_agent text,
  metadata jsonb default '{}'::jsonb -- Additional context
);

-- 4. Create User Sessions table for better tracking
create table if not exists public.user_sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_token text unique,
  ip_address inet,
  user_agent text,
  is_active boolean default true,
  expires_at timestamptz
);

-- 5. Enable RLS on new tables
alter table public.profiles enable row level security;
alter table public.brand_settings enable row level security;
alter table public.audit_log enable row level security;
alter table public.user_sessions enable row level security;

-- 6. RLS Policies

-- Profiles: Users can read their own profile, admins can read all
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

-- 7. Functions and Triggers for Audit Logging

-- Function to log changes
create or replace function public.log_audit_changes()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_log (user_id, action, resource_type, resource_id, new_values)
    values (
      auth.uid(),
      'create',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW)
    );
    return NEW;
  elsif TG_OP = 'UPDATE' then
    insert into public.audit_log (user_id, action, resource_type, resource_id, old_values, new_values)
    values (
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.audit_log (user_id, action, resource_type, resource_id, old_values)
    values (
      auth.uid(),
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

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

-- 8. Insert default brand settings
insert into public.brand_settings (brand, brand_name, accent_color, email_contact) values
  ('academy', 'Archer Academy', '#4d73ff', 'events@archer.finance'),
  ('invest', 'Archer Invest', '#2d50ef', 'events@archer.finance'),
  ('fund', 'Archer Investment Fund', '#1032cf', 'events@archer.finance')
on conflict (brand) do nothing;

-- 9. Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger handle_brand_settings_updated_at
  before update on public.brand_settings
  for each row execute function public.handle_updated_at();

-- 10. Create indexes for performance
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_brand_access on public.profiles using gin(brand_access);
create index if not exists idx_audit_log_user_id on public.audit_log(user_id);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);
create index if not exists idx_audit_log_resource on public.audit_log(resource_type, resource_id);
