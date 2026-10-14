-- FamilyFlow, release 1 (testpilot).
-- Plak dit in Supabase › SQL Editor › New query en klik op Run. Je kunt het veilig opnieuw draaien.
--
-- Opzet: één rij per gezin met de hele gezinsstand als JSON. Simpel en snel genoeg voor een gezin.
-- "rev" telt op bij elke wijziging, zodat twee telefoons elkaar niet overschrijven.

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  state jsonb not null,
  rev integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  member_id text not null,
  role text not null default 'kind',
  joined_at timestamptz not null default now()
);
create index if not exists family_members_family on public.family_members (family_id);

create table if not exists public.invites (
  code text primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  member_id text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.invites enable row level security;

-- Hulpfuncties (security definer, zodat de policies zichzelf niet in een kringetje aanroepen).
create or replace function public.my_family() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from public.family_members where user_id = auth.uid()
$$;

create or replace function public.i_am_parent() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.family_members where user_id = auth.uid() and role = 'ouder')
$$;

-- Policies: je ziet en wijzigt alleen je eigen gezin.
drop policy if exists "eigen gezin lezen" on public.families;
create policy "eigen gezin lezen" on public.families for select using (id = public.my_family());
drop policy if exists "eigen gezin wijzigen" on public.families;
create policy "eigen gezin wijzigen" on public.families for update using (id = public.my_family()) with check (id = public.my_family());

drop policy if exists "gezinsleden lezen" on public.family_members;
create policy "gezinsleden lezen" on public.family_members for select using (family_id = public.my_family());

drop policy if exists "ouders zien uitnodigingen" on public.invites;
create policy "ouders zien uitnodigingen" on public.invites for select using (family_id = public.my_family() and public.i_am_parent());

-- Gezin aanmaken: de maker wordt ouder.
create or replace function public.create_family(p_state jsonb, p_member_id text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  if exists (select 1 from family_members where user_id = auth.uid()) then
    raise exception 'Je hoort al bij een gezin';
  end if;
  insert into families (state) values (p_state) returning id into fid;
  insert into family_members (user_id, family_id, member_id, role) values (auth.uid(), fid, p_member_id, 'ouder');
  return fid;
end $$;

-- Uitnodigingscode maken of vernieuwen (alleen ouders). Oude code voor die persoon vervalt.
create or replace function public.make_invite(p_member_id text) returns text
language plpgsql security definer set search_path = public as $$
declare fid uuid := public.my_family(); c text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if fid is null or not public.i_am_parent() then raise exception 'Alleen ouders kunnen uitnodigen'; end if;
  delete from invites where family_id = fid and member_id = p_member_id;
  loop
    c := '';
    for i in 1..6 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from invites where code = c);
  end loop;
  insert into invites (code, family_id, member_id) values (c, fid, p_member_id);
  return c;
end $$;

-- Meedoen met een code. Een nieuwe telefoon vervangt de oude login van dezelfde persoon.
create or replace function public.join_family(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype; r text;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  select * into inv from invites where code = upper(trim(p_code));
  if not found then raise exception 'Deze code klopt niet'; end if;
  if inv.used_at is not null and inv.used_at < now() - interval '10 minutes' then
    raise exception 'Deze code is al gebruikt. Vraag een nieuwe aan je ouder';
  end if;
  select coalesce(m->>'role', 'kind') into r
    from families f, jsonb_array_elements(f.state->'members') m
    where f.id = inv.family_id and m->>'id' = inv.member_id;
  delete from family_members where family_id = inv.family_id and member_id = inv.member_id;
  delete from family_members where user_id = auth.uid();
  insert into family_members (user_id, family_id, member_id, role) values (auth.uid(), inv.family_id, inv.member_id, coalesce(r, 'kind'));
  update invites set used_at = now() where code = inv.code;
  return json_build_object('family_id', inv.family_id, 'member_id', inv.member_id);
end $$;

-- Opslaan met versiecheck. Geeft de nieuwe rev terug, of -1 als iemand anders net iets wijzigde.
create or replace function public.save_family(p_state jsonb, p_rev integer) returns integer
language plpgsql security definer set search_path = public as $$
declare fid uuid := public.my_family(); n integer;
begin
  if fid is null then raise exception 'Geen gezin'; end if;
  update families set state = p_state, rev = rev + 1, updated_at = now()
    where id = fid and rev = p_rev returning rev into n;
  return coalesce(n, -1);
end $$;

-- Wie ben ik en bij welk gezin hoor ik?
create or replace function public.whoami() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('family_id', family_id, 'member_id', member_id, 'role', role)
  from family_members where user_id = auth.uid()
$$;

grant execute on function public.create_family(jsonb, text) to authenticated;
grant execute on function public.make_invite(text) to authenticated;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.save_family(jsonb, integer) to authenticated;
grant execute on function public.whoami() to authenticated;
