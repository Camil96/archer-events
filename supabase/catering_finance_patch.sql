/*
  Archer Events - Catering Finance Patch
  Doel:
  - Cateringopties financieel beheerbaar maken (prijs + valuta + leverancier)
  - Eventniveau koppeling voorzien via events.catering
*/

alter table if exists public.catering_options
  add column if not exists price_amount numeric(12, 2),
  add column if not exists price_currency text default 'EUR',
  add column if not exists supplier_name text;

alter table if exists public.events
  add column if not exists catering text;

