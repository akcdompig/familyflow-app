-- FamilyFlow 2.1: beveiliging en privacy in de database.
-- Plak dit in Supabase › SQL Editor › New query en klik op Run. Je kunt het veilig opnieuw draaien.
-- Zet EERST de nieuwe app live (die gebruikt load_family en family_rev), en draai daarna dit script.
--
-- Wat dit doet:
-- 1. Versiegeschiedenis: elke opslag bewaart de vorige stand (laatste 300). Ouders kunnen terugzetten.
-- 2. Rechten: een kind kan geen ouder-dingen wijzigen (rollen, beloningen, school/zorg, bevestigingen,
--    taken van anderen, gegevens van anderen). Dat wordt in de database afgedwongen, niet in de app.
-- 3. Privacy: een kind ziet alleen zijn eigen check-in-onderwerpen, ruzies, rustplan en berichten.
--    Notities van school en zorg ziet een kind niet. Ouders zien alles van de kinderen.
-- 4. Foutmeldingen uit de app worden vastgelegd (zonder persoonsgegevens), zodat problemen opvallen.
-- 5. Gezin verwijderen (AVG): een ouder kan alle gegevens van het gezin wissen.
-- 6. Een geheime sleutel voor de klok-taken (herinneringen en Somtoday-onderhoud).

-- ---------- Hulpfuncties ----------
create or replace function public.my_member() returns text
language sql stable security definer set search_path = public as $$
  select member_id from public.family_members where user_id = auth.uid()
$$;

/** Map per gezinslid: een kind mag alleen zijn eigen sleutel wijzigen. */
create or replace function public.ff_eigen(oud jsonb, nieuw jsonb, me text) returns jsonb
language sql immutable as $$
  select (coalesce(oud, '{}'::jsonb) - me)
    || case when nieuw ? me then jsonb_build_object(me, nieuw -> me) else '{}'::jsonb end
$$;

/** Punten: eigen punten van het kind (hooguit 300 erbij per keer opslaan), bij anderen nooit omlaag. */
create or replace function public.ff_punten(oud jsonb, nieuw jsonb, me text) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_object_agg(k, case
      when k = me then to_jsonb(least(coalesce((nieuw ->> k)::numeric, (oud ->> k)::numeric, 0), coalesce((oud ->> k)::numeric, 0) + 300))
      else to_jsonb(greatest(coalesce((oud ->> k)::numeric, 0), coalesce((nieuw ->> k)::numeric, 0)))
    end), '{}'::jsonb)
  from (select jsonb_object_keys(coalesce(oud, '{}')) k union select jsonb_object_keys(coalesce(nieuw, '{}'))) ks
$$;

/** Per dag per lid (dag-logboek): alleen de eigen regels. */
create or replace function public.ff_per_dag(oud jsonb, nieuw jsonb, me text) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_object_agg(d, public.ff_eigen(oud -> d, coalesce(nieuw -> d, '{}'::jsonb), me)), '{}'::jsonb)
  from (select jsonb_object_keys(coalesce(oud, '{}')) d union select jsonb_object_keys(coalesce(nieuw, '{}'))) ds
$$;

/** Afgevinkt per dag: taak → wie. Alleen eigen vinkjes toevoegen of weghalen. */
create or replace function public.ff_done(oud jsonb, nieuw jsonb, me text) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_object_agg(d, v), '{}'::jsonb) from (
    select d, coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(coalesce(oud -> d, '{}')) e where e.value #>> '{}' <> me), '{}'::jsonb)
           || coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(coalesce(nieuw -> d, '{}')) e where e.value #>> '{}' = me), '{}'::jsonb) as v
    from (select jsonb_object_keys(coalesce(oud, '{}')) d union select jsonb_object_keys(coalesce(nieuw, '{}'))) ds
  ) x
$$;

/** Lijst: van anderen de oude versie, van mij de nieuwe. `veld` wijst naar wie het hoort. */
create or replace function public.ff_lijst(oud jsonb, nieuw jsonb, me text, veld text) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(x order by ord), '[]'::jsonb) from (
    select o as x, ord from jsonb_array_elements(coalesce(oud, '[]')) with ordinality t(o, ord) where coalesce(o ->> veld, '') <> me
    union all
    select n as x, 100000 + ord from jsonb_array_elements(coalesce(nieuw, '[]')) with ordinality t(n, ord) where n ->> veld = me
  ) y
$$;

/** Ruzies: alleen die waar ik bij betrokken ben mag ik wijzigen of aanmaken. */
create or replace function public.ff_conflicten(oud jsonb, nieuw jsonb, me text) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(x order by x ->> 'at'), '[]'::jsonb) from (
    select o as x from jsonb_array_elements(coalesce(oud, '[]')) o where o ->> 'from' <> me and o ->> 'with' <> me
    union all
    select n from jsonb_array_elements(coalesce(nieuw, '[]')) n where n ->> 'from' = me or n ->> 'with' = me
  ) y
$$;

/** Taken: een kind mag alleen zijn eigen taken (bv. leerblokjes uit Somtoday of de leerplanner) wijzigen. */
create or replace function public.ff_taken(oud jsonb, nieuw jsonb, me text) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select o as x from jsonb_array_elements(coalesce(oud, '[]')) o where o ->> 'assignee' <> me
    union all
    select n from jsonb_array_elements(coalesce(nieuw, '[]')) n where n ->> 'assignee' = me
  ) y
$$;

/** Berichten: alleen "gelezen" van berichten aan mij of het gezin. */
create or replace function public.ff_berichten(oud jsonb, nieuw jsonb, me text) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(case when o ->> 'to' in (me, 'gezin') and n is not null then o || jsonb_build_object('read', n -> 'read') else o end order by ord), '[]'::jsonb)
  from jsonb_array_elements(coalesce(oud, '[]')) with ordinality t(o, ord)
  left join lateral (select n from jsonb_array_elements(coalesce(nieuw, '[]')) n where n ->> 'id' = o ->> 'id' limit 1) m on true
$$;

/** Achievements: niks weghalen; "gezien" en nieuwe erbij mag. */
create or replace function public.ff_badges(oud jsonb, nieuw jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(x), '[]'::jsonb) from (
    select coalesce((select n from jsonb_array_elements(coalesce(nieuw, '[]')) n where n ->> 'id' = o ->> 'id' limit 1), o) as x
      from jsonb_array_elements(coalesce(oud, '[]')) o
    union all
    select n from jsonb_array_elements(coalesce(nieuw, '[]')) n
      where not exists (select 1 from jsonb_array_elements(coalesce(oud, '[]')) o where o ->> 'id' = n ->> 'id')
  ) y
$$;

/** Punten van anderen: nooit omlaag, en hooguit `max` erbij per keer (samen iets gedaan = een paar punten voor de ander). */
create or replace function public.ff_punten_max(oud jsonb, nieuw jsonb, me text, max_ander numeric) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(jsonb_object_agg(k, case
      when k = me then to_jsonb(least(coalesce((nieuw ->> k)::numeric, (oud ->> k)::numeric, 0), coalesce((oud ->> k)::numeric, 0) + 300))
      else to_jsonb(least(greatest(coalesce((oud ->> k)::numeric, 0), coalesce((nieuw ->> k)::numeric, 0)), coalesce((oud ->> k)::numeric, 0) + max_ander))
    end), '{}'::jsonb)
  from (select jsonb_object_keys(coalesce(oud, '{}')) k union select jsonb_object_keys(coalesce(nieuw, '{}'))) ks
$$;

/** Samen beslist: alleen nieuwe besluiten waar ik zelf bij was erbij, oude blijven staan. Hooguit de laatste 100. */
create or replace function public.ff_uitdagingen(oud jsonb, nieuw jsonb, me text) returns jsonb
language sql immutable set search_path = public as $$
  with alles as (
    select o as x, ord from jsonb_array_elements(coalesce(oud, '[]')) with ordinality t(o, ord)
    union all
    select n, 100000 + ord from jsonb_array_elements(coalesce(nieuw, '[]')) with ordinality t(n, ord)
      where n -> 'spelers' ? me and not exists (select 1 from jsonb_array_elements(coalesce(oud, '[]')) o where o ->> 'id' = n ->> 'id')
  ), genummerd as (select x, ord, row_number() over (order by ord desc) r from alles)
  select coalesce(jsonb_agg(x order by ord), '[]'::jsonb) from genummerd where r <= 100
$$;

/**
  Klus wisselen (ruil) of samen doen (samenDoen): een kind mag dat alleen als er een besluit is waar het zelf bij was,
  voor die klus, met precies die uitkomst. Zo kan een kind niet stiekem een klus bij een ander neerleggen.
*/
create or replace function public.ff_ruil(oud jsonb, nieuw jsonb, me text, besluiten jsonb, veld text) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(oud, '{}'::jsonb) || coalesce((
    select jsonb_object_agg(d, coalesce(oud -> d, '{}'::jsonb) || coalesce((
      select jsonb_object_agg(kv.key, kv.value) from jsonb_each(nieuw -> d) kv
      where (oud -> d -> kv.key) is distinct from kv.value
        and exists (select 1 from jsonb_array_elements(coalesce(besluiten, '[]')) u
                    where u ->> 'klus' = kv.key and u -> 'spelers' ? me and u ->> veld = kv.value #>> '{}')
    ), '{}'::jsonb))
    from jsonb_object_keys(coalesce(nieuw, '{}')) d where jsonb_typeof(nieuw -> d) = 'object'
  ), '{}'::jsonb)
$$;

/** Samen-momenten: wat ik plande of waar ik bij ben mag ik wijzigen; de rest blijft zoals het was. */
create or replace function public.ff_samen(oud jsonb, nieuw jsonb, me text) returns jsonb
language sql immutable set search_path = public as $$
  select coalesce(jsonb_agg(x order by x ->> 'at'), '[]'::jsonb) from (
    select o as x from jsonb_array_elements(coalesce(oud, '[]')) o where not (o -> 'wie' ? me) and o ->> 'door' is distinct from me
    union all
    select n from jsonb_array_elements(coalesce(nieuw, '[]')) n where n -> 'wie' ? me or n ->> 'door' = me
  ) y
$$;

/** Wat een kind opslaat, samengevoegd met de bestaande stand volgens de rechten van een kind. */
create or replace function public.ff_kind_merge(oud jsonb, nieuw jsonb, me text) returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  uit jsonb := nieuw;
  k text;
  ouder_velden text[] := array['family', 'rewards', 'pros', 'consent', 'proNotes', 'goals', 'allesAan', 'startedAt', 'meetings', 'pet', 'checked', 'badgesStart', 'version', 'klusAfspraken', 'vrijstelling', 'bezwaarAntwoord', 'schermtijd', 'schermAfspraak', 'taakStatus', 'weekAfspraak', 'weekAfsluiting', 'gedrag', 'gedragAfspraak'];
  -- 3.2: xpLog (waar komen je punten vandaan), agenda (losse afspraken) en inzet: ieder alleen de eigen.
  per_lid text[] := array['checkins', 'history', 'plans', 'coach', 'played', 'werk', 'somtoday', 'vakanties', 'rooster', 'interesses', 'reading', 'actief', 'sleep', 'doelen', 'xpLog', 'agenda', 'inzet', 'oefenDag', 'oefentoetsen'];
begin
  -- Ouder-instellingen: altijd de bestaande waarde.
  foreach k in array ouder_velden loop
    uit := case when oud ? k then jsonb_set(uit, array[k], oud -> k) else uit - k end;
  end loop;
  -- Gezinsleden: rollen, e-mail, bedtijd en wie er in het gezin zit blijven zoals ze waren. Eigen avatar en naam mag.
  uit := jsonb_set(uit, '{members}', (
    select coalesce(jsonb_agg(case when o ->> 'id' = me and n is not null
             then o || jsonb_strip_nulls(jsonb_build_object('avatar', n -> 'avatar', 'name', n -> 'name', 'joined', n -> 'joined'))
             else o end order by ord), '[]'::jsonb)
    from jsonb_array_elements(oud -> 'members') with ordinality t(o, ord)
    left join lateral (select n from jsonb_array_elements(coalesce(nieuw -> 'members', '[]')) n where n ->> 'id' = o ->> 'id' limit 1) m on true));
  -- Per gezinslid: alleen de eigen gegevens.
  foreach k in array per_lid loop
    uit := jsonb_set(uit, array[k], public.ff_eigen(oud -> k, nieuw -> k, me));
  end loop;
  uit := jsonb_set(uit, '{xp}', public.ff_punten_max(oud -> 'xp', nieuw -> 'xp', me, 30));
  uit := jsonb_set(uit, '{claim}', public.ff_punten_max(oud -> 'claim', nieuw -> 'claim', me, 0));
  -- Nooit meer geclaimd dan verdiend.
  if (uit -> 'claim') ? me then
    uit := jsonb_set(uit, array['claim', me], to_jsonb(least((uit #>> array['claim', me])::numeric, coalesce((uit #>> array['xp', me])::numeric, 0))));
  end if;
  uit := jsonb_set(uit, '{dag}', public.ff_per_dag(oud -> 'dag', nieuw -> 'dag', me));
  uit := jsonb_set(uit, '{done}', public.ff_done(oud -> 'done', nieuw -> 'done', me));
  uit := jsonb_set(uit, '{tasks}', public.ff_taken(oud -> 'tasks', nieuw -> 'tasks', me));
  uit := jsonb_set(uit, '{conflicts}', public.ff_conflicten(oud -> 'conflicts', nieuw -> 'conflicts', me));
  uit := jsonb_set(uit, '{coachLog}', public.ff_lijst(oud -> 'coachLog', nieuw -> 'coachLog', me, 'by'));
  uit := jsonb_set(uit, '{calm}', public.ff_lijst(oud -> 'calm', nieuw -> 'calm', me, 'member'));
  uit := jsonb_set(uit, '{quests}', public.ff_lijst(oud -> 'quests', nieuw -> 'quests', me, 'member'));
  uit := jsonb_set(uit, '{feedback}', public.ff_lijst(oud -> 'feedback', nieuw -> 'feedback', me, 'by'));
  uit := jsonb_set(uit, '{messages}', public.ff_berichten(oud -> 'messages', nieuw -> 'messages', me));
  uit := jsonb_set(uit, '{badges}', public.ff_badges(oud -> 'badges', nieuw -> 'badges'));
  -- Samenwerken: vragen aan ouders (eigen), samen-momenten, samen beslissen en wat daaruit volgt.
  uit := jsonb_set(uit, '{bezwaren}', public.ff_lijst(oud -> 'bezwaren', nieuw -> 'bezwaren', me, 'door'));
  uit := jsonb_set(uit, '{samen}', public.ff_samen(oud -> 'samen', nieuw -> 'samen', me));
  uit := jsonb_set(uit, '{uitdagingen}', public.ff_uitdagingen(oud -> 'uitdagingen', nieuw -> 'uitdagingen', me));
  uit := jsonb_set(uit, '{ruil}', public.ff_ruil(oud -> 'ruil', nieuw -> 'ruil', me, uit -> 'uitdagingen', 'verliezer'));
  uit := jsonb_set(uit, '{samenDoen}', public.ff_ruil(oud -> 'samenDoen', nieuw -> 'samenDoen', me, uit -> 'uitdagingen', 'partner'));
  return uit;
end $$;

/** Wat een kind te zien krijgt: zijn eigen gevoelige gegevens, van anderen alleen wat nodig is voor de huiskamer. */
create or replace function public.ff_voor_kind(st jsonb, me text) returns jsonb
language sql immutable as $$
  select st
    || jsonb_build_object(
      'members', (select coalesce(jsonb_agg(m - 'email'), '[]'::jsonb) from jsonb_array_elements(coalesce(st -> 'members', '[]')) m),
      'checkins', (select coalesce(jsonb_object_agg(e.key, case when e.key = me or jsonb_typeof(e.value) <> 'object' then e.value
                     else jsonb_build_object('mood', e.value -> 'mood', 'rest', e.value -> 'rest', 'at', e.value -> 'at', 'topics', '[]'::jsonb, 'wantsTalk', false) end), '{}'::jsonb)
                   from jsonb_each(coalesce(st -> 'checkins', '{}')) e),
      'history', public.ff_eigen('{}', coalesce(st -> 'history', '{}'), me),
      'plans', public.ff_eigen('{}', coalesce(st -> 'plans', '{}'), me),
      'conflicts', (select coalesce(jsonb_agg(c), '[]'::jsonb) from jsonb_array_elements(coalesce(st -> 'conflicts', '[]')) c where c ->> 'from' = me or c ->> 'with' = me),
      'coachLog', (select coalesce(jsonb_agg(c), '[]'::jsonb) from jsonb_array_elements(coalesce(st -> 'coachLog', '[]')) c where c ->> 'by' = me),
      'calm', (select coalesce(jsonb_agg(c), '[]'::jsonb) from jsonb_array_elements(coalesce(st -> 'calm', '[]')) c where c ->> 'member' = me),
      'feedback', (select coalesce(jsonb_agg(c), '[]'::jsonb) from jsonb_array_elements(coalesce(st -> 'feedback', '[]')) c where c ->> 'by' = me),
      'messages', (select coalesce(jsonb_agg(c), '[]'::jsonb) from jsonb_array_elements(coalesce(st -> 'messages', '[]')) c where c ->> 'to' in (me, 'gezin')),
      'bezwaren', (select coalesce(jsonb_agg(c), '[]'::jsonb) from jsonb_array_elements(coalesce(st -> 'bezwaren', '[]')) c where c ->> 'door' = me),
      'bezwaarAntwoord', (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(coalesce(st -> 'bezwaarAntwoord', '{}')) e
                          where exists (select 1 from jsonb_array_elements(coalesce(st -> 'bezwaren', '[]')) c where c ->> 'id' = e.key and c ->> 'door' = me)),
      'doelen', public.ff_eigen('{}', coalesce(st -> 'doelen', '{}'), me),
      'xpLog', public.ff_eigen('{}', coalesce(st -> 'xpLog', '{}'), me),
      'inzet', public.ff_eigen('{}', coalesce(st -> 'inzet', '{}'), me),
      'oefenDag', public.ff_eigen('{}', coalesce(st -> 'oefenDag', '{}'), me),
      'oefentoetsen', public.ff_eigen('{}', coalesce(st -> 'oefentoetsen', '{}'), me),
      'taakStatus', public.ff_eigen('{}', coalesce(st -> 'taakStatus', '{}'), me),
      'weekAfspraak', public.ff_eigen('{}', coalesce(st -> 'weekAfspraak', '{}'), me),
      'weekAfsluiting', public.ff_eigen('{}', coalesce(st -> 'weekAfsluiting', '{}'), me),
      -- 3.14 Turven en sterren: een kind ziet alleen de eigen (en kan ze niet zelf wijzigen: ouder_velden).
      'gedrag', public.ff_eigen('{}', coalesce(st -> 'gedrag', '{}'), me),
      'gedragAfspraak', public.ff_eigen('{}', coalesce(st -> 'gedragAfspraak', '{}'), me),
      -- Afspraken: je eigen helemaal, die van ouders zonder notitie, die van broers en zussen niet.
      'agenda', (select coalesce(jsonb_object_agg(e.key, case when e.key = me then e.value
                   else (select coalesce(jsonb_agg(a - 'notitie'), '[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) a) end), '{}'::jsonb)
                 from jsonb_each(coalesce(st -> 'agenda', '{}')) e
                 where e.key = me or exists (select 1 from jsonb_array_elements(coalesce(st -> 'members', '[]')) m where m ->> 'id' = e.key and m ->> 'role' = 'ouder')),
      'schermtijd', public.ff_eigen('{}', coalesce(st -> 'schermtijd', '{}'), me),
      'schermAfspraak', public.ff_eigen('{}', coalesce(st -> 'schermAfspraak', '{}'), me),
      'proNotes', '{"school": "", "zorg": ""}'::jsonb
    )
$$;

-- ---------- 1. Versiegeschiedenis ----------
create table if not exists public.families_history (
  id bigserial primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  rev integer not null,
  state jsonb not null,
  saved_by uuid,
  saved_at timestamptz not null default now()
);
create index if not exists families_history_family on public.families_history (family_id, id desc);
alter table public.families_history enable row level security;

create or replace function public.ff_bewaar_vorige() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.state is distinct from new.state then
    insert into families_history (family_id, rev, state, saved_by) values (old.id, old.rev, old.state, auth.uid());
    delete from families_history where family_id = old.id and id < (
      select min(id) from (select id from families_history where family_id = old.id order by id desc limit 300) laatste);
  end if;
  return new;
end $$;
drop trigger if exists ff_bewaar_vorige on public.families;
create trigger ff_bewaar_vorige before update on public.families for each row execute function public.ff_bewaar_vorige();

/** Ouders: de laatste versies (voor "terugzetten"). */
create or replace function public.family_history() returns table (id bigint, rev integer, saved_at timestamptz, saved_by_member text)
language sql stable security definer set search_path = public as $$
  select h.id, h.rev, h.saved_at, fm.member_id
  from families_history h left join family_members fm on fm.user_id = h.saved_by
  where h.family_id = public.my_family() and public.i_am_parent()
  order by h.id desc limit 50
$$;

/** Ouders: een eerdere versie terugzetten. De huidige wordt daarbij zelf ook bewaard. */
create or replace function public.restore_family(p_id bigint) returns integer
language plpgsql security definer set search_path = public as $$
declare fid uuid := public.my_family(); st jsonb; n integer;
begin
  if fid is null or not public.i_am_parent() then raise exception 'Alleen ouders kunnen een versie terugzetten'; end if;
  select state into st from families_history where id = p_id and family_id = fid;
  if st is null then raise exception 'Die versie bestaat niet (meer)'; end if;
  update families set state = st, rev = rev + 1, updated_at = now() where id = fid returning rev into n;
  return n;
end $$;

-- ---------- 2 en 3. Opslaan en laden met rechten per rol ----------
create or replace function public.save_family(p_state jsonb, p_rev integer) returns integer
language plpgsql security definer set search_path = public as $$
declare fid uuid := public.my_family(); n integer; oud jsonb; nieuw jsonb := p_state;
begin
  if fid is null then raise exception 'Geen gezin'; end if;
  if jsonb_typeof(p_state) <> 'object' or jsonb_typeof(p_state -> 'members') <> 'array' then raise exception 'Ongeldige gezinsstand'; end if;
  if not public.i_am_parent() then
    select state into oud from families where id = fid;
    nieuw := public.ff_kind_merge(oud, p_state, public.my_member());
  end if;
  update families set state = nieuw, rev = rev + 1, updated_at = now()
    where id = fid and rev = p_rev returning rev into n;
  return coalesce(n, -1);
end $$;

/** Gezinsstand laden. Kinderen krijgen een versie zonder de privé-gegevens van anderen. */
create or replace function public.load_family() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('state', case when public.i_am_parent() then f.state else public.ff_voor_kind(f.state, public.my_member()) end, 'rev', f.rev)
  from families f where f.id = public.my_family()
$$;

create or replace function public.family_rev() returns integer
language sql stable security definer set search_path = public as $$
  select rev from families where id = public.my_family()
$$;

-- Kinderen lezen de tabel niet meer rechtstreeks (dan zouden ze alles zien), alleen via load_family.
drop policy if exists "eigen gezin lezen" on public.families;
create policy "eigen gezin lezen" on public.families for select using (id = public.my_family() and public.i_am_parent());
-- Wijzigen gaat alleen via save_family (met de regels hierboven).
drop policy if exists "eigen gezin wijzigen" on public.families;

grant execute on function public.load_family() to authenticated;
grant execute on function public.family_rev() to authenticated;
grant execute on function public.family_history() to authenticated;
grant execute on function public.restore_family(bigint) to authenticated;

-- ---------- Uitnodigingscodes: sterker en niet te raden ----------
alter table public.invites add column if not exists used_by uuid;
create table if not exists public.join_pogingen (user_id uuid not null, at timestamptz not null default now(), gelukt boolean not null);
create index if not exists join_pogingen_user on public.join_pogingen (user_id, at desc);
alter table public.join_pogingen enable row level security;

/** Code van 8 tekens uit een cryptografisch sterke bron (32 tekens, zonder 0/O/1/I). */
create or replace function public.ff_code() returns text
language plpgsql volatile as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex'); c text := ''; i int;
begin
  for i in 0..7 loop c := c || substr(alphabet, 1 + (get_byte(b, i) % 32), 1); end loop;
  return c;
end $$;

create or replace function public.make_invite(p_member_id text) returns text
language plpgsql security definer set search_path = public as $$
declare fid uuid := public.my_family(); c text;
begin
  if fid is null or not public.i_am_parent() then raise exception 'Alleen ouders kunnen uitnodigen'; end if;
  delete from invites where family_id = fid and member_id = p_member_id;
  loop
    c := public.ff_code();
    exit when not exists (select 1 from invites where code = c);
  end loop;
  insert into invites (code, family_id, member_id) values (c, fid, p_member_id);
  return c;
end $$;

/**
  Meedoen met een code. Geeft {family_id, member_id} terug, of {fout} als het niet lukt.
  (Een fout als resultaat in plaats van een exception, zodat de mislukte poging bewaard blijft.)
  Hooguit 10 mislukte pogingen per uur. Een gebruikte code werkt daarna alleen nog 10 minuten voor dezelfde telefoon.
*/
create or replace function public.join_family(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype; r text;
begin
  if auth.uid() is null then return json_build_object('fout', 'Niet ingelogd'); end if;
  if (select count(*) from join_pogingen where user_id = auth.uid() and not gelukt and at > now() - interval '1 hour') >= 10 then
    return json_build_object('fout', 'Te vaak een verkeerde code. Probeer het over een uur opnieuw');
  end if;
  select * into inv from invites where code = upper(trim(p_code));
  if not found or (inv.used_at is not null and (inv.used_by is distinct from auth.uid() or inv.used_at < now() - interval '10 minutes')) then
    insert into join_pogingen (user_id, gelukt) values (auth.uid(), false);
    return json_build_object('fout', case when found then 'Deze code is al gebruikt. Vraag een nieuwe aan je ouder' else 'Deze code klopt niet' end);
  end if;
  select coalesce(m->>'role', 'kind') into r
    from families f, jsonb_array_elements(f.state->'members') m
    where f.id = inv.family_id and m->>'id' = inv.member_id;
  delete from family_members where family_id = inv.family_id and member_id = inv.member_id;
  delete from family_members where user_id = auth.uid();
  insert into family_members (user_id, family_id, member_id, role) values (auth.uid(), inv.family_id, inv.member_id, coalesce(r, 'kind'));
  update invites set used_at = coalesce(used_at, now()), used_by = auth.uid() where code = inv.code;
  insert into join_pogingen (user_id, gelukt) values (auth.uid(), true);
  delete from join_pogingen where at < now() - interval '1 day';
  return json_build_object('family_id', inv.family_id, 'member_id', inv.member_id);
end $$;

-- ---------- 4. Foutmeldingen uit de app ----------
create table if not exists public.client_errors (
  id bigserial primary key,
  family_id uuid,
  member_id text,
  at timestamptz not null default now(),
  version text,
  message text,
  stack text,
  url text
);
alter table public.client_errors enable row level security;

create or replace function public.log_error(p_message text, p_stack text, p_version text, p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  -- Hooguit 50 per gezinslid per dag, zodat een foutlus niks overspoelt.
  if (select count(*) from client_errors where member_id = public.my_member() and family_id = public.my_family() and at > now() - interval '1 day') >= 50 then return; end if;
  insert into client_errors (family_id, member_id, version, message, stack, url)
    values (public.my_family(), public.my_member(), left(p_version, 20), left(p_message, 500), left(p_stack, 2000), left(p_url, 200));
  delete from client_errors where at < now() - interval '30 days';
end $$;
grant execute on function public.log_error(text, text, text, text) to authenticated;

-- ---------- 5. Gezin verwijderen (AVG) ----------
create or replace function public.delete_family() returns void
language plpgsql security definer set search_path = public as $$
declare fid uuid := public.my_family();
begin
  if fid is null or not public.i_am_parent() then raise exception 'Alleen een ouder kan het gezin verwijderen'; end if;
  delete from families where id = fid; -- leden, uitnodigingen, geschiedenis, Somtoday en meldingen gaan mee (cascade)
  delete from client_errors where family_id = fid;
end $$;
grant execute on function public.delete_family() to authenticated;

-- ---------- 6. Geheime sleutel voor de klok-taken ----------
create table if not exists public.app_secrets (name text primary key, value text not null);
alter table public.app_secrets enable row level security;
insert into public.app_secrets (name, value) values ('cron', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')) on conflict (name) do nothing;

-- Klok-taken opnieuw instellen met de geheime sleutel (alleen als pg_cron en pg_net aan staan).
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') and exists (select 1 from pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobname) from cron.job where jobname in ('familyflow-herinneringen', 'familyflow-somtoday-onderhoud');
    perform cron.schedule('familyflow-herinneringen', '*/15 * * * *', $job$
      select net.http_post(
        url := 'https://guzeciiqqbvwlsrcysib.supabase.co/functions/v1/herinneringen',
        headers := jsonb_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1emVjaWlxcWJ2d2xzcmN5c2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzg2MTUsImV4cCI6MjEwNzU1NDYxNX0.gF-INQMyrlh8as93pzG0ILs43YAXUSzIUSpRhJC8yz4',
          'x-cron-secret', (select value from public.app_secrets where name = 'cron')),
        body := '{"action":"ronde"}'::jsonb);
    $job$);
    perform cron.schedule('familyflow-somtoday-onderhoud', '7 */6 * * *', $job$
      select net.http_post(
        url := 'https://guzeciiqqbvwlsrcysib.supabase.co/functions/v1/somtoday',
        headers := jsonb_build_object('Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1emVjaWlxcWJ2d2xzcmN5c2liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Nzg2MTUsImV4cCI6MjEwNzU1NDYxNX0.gF-INQMyrlh8as93pzG0ILs43YAXUSzIUSpRhJC8yz4',
          'x-cron-secret', (select value from public.app_secrets where name = 'cron')),
        body := '{"action":"onderhoud"}'::jsonb);
    $job$);
  end if;
end
$cron$;

-- ---------- 7. Aanscherpen (Supabase-adviseur) ----------
-- Zonder login mag niemand de gezinsfuncties aanroepen.
revoke execute on function public.create_family(jsonb, text), public.delete_family(), public.family_history(), public.family_rev(),
  public.i_am_parent(), public.join_family(text), public.load_family(), public.log_error(text, text, text, text), public.make_invite(text),
  public.my_family(), public.my_member(), public.restore_family(bigint), public.save_family(jsonb, integer), public.whoami() from public, anon;
grant execute on function public.create_family(jsonb, text), public.delete_family(), public.family_history(), public.family_rev(),
  public.i_am_parent(), public.join_family(text), public.load_family(), public.log_error(text, text, text, text), public.make_invite(text),
  public.my_family(), public.my_member(), public.restore_family(bigint), public.save_family(jsonb, integer), public.whoami() to authenticated;
revoke execute on function public.ff_bewaar_vorige() from public, anon, authenticated;
do $sp$
declare f text;
begin
  foreach f in array array['ff_eigen(jsonb,jsonb,text)', 'ff_punten(jsonb,jsonb,text)', 'ff_per_dag(jsonb,jsonb,text)', 'ff_done(jsonb,jsonb,text)',
    'ff_lijst(jsonb,jsonb,text,text)', 'ff_conflicten(jsonb,jsonb,text)', 'ff_taken(jsonb,jsonb,text)', 'ff_berichten(jsonb,jsonb,text)',
    'ff_badges(jsonb,jsonb)', 'ff_kind_merge(jsonb,jsonb,text)', 'ff_voor_kind(jsonb,text)', 'ff_code()'] loop
    execute format('alter function public.%s set search_path = public', f);
  end loop;
end
$sp$;
