-- ============ Fix 1: limit which columns can be updated ============
-- The update policies only check WHO updates, not WHICH columns.
-- An admin could change user_id on a member row and pull any user into the group
-- (and then read their profile). Column grants close that hole.
revoke update on public.group_members from anon, authenticated;
grant update (role) on public.group_members to authenticated;

revoke update on public.groups from anon, authenticated;
grant update (name, accent_color, logo_url, archived_at) on public.groups to authenticated;

-- ============ Fix 2: a group always keeps an admin ============
create function private.keep_an_admin()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Cascades (deleting a whole group or a user account) are allowed
  if pg_trigger_depth() > 1 then
    return coalesce(new, old);
  end if;

  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (
       select 1 from public.group_members
       where group_id = old.group_id and role = 'admin' and user_id <> old.user_id
     )
  then
    raise exception 'A group needs at least one admin. Make someone else admin first.';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger group_members_keep_an_admin
  before update or delete on public.group_members
  for each row execute function private.keep_an_admin();

-- Lets the API embed profiles in member queries (group_members → profiles)
alter table public.group_members
  add constraint group_members_profile_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- ============ Invites ============
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  code text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

create policy "Admins read their group's invites" on public.invites
  for select to authenticated
  using (private.is_group_admin(group_id));

create policy "Admins revoke invites" on public.invites
  for delete to authenticated
  using (private.is_group_admin(group_id));

-- Create an invite (admins only)
create function public.create_invite(p_group_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_code text;
begin
  if not private.is_group_admin(p_group_id) then
    raise exception 'Only admins can invite';
  end if;

  -- Cryptographically random, 10 hex characters (no O/0 or I/1 confusion)
  v_code := upper(encode(extensions.gen_random_bytes(5), 'hex'));

  insert into public.invites (group_id, code, created_by)
  values (p_group_id, v_code, auth.uid());

  return v_code;
end;
$$;

-- Preview before joining: only reveals the group's name and template
create function public.get_invite(p_code text)
returns table (group_id uuid, group_name text, template text, already_member boolean)
language sql stable security definer set search_path = ''
as $$
  select g.id, g.name, g.template, private.is_group_member(g.id)
  from public.invites i
  join public.groups g on g.id = i.group_id
  where i.code = upper(trim(p_code))
    and i.expires_at > now()
    and g.archived_at is null;
$$;

-- Join with a code
create function public.join_group(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select i.group_id into v_group_id
  from public.invites i
  join public.groups g on g.id = i.group_id
  where i.code = upper(trim(p_code))
    and i.expires_at > now()
    and g.archived_at is null;

  if v_group_id is null then
    raise exception 'This invite is invalid or has expired';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

revoke execute on function public.create_invite(uuid) from public, anon;
revoke execute on function public.get_invite(text) from public, anon;
revoke execute on function public.join_group(text) from public, anon;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.get_invite(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;