-- FamilyFlow 3.6: oefening van vandaag (oefenDag) per kind. Alleen 'create or replace', niks wordt gewist.
-- Kinderen wijzigen alleen hun eigen oefenDag en zien die van broers/zussen niet.

create or replace function public.ff_kind_merge(oud jsonb, nieuw jsonb, me text) returns jsonb
language plpgsql immutable set search_path = public as $$
declare
  uit jsonb := nieuw;
  k text;
  ouder_velden text[] := array['family', 'rewards', 'pros', 'consent', 'proNotes', 'goals', 'allesAan', 'startedAt', 'meetings', 'pet', 'checked', 'badgesStart', 'version', 'klusAfspraken', 'vrijstelling', 'bezwaarAntwoord', 'schermtijd', 'schermAfspraak'];
  -- 3.2: xpLog (waar komen je punten vandaan), agenda (losse afspraken) en inzet: ieder alleen de eigen.
  per_lid text[] := array['checkins', 'history', 'plans', 'coach', 'played', 'werk', 'somtoday', 'vakanties', 'rooster', 'interesses', 'reading', 'actief', 'sleep', 'doelen', 'xpLog', 'agenda', 'inzet', 'oefenDag'];
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
