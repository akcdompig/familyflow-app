-- FamilyFlow 1.3: Somtoday-koppeling.
-- Plak dit in Supabase › SQL Editor › New query en klik op Run. Je kunt het veilig opnieuw draaien.
--
-- Per kind één rij met het Somtoday-token. Alleen de Edge Function "somtoday" kan hierbij
-- (met de service role). De app zelf ziet de tokens nooit.

create table if not exists public.somtoday_links (
  family_id     uuid not null references public.families (id) on delete cascade,
  member_id     text not null,
  tenant_uuid   text not null,
  school        text,
  client_id     text not null default 'somtoday-leerling-native',
  refresh_token text,
  api_url       text not null default 'https://api.somtoday.nl',
  pending_verifier text,   -- tijdelijk, tijdens koppelen via link
  last_sync     timestamptz,
  last_error    text,
  created_at    timestamptz not null default now(),
  primary key (family_id, member_id)
);

alter table public.somtoday_links enable row level security;
-- Bewust geen policies: niemand behalve de Edge Function kan deze tabel lezen of schrijven.
