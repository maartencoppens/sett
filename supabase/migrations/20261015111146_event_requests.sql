-- ============ Tables ============

create table public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  type text not null check (type in ('rehearsal', 'jam', 'gig')),
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'cancelled')),
  title text check (char_length(title) <= 80),
  notes text check (char_length(notes) <= 1000),
  venue text check (char_length(venue) <= 120),
  address text check (char_length(address) <= 200),
  starts_at timestamptz,          -- filled in on confirmation
  ends_at timestamptz,
  confirmed_option_id uuid,       -- foreign key added below
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint confirmed_has_times check (
    status <> 'confirmed' or (starts_at is not null and ends_at > starts_at)
  )
);

create index events_group_status_idx on public.events (group_id, status, starts_at);

create table public.event_date_options (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  suggested_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index event_date_options_event_idx on public.event_date_options (event_id, starts_at);

alter table public.events
  add constraint events_confirmed_option_fkey
  foreign key (confirmed_option_id) references public.event_date_options (id) on delete set null;

create table public.event_responses (
  option_id uuid not null references public.event_date_options (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  response text not null check (response in ('accept', 'decline')),
  updated_at timestamptz not null default now(),
  primary key (option_id, user_id)
);

alter table public.events enable row level security;
alter table public.event_date_options enable row level security;
alter table public.event_responses enable row level security;

-- ============ Helpers ============

create function private.can_access_event(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select private.is_group_member(e.group_id) from public.events e where e.id = p_event_id),
    false
  );
$$;

-- The organiser (proposer) or a group admin
create function private.can_manage_event(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
      and (e.created_by = (select auth.uid()) or private.is_group_admin(e.group_id))
  );
$$;

create function private.can_access_option(p_option_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select private.can_access_event(o.event_id) from public.event_date_options o where o.id = p_option_id),
    false
  );
$$;

-- Member of the group AND the request is still open
create function private.option_is_open_to_me(p_option_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.event_date_options o
    join public.events e on e.id = o.event_id
    where o.id = p_option_id
      and e.status = 'proposed'
      and private.is_group_member(e.group_id)
  );
$$;

-- ============ Policies ============

-- events: members read; organiser/admin edit text fields only.
-- Creating, confirming and cancelling go through functions.
create policy "Members read events" on public.events
  for select to authenticated using (private.is_group_member(group_id));

create policy "Organiser or admin edits details" on public.events
  for update to authenticated
  using (private.can_manage_event(id)) with check (private.can_manage_event(id));

revoke update on public.events from anon, authenticated;
grant update (title, notes, venue, address) on public.events to authenticated;

-- date options: members read; adding goes through functions
create policy "Members read date options" on public.event_date_options
  for select to authenticated using (private.can_access_event(event_id));

-- responses: members read all; you write only your own, only while the request is open
create policy "Members read responses" on public.event_responses
  for select to authenticated using (private.can_access_option(option_id));

create policy "Answer for yourself" on public.event_responses
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.option_is_open_to_me(option_id));

create policy "Change your own answer" on public.event_responses
  for update to authenticated
  using (user_id = (select auth.uid()) and private.option_is_open_to_me(option_id))
  with check (user_id = (select auth.uid()) and private.option_is_open_to_me(option_id));

create policy "Clear your own answer" on public.event_responses
  for delete to authenticated
  using (user_id = (select auth.uid()) and private.option_is_open_to_me(option_id));

revoke update on public.event_responses from anon, authenticated;
grant update (response, updated_at) on public.event_responses to authenticated;

-- ============ Functions ============

-- Propose: event + 1–5 date options + the organiser says yes to all of them
create function public.create_event_request(
  p_group_id uuid,
  p_type text,
  p_title text,
  p_notes text,
  p_options jsonb  -- [{ "starts_at": "...", "ends_at": "..." }, ...]
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_event uuid;
  v_option jsonb;
  v_option_id uuid;
begin
  if v_user is null or not private.is_group_member(p_group_id) then
    raise exception 'Not a member of this group';
  end if;
  if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 1 and 5 then
    raise exception 'Propose between 1 and 5 dates';
  end if;

  insert into public.events (group_id, type, title, notes, created_by)
  values (p_group_id, p_type, nullif(trim(p_title), ''), nullif(trim(p_notes), ''), v_user)
  returning id into v_event;

  for v_option in select * from jsonb_array_elements(p_options) loop
    insert into public.event_date_options (event_id, starts_at, ends_at, suggested_by)
    values (v_event, (v_option ->> 'starts_at')::timestamptz, (v_option ->> 'ends_at')::timestamptz, v_user)
    returning id into v_option_id;

    insert into public.event_responses (option_id, user_id, response)
    values (v_option_id, v_user, 'accept');
  end loop;

  return v_event;
end;
$$;

-- Suggest another time: any member, while open, max 10 options per request
create function public.suggest_event_option(p_event_id uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_option uuid;
begin
  if not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.status = 'proposed' and private.is_group_member(e.group_id)
  ) then
    raise exception 'This request is closed or not in your group';
  end if;

  if (select count(*) from public.event_date_options where event_id = p_event_id) >= 10 then
    raise exception 'This request already has 10 date options';
  end if;

  insert into public.event_date_options (event_id, starts_at, ends_at, suggested_by)
  values (p_event_id, p_starts_at, p_ends_at, auth.uid())
  returning id into v_option;

  insert into public.event_responses (option_id, user_id, response)
  values (v_option, auth.uid(), 'accept');

  return v_option;
end;
$$;

-- Confirm one option: organiser or admin only
create function public.confirm_event(p_event_id uuid, p_option_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if not private.can_manage_event(p_event_id) then
    raise exception 'Only the organiser or an admin can confirm';
  end if;

  select o.starts_at, o.ends_at into v_start, v_end
  from public.event_date_options o
  where o.id = p_option_id and o.event_id = p_event_id;

  if v_start is null then
    raise exception 'This date does not belong to this request';
  end if;

  update public.events
  set status = 'confirmed', starts_at = v_start, ends_at = v_end, confirmed_option_id = p_option_id
  where id = p_event_id and status = 'proposed';

  if not found then
    raise exception 'This request is already closed';
  end if;
end;
$$;

-- Cancel a request or a confirmed event: organiser or admin only
create function public.cancel_event(p_event_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.can_manage_event(p_event_id) then
    raise exception 'Only the organiser or an admin can cancel';
  end if;

  update public.events set status = 'cancelled'
  where id = p_event_id and status <> 'cancelled';
end;
$$;

revoke execute on function public.create_event_request(uuid, text, text, text, jsonb) from public, anon;
revoke execute on function public.suggest_event_option(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function public.confirm_event(uuid, uuid) from public, anon;
revoke execute on function public.cancel_event(uuid) from public, anon;
grant execute on function public.create_event_request(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.suggest_event_option(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.confirm_event(uuid, uuid) to authenticated;
grant execute on function public.cancel_event(uuid) to authenticated;