-- Tests voor supabase/beveiliging.sql. Draait in een lege Postgres na supabase-nep.sql, schema.sql en beveiliging.sql.
-- Elke test gooit een fout als hij faalt. psql stopt dan (ON_ERROR_STOP).
\set QUIET on
create or replace function pg_temp.als(uid text) returns void language sql as $$ select set_config('test.uid', uid, false); select set_config('role', 'authenticated', false); $$;
create or replace function pg_temp.eis(ok boolean, wat text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FOUT: %', wat; end if; raise notice 'ok  %', wat; end $$;

-- Gezin: papa (ouder), kian (kind), khloe (kind).
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'papa@x.nl'), ('00000000-0000-0000-0000-00000000000b', null), ('00000000-0000-0000-0000-00000000000c', null);
select pg_temp.als('00000000-0000-0000-0000-00000000000a');
select public.create_family($${
  "version": 3, "family": "Fam", "me": "p1",
  "members": [{"id":"p1","name":"Papa","role":"ouder","email":"papa@x.nl"},{"id":"k1","name":"Kian","role":"kind","bedtime":"21:30"},{"id":"k2","name":"Khloe","role":"tiener"}],
  "xp": {"k1": 10, "k2": 20}, "claim": {"k1": 10, "k2": 20},
  "rewards": [{"level": 2, "title": "Toetje"}],
  "proNotes": {"school": "Kian heeft moeite met plannen", "zorg": ""},
  "checkins": {"k2": {"mood": 2, "rest": false, "topics": ["Thuis"], "wantsTalk": true, "at": "2026-10-15T08:00:00Z"}},
  "history": {"k2": [{"mood": 2, "rest": false, "at": "x"}]},
  "conflicts": [{"id":"c1","from":"k2","with":"p1","topic":"Gamen","sides":{"k2":{"story":"geheim"}},"status":"wacht","at":"1"}],
  "messages": [{"id":"m1","from":"zorg","to":"ouders","text":"Vertrouwelijk","read":false,"at":"1"},{"id":"m2","from":"school","to":"k1","text":"Toets","read":false,"at":"1"}],
  "tasks": [{"id":"t1","title":"Stofzuigen","assignee":"k2","xp":10},{"id":"t2","title":"Huiswerk","assignee":"k1","xp":15}],
  "done": {"2026-10-15": {"t1": "k2"}},
  "checked": {},
  "dag": {"2026-10-15": {"k2": {"routine": ["douchen"], "water": 3, "fruit": 1}}},
  "plans": {"k2": {"signals": ["hart"]}}
}$$::jsonb, 'p1');
select public.make_invite('k1') as kian_code \gset
select public.make_invite('k2') as khloe_code \gset
select pg_temp.eis(length(:'kian_code') = 8, 'uitnodigingscode heeft 8 tekens');
select pg_temp.als('00000000-0000-0000-0000-00000000000b'); select public.join_family(:'kian_code');
select pg_temp.als('00000000-0000-0000-0000-00000000000c'); select public.join_family(:'khloe_code');

-- ===== Privacy: wat ziet Kian? =====
select pg_temp.als('00000000-0000-0000-0000-00000000000b');
select (public.load_family() ->> 'state')::jsonb as kian \gset
select pg_temp.eis((:'kian'::jsonb #>> '{proNotes,school}') = '', 'kind ziet geen notities van school of zorg');
select pg_temp.eis(jsonb_array_length(:'kian'::jsonb -> 'messages') = 1 and (:'kian'::jsonb #>> '{messages,0,id}') = 'm2', 'kind ziet alleen berichten aan zichzelf of het gezin');
select pg_temp.eis((:'kian'::jsonb #> '{checkins,k2,topics}') = '[]'::jsonb and (:'kian'::jsonb #>> '{checkins,k2,wantsTalk}') = 'false', 'kind ziet niet waar zus over wil praten');
select pg_temp.eis((:'kian'::jsonb #>> '{checkins,k2,mood}') = '2', 'kind ziet wel het gezichtje van zus (huiskamer)');
select pg_temp.eis(jsonb_array_length(:'kian'::jsonb -> 'conflicts') = 0, 'kind ziet geen ruzies van anderen');
select pg_temp.eis(not (:'kian'::jsonb -> 'history') ? 'k2' and not (:'kian'::jsonb -> 'plans') ? 'k2', 'kind ziet geschiedenis en rustplan van zus niet');
select pg_temp.eis(not (:'kian'::jsonb #> '{members,0}') ? 'email', 'kind ziet geen e-mailadressen');
select pg_temp.eis((select count(*) from public.families) = 0, 'kind kan de tabel niet rechtstreeks lezen');

-- ===== Rechten: Kian probeert van alles =====
select (public.load_family() ->> 'rev')::int as rev \gset
select public.save_family(
  jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(:'kian'::jsonb,
    '{members,1,role}', '"ouder"'),            -- zichzelf ouder maken
    '{members,1,bedtime}', '"23:59"'),         -- bedtijd verzetten
    '{members,1,avatar}', '{"skin":"s3"}'),    -- eigen avatar: mag
    '{rewards}', '[]'),                        -- beloningen wissen
    '{xp,k1}', '9999'),                        -- eigen punten: kan (spelregels zitten in de app)
    '{xp,k2}', '0'),                           -- punten van zus wissen
    '{checked}', '{"2026-10-15":{"t2":"p1"}}'),-- zelf "bevestigd door ouder" zetten
    '{tasks}', '[{"id":"t2","title":"Huiswerk","assignee":"k1","xp":15},{"id":"t9","title":"Leren","assignee":"k1","xp":5}]'), -- taak zus weg, eigen blokje erbij
    '{done}', '{"2026-10-15":{"t2":"k1"}}'),   -- eigen vinkje erbij, vinkje van zus weg
  :rev) as nieuw_rev \gset
select pg_temp.eis(:nieuw_rev > :rev, 'opslaan door een kind lukt');
select pg_temp.als('00000000-0000-0000-0000-00000000000a');
select state as st from public.families \gset
select pg_temp.eis((:'st'::jsonb #>> '{members,1,role}') = 'kind', 'kind kan zichzelf geen ouder maken');
select pg_temp.eis((:'st'::jsonb #>> '{members,1,bedtime}') = '21:30', 'kind kan zijn bedtijd niet verzetten');
select pg_temp.eis((:'st'::jsonb #>> '{members,1,avatar,skin}') = 's3', 'kind kan wel zijn eigen avatar aanpassen');
select pg_temp.eis(jsonb_array_length(:'st'::jsonb -> 'rewards') = 1, 'kind kan beloningen niet wissen');
select pg_temp.eis((:'st'::jsonb #>> '{xp,k2}') = '20', 'kind kan punten van zus niet verlagen');
select pg_temp.eis((:'st'::jsonb #>> '{xp,k1}')::numeric = 310, 'kind kan zichzelf hooguit 300 punten per keer geven');
select pg_temp.eis((:'st'::jsonb -> 'checked') = '{}'::jsonb, 'kind kan zichzelf niet bevestigen namens een ouder');
select pg_temp.eis((select count(*) from jsonb_array_elements(:'st'::jsonb -> 'tasks') t where t ->> 'id' = 't1') = 1, 'taak van zus blijft staan');
select pg_temp.eis((select count(*) from jsonb_array_elements(:'st'::jsonb -> 'tasks') t where t ->> 'id' = 't9') = 1, 'eigen leerblokje toevoegen mag');
select pg_temp.eis((:'st'::jsonb #>> '{done,2026-10-15,t1}') = 'k2' and (:'st'::jsonb #>> '{done,2026-10-15,t2}') = 'k1', 'vinkje van zus blijft, eigen vinkje erbij');
select pg_temp.eis((:'st'::jsonb #>> '{proNotes,school}') = 'Kian heeft moeite met plannen', 'notities van school blijven bewaard (kind zag ze niet en wist ze niet)');
select pg_temp.eis(jsonb_array_length(:'st'::jsonb -> 'messages') = 2, 'berichten aan ouders blijven bewaard');
select pg_temp.eis((:'st'::jsonb #> '{checkins,k2,topics}') = '["Thuis"]'::jsonb, 'onderwerpen van zus blijven bewaard');
select pg_temp.eis(jsonb_array_length(:'st'::jsonb -> 'conflicts') = 1 and (:'st'::jsonb #>> '{conflicts,0,sides,k2,story}') = 'geheim', 'ruzie van zus blijft bewaard');
select pg_temp.eis((:'st'::jsonb #> '{dag,2026-10-15,k2,water}') = '3', 'dag-logboek van zus blijft bewaard');
select pg_temp.eis(:'st'::jsonb -> 'plans' ? 'k2', 'rustplan van zus blijft bewaard');

-- ===== Kian doet een eigen check-in en leest een bericht =====
select pg_temp.als('00000000-0000-0000-0000-00000000000b');
select (public.load_family() ->> 'state')::jsonb as kian, (public.load_family() ->> 'rev')::int as rev \gset
select public.save_family(jsonb_set(jsonb_set(:'kian'::jsonb, '{checkins,k1}', '{"mood":4,"rest":false,"topics":["School"],"wantsTalk":true,"at":"2"}'), '{messages,0,read}', 'true'), :rev);
select pg_temp.als('00000000-0000-0000-0000-00000000000a');
select state as st from public.families \gset
select pg_temp.eis((:'st'::jsonb #> '{checkins,k1,topics}') = '["School"]'::jsonb, 'eigen check-in komt aan bij ouders');
select pg_temp.eis((select m ->> 'read' from jsonb_array_elements(:'st'::jsonb -> 'messages') m where m ->> 'id' = 'm2') = 'true', 'kind kan een bericht aan zichzelf als gelezen markeren');
select pg_temp.eis((select m ->> 'read' from jsonb_array_elements(:'st'::jsonb -> 'messages') m where m ->> 'id' = 'm1') = 'false', 'bericht aan ouders blijft ongelezen');

-- ===== Samenwerken: afspraken, samen beslissen, vragen, samen-momenten =====
select pg_temp.als('00000000-0000-0000-0000-00000000000a');
select state as st, rev from public.families \gset
select public.save_family(:'st'::jsonb
  || '{"klusAfspraken":{"vastgelegd":"2026-10-15T10:00:00Z","door":"p1","klussen":{"ramen":{"aan":false}}}}'::jsonb
  || '{"ruil":{"2026-10-15":{"afval":"k2"}}}'::jsonb
  || '{"samen":[{"id":"s1","soort":"film","titel":"Film","wie":["p1","k2"],"datum":"2026-10-16","door":"p1","at":"1"}]}'::jsonb
  || '{"bezwaren":[{"id":"b2","at":"1","datum":"2026-10-15","klus":"vaat-uit","door":"k2","soort":"lukt-niet","reden":"Toets"}]}'::jsonb
  || '{"bezwaarAntwoord":{"b2":{"keuze":"toch","door":"p1","at":"2"}}}'::jsonb
  || '{"doelen":{"k2":{"vaardigheden":["plannen"]}}}'::jsonb, :rev);
select pg_temp.als('00000000-0000-0000-0000-00000000000b');
select (public.load_family() ->> 'state')::jsonb as kian, (public.load_family() ->> 'rev')::int as rev \gset
select pg_temp.eis(jsonb_array_length(:'kian'::jsonb -> 'bezwaren') = 0 and (:'kian'::jsonb -> 'bezwaarAntwoord') = '{}'::jsonb, 'kind ziet de vragen van zus niet');
select pg_temp.eis(not (:'kian'::jsonb -> 'doelen') ? 'k2', 'kind ziet de groeidoelen van zus niet');
select public.save_family(:'kian'::jsonb
  || '{"klusAfspraken":{"klussen":{"ramen":{"aan":true}}}}'::jsonb
  || '{"vrijstelling":{"2026-10-15":{"k1":"zin in niks"}}}'::jsonb
  || '{"uitdagingen":[{"id":"u1","at":"2026-10-15T15:00:00Z","klus":"vaat-in","spelers":["k1","k2"],"verliezer":"k2","manier":"spel"},{"id":"u2","at":"2026-10-15T15:00:00Z","klus":"keuken","spelers":["k2","p1"],"verliezer":"p1","manier":"spel"}]}'::jsonb
  || '{"ruil":{"2026-10-15":{"vaat-in":"k2","stofzuigen":"k2","afval":"k1"}}}'::jsonb
  || '{"bezwaren":[{"id":"b1","at":"2","datum":"2026-10-15","klus":"vaat-in","door":"k1","soort":"hulp","reden":"Weet niet hoe"}]}'::jsonb
  || '{"bezwaarAntwoord":{"b1":{"keuze":"ok","door":"p1","at":"3"}}}'::jsonb
  || '{"samen":[{"id":"s2","soort":"koken","titel":"Koken","wie":["k1","p1"],"datum":"2026-10-16","door":"k1","at":"2"}]}'::jsonb
  || jsonb_build_object('xp', (:'kian'::jsonb -> 'xp') || '{"k2": 500, "p1": 15}'::jsonb), :rev);
select pg_temp.als('00000000-0000-0000-0000-00000000000a');
select state as st from public.families \gset
select pg_temp.eis((:'st'::jsonb #>> '{klusAfspraken,klussen,ramen,aan}') = 'false', 'kind kan de klusafspraken niet wijzigen');
select pg_temp.eis(not coalesce(:'st'::jsonb -> 'vrijstelling', '{}') ? '2026-10-15', 'kind kan zichzelf geen vrijstelling geven');
select pg_temp.eis((:'st'::jsonb #>> '{ruil,2026-10-15,vaat-in}') = 'k2', 'klus wisselen na samen beslissen (waar het kind bij was) mag');
select pg_temp.eis(not (:'st'::jsonb -> 'ruil' -> '2026-10-15') ? 'stofzuigen', 'kind kan geen klus bij een ander neerleggen zonder besluit');
select pg_temp.eis((:'st'::jsonb #>> '{ruil,2026-10-15,afval}') = 'k2', 'kind kan een indeling van de ouder niet terugdraaien');
select pg_temp.eis((select count(*) from jsonb_array_elements(:'st'::jsonb -> 'uitdagingen') u where u ->> 'id' = 'u2') = 0, 'kind kan geen besluit verzinnen waar het niet bij was');
select pg_temp.eis((select count(*) from jsonb_array_elements(:'st'::jsonb -> 'bezwaren') b) = 2, 'vraag van het kind komt aan, vraag van zus blijft staan');
select pg_temp.eis(not (:'st'::jsonb -> 'bezwaarAntwoord') ? 'b1' and (:'st'::jsonb -> 'bezwaarAntwoord') ? 'b2', 'kind kan zelf geen antwoord van een ouder maken (en wist dat van zus niet)');
select pg_temp.eis((select count(*) from jsonb_array_elements(:'st'::jsonb -> 'samen')) = 2, 'kind plant iets samen, plan van zus en papa blijft staan');
select pg_temp.eis((:'st'::jsonb #>> '{xp,k2}')::numeric <= 50 and (:'st'::jsonb #>> '{xp,p1}')::numeric = 15, 'kind kan anderen hooguit een paar punten geven (samen gedaan), niet 500');
select pg_temp.eis((:'st'::jsonb #> '{doelen,k2,vaardigheden}') = '["plannen"]'::jsonb, 'groeidoelen van zus blijven bewaard');

-- ===== Schermtijd: alleen ouders vullen in, kind ziet alleen zijn eigen =====
select rev from public.families \gset
select public.save_family(:'st'::jsonb || '{"schermtijd":{"k1":{"2026-10-15":{"totaal":276,"sociaal":233,"door":"p1","at":"1"}},"k2":{"2026-10-15":{"totaal":60,"door":"p1","at":"1"}}},"schermAfspraak":{"k1":{"doel":120}}}'::jsonb, :rev);
select pg_temp.als('00000000-0000-0000-0000-00000000000b');
select (public.load_family() ->> 'state')::jsonb as kian, (public.load_family() ->> 'rev')::int as rev \gset
select pg_temp.eis((:'kian'::jsonb #>> '{schermtijd,k1,2026-10-15,totaal}') = '276' and not (:'kian'::jsonb -> 'schermtijd') ? 'k2', 'kind ziet zijn eigen schermtijd, niet die van zus');
select public.save_family(jsonb_set(jsonb_set(:'kian'::jsonb, '{schermtijd,k1,2026-10-15,totaal}', '30'), '{schermAfspraak,k1,doel}', '600'), :rev);
select pg_temp.als('00000000-0000-0000-0000-00000000000a');
select state as st from public.families \gset
select pg_temp.eis((:'st'::jsonb #>> '{schermtijd,k1,2026-10-15,totaal}') = '276' and (:'st'::jsonb #>> '{schermAfspraak,k1,doel}') = '120', 'kind kan zijn schermtijd en afspraak niet aanpassen');
select pg_temp.eis((:'st'::jsonb #>> '{schermtijd,k2,2026-10-15,totaal}') = '60', 'schermtijd van zus blijft bewaard');

-- ===== Ouder: alles mag, geschiedenis en terugzetten =====
select rev from public.families \gset
select public.save_family(jsonb_set(:'st'::jsonb, '{rewards}', '[]'), :rev);
select pg_temp.eis((select jsonb_array_length(state -> 'rewards') from public.families) = 0, 'ouder kan beloningen wél aanpassen');
select pg_temp.eis((select count(*) from public.family_history()) >= 3, 'versiegeschiedenis wordt bijgehouden');
select id as vorige from public.family_history() order by id desc limit 1 \gset
select public.restore_family(:vorige);
select pg_temp.eis((select jsonb_array_length(state -> 'rewards') from public.families) = 1, 'ouder kan een vorige versie terugzetten');
select pg_temp.eis(public.save_family(:'st'::jsonb, 1) = -1, 'verouderde versie wordt geweigerd (geen overschrijven)');
select pg_temp.als('00000000-0000-0000-0000-00000000000b');
select pg_temp.eis((select count(*) from public.family_history()) = 0, 'kind ziet de geschiedenis niet');
do $$ begin perform public.restore_family(1); raise exception 'kind kon terugzetten'; exception when others then if sqlerrm like '%kind kon%' then raise; end if; end $$;
select pg_temp.eis(true, 'kind kan geen versie terugzetten');
do $$ begin perform public.save_family('"onzin"'::jsonb, 1); raise exception 'onzin geaccepteerd'; exception when others then if sqlerrm like '%onzin geaccepteerd%' then raise; end if; end $$;
select pg_temp.eis(true, 'ongeldige stand wordt geweigerd');

-- ===== Uitnodigingscodes =====
reset role; insert into auth.users values ('00000000-0000-0000-0000-00000000000d', null);
select pg_temp.als('00000000-0000-0000-0000-00000000000d');
select pg_temp.eis(public.join_family(:'kian_code')::jsonb ->> 'fout' like '%al gebruikt%', 'gebruikte code werkt niet voor een andere telefoon');
select public.join_family('FOUT' || n) from generate_series(1, 10) n;
select pg_temp.eis(public.join_family('XXXXXXXX')::jsonb ->> 'fout' like '%Te vaak%', 'na 10 verkeerde codes even geblokkeerd (raden kan niet)');

-- ===== Foutmeldingen en gezin verwijderen =====
select public.log_error('Iets ging mis', 'stack', '2.1', '/');
select pg_temp.eis((select count(*) from public.client_errors) = 0, 'kind kan foutlog niet lezen (alleen opslaan)');
do $$ begin perform public.delete_family(); raise exception 'kind kon verwijderen'; exception when others then if sqlerrm like '%kind kon%' then raise; end if; end $$;
select pg_temp.eis(true, 'kind kan het gezin niet verwijderen');
reset role;
select pg_temp.eis((select count(*) from public.client_errors) = 1, 'foutmelding is vastgelegd');
select pg_temp.als('00000000-0000-0000-0000-00000000000a');
select public.delete_family();
reset role;
select pg_temp.eis((select count(*) from public.families) = 0 and (select count(*) from public.families_history) = 0 and (select count(*) from public.family_members) = 0, 'ouder kan het hele gezin verwijderen (AVG), inclusief geschiedenis');
\echo 'ALLE DATABASE-TESTS GESLAAGD'
