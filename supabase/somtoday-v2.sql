-- FamilyFlow 1.12: Somtoday-koppeling die niet meer "verloopt", plus lesrooster.
-- Plak dit in Supabase › SQL Editor › New query en klik op Run. Je kunt het veilig opnieuw draaien.
-- Doe dit NADAT je de nieuwe Edge Function "somtoday" hebt gedeployd.

alter table public.somtoday_links add column if not exists access_token text;
alter table public.somtoday_links add column if not exists access_expires timestamptz;
alter table public.somtoday_links add column if not exists refreshing_until timestamptz;
alter table public.somtoday_links add column if not exists last_refresh timestamptz;

-- Elke 6 uur de koppelingen vernieuwen, zodat ze nooit verlopen door stilstand.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('familyflow-somtoday-onderhoud') where exists (select 1 from cron.job where jobname = 'familyflow-somtoday-onderhoud');
select cron.schedule(
  'familyflow-somtoday-onderhoud',
  '7 */6 * * *',
  $$
  select net.http_post(
    url := 'https://guzeciiqqbvwlsrcysib.supabase.co/functions/v1/somtoday',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1emVjaWlxcWJ2d2xzcmN5c2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzg2MTUsImV4cCI6MjEwNzU1NDYxNX0.gF-INQMyrlh8as93pzG0ILs43YAXUSzIUSpRhJC8yz4'
    ),
    body := '{"action":"onderhoud"}'::jsonb
  );
  $$
);
