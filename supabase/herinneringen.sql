-- FamilyFlow 1.10: herinneringen op je telefoon.
-- Plak dit in Supabase › SQL Editor › New query en klik op Run. Je kunt het veilig opnieuw draaien.
-- Doe dit pas NADAT de Edge Function "herinneringen" is gedeployd.
--
-- push_subs:   welke telefoons herinneringen willen (één rij per telefoon).
-- push_config: het sleutelpaar voor pushmeldingen. Maakt de functie zelf aan, je hoeft niks in te vullen.
-- Bewust geen policies: alleen de Edge Function (service role) kan erbij.

create table if not exists public.push_subs (
  endpoint   text primary key,
  family_id  uuid not null references public.families (id) on delete cascade,
  member_id  text not null,
  sub        jsonb not null,
  last_sent  timestamptz,
  last_kind  text,
  last_title text,
  last_body  text,
  created_at timestamptz not null default now()
);
create index if not exists push_subs_family on public.push_subs (family_id);
alter table public.push_subs enable row level security;

create table if not exists public.push_config (
  id          int primary key default 1,
  public_key  text not null,
  private_jwk jsonb not null
);
alter table public.push_config enable row level security;

-- Elke 15 minuten: wie is al 2 uur stil?
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('familyflow-herinneringen') where exists (select 1 from cron.job where jobname = 'familyflow-herinneringen');
select cron.schedule(
  'familyflow-herinneringen',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://guzeciiqqbvwlsrcysib.supabase.co/functions/v1/herinneringen',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1emVjaWlxcWJ2d2xzcmN5c2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzg2MTUsImV4cCI6MjEwNzU1NDYxNX0.gF-INQMyrlh8as93pzG0ILs43YAXUSzIUSpRhJC8yz4'
    ),
    body := '{"action":"ronde"}'::jsonb
  );
  $$
);
