-- ============ Tables ============

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  template text not null check (template in ('band', 'jam', 'project')),
  accent_color text not null default 'indigo',  -- palette key, not a hex value
  logo_url text,
  archived_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member', 'guest')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- The primary key covers lookups by group; this covers "all groups of a user"
create index group_members_user_id_idx on public.group_members (user_id);

create table public.group_modules (
  group_id uuid not null references public.groups (id) on delete cascade,
  module text not null check (module in (
    'gig_details', 'setlists', 'bring_items', 'song_wishlist', 'rotating_location'
  )),
  primary key (group_id, module)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_modules enable row level security;

-- ============ Helper functions (private schema, not exposed via the API) ============

create schema if not exists private;
grant usage on schema private to authenticated;

create function private.is_group_member(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid())
  );
$$;

create function private.is_group_admin(p_group_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = (select auth.uid()) and role = 'admin'
  );
$$;

create function private.shares_group_with(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;

-- ============ Policies ============

-- groups: members read, admins update. No insert/delete policy:
-- creating goes through create_group(), deleting becomes "archive" later.
create policy "Members read their groups" on public.groups
  for select to authenticated
  using (private.is_group_member(id));

create policy "Admins update their groups" on public.groups
  for update to authenticated
  using (private.is_group_admin(id))
  with check (private.is_group_admin(id));

-- group_members: see your co-members; leave yourself; admins manage roles and remove.
-- No insert policy: joining goes through invites (next steps).
create policy "Members read co-members" on public.group_members
  for select to authenticated
  using (private.is_group_member(group_id));

create policy "Admins change roles" on public.group_members
  for update to authenticated
  using (private.is_group_admin(group_id))
  with check (private.is_group_admin(group_id));

create policy "Leave group or admin removes" on public.group_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or private.is_group_admin(group_id));

-- group_modules: members read, admins toggle.
create policy "Members read modules" on public.group_modules
  for select to authenticated
  using (private.is_group_member(group_id));

create policy "Admins enable modules" on public.group_modules
  for insert to authenticated
  with check (private.is_group_admin(group_id));

create policy "Admins disable modules" on public.group_modules
  for delete to authenticated
  using (private.is_group_admin(group_id));

-- profiles: widen from "own row" to "own row + people who share a group with you"
drop policy "Read own profile" on public.profiles;

create policy "Read own and group-mates' profiles" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or private.shares_group_with(id));

-- ============ create_group(): one atomic step ============

create function public.create_group(p_name text, p_template text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.groups (name, template, created_by)
  values (trim(p_name), p_template, v_user_id)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'admin');

  insert into public.group_modules (group_id, module)
  select v_group_id, unnest(
    case p_template
      when 'band'    then array['gig_details', 'setlists', 'bring_items']
      when 'jam'     then array['song_wishlist', 'bring_items', 'rotating_location']
      when 'project' then array['gig_details', 'setlists', 'bring_items']
    end
  );

  return v_group_id;
end;
$$;

revoke execute on function public.create_group(text, text) from public, anon;
grant execute on function public.create_group(text, text) to authenticated;