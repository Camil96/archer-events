-- ARCHER EVENTS - QUICK FIX 2026-02-20
-- VOER DIT UIT IN DE SUPABASE SQL EDITOR

-- 1. Kolommen toevoegen aan Public.Events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_date date;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS expected_attendance int DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS catering text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS budget numeric(12, 2);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS notes_internal text;

-- 2. Kolommen toevoegen aan Public.Event_Participants
ALTER TABLE public.event_participants ADD COLUMN IF NOT EXISTS phone text;

-- 3. App Settings Tabel aanmaken (indien niet aanwezig)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand text NOT NULL,
  key text NOT NULL,
  value text,
  UNIQUE(brand, key)
);

-- 4. Rechten (RLS) herstellen
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.events;
CREATE POLICY "Enable all access for all users" ON public.events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.event_participants;
CREATE POLICY "Enable all access for all users" ON public.event_participants FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.tasks;
CREATE POLICY "Enable all access for all users" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.app_settings;
CREATE POLICY "Enable all access for all users" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);
