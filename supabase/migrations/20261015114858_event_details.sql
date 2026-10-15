-- ============ Gig times ============
alter table public.events
  add column load_in_at timestamptz,
  add column soundcheck_at timestamptz,
  add constraint gig_times_before_show check (
    (load_in_at is null or starts_at is null or load_in_at <= starts_at)
    and (soundcheck_at is null or starts_at is null or soundcheck_at <= starts_at)
  );

grant update (load_in_at, soundcheck_at) on public.events to authenticated;

-- ============ Helpers ============

-- Member of the group AND the event is confirmed
create function private.event_is_confirmed_for_me(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.status = 'confirmed' and private.is_group_member(e.group_id)
  );
$$;

-- Member of the group AND the event isn't cancelled
create function private.event_is_active_for_me(p_event_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.status <> 'cancelled' and private.is_group_member(e.group_id)
  );
$$;

-- ============ Attendance ============
create table public.attendance (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null check (status in ('in', 'out', 'unsure')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.attendance enable row level security;

create policy "Members read attendance" on public.attendance
  for select to authenticated using (private.can_access_event(event_id));

create policy "Set your own attendance" on public.attendance
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.event_is_confirmed_for_me(event_id));

create policy "Change your own attendance" on public.attendance
  for update to authenticated
  using (user_id = (select auth.uid()) and private.event_is_confirmed_for_me(event_id))
  with check (user_id = (select auth.uid()) and private.event_is_confirmed_for_me(event_id));

create policy "Clear your own attendance" on public.attendance
  for delete to authenticated
  using (user_id = (select auth.uid()) and private.event_is_confirmed_for_me(event_id));

-- No column revokes here: the app upserts all columns, and RLS already
-- guarantees you can only ever write your own row.

-- ============ Who brings what ============
create table public.bring_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  assigned_to uuid references auth.users (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index bring_items_event_idx on public.bring_items (event_id, created_at);

alter table public.bring_items enable row level security;

create policy "Members read bring items" on public.bring_items
  for select to authenticated using (private.can_access_event(event_id));

create policy "Members add bring items" on public.bring_items
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.event_is_active_for_me(event_id)
    and (assigned_to is null or assigned_to = (select auth.uid()))
  );

-- Claim an unclaimed item, or release your own claim. Nothing else.
create policy "Claim or release items" on public.bring_items
  for update to authenticated
  using (
    private.event_is_active_for_me(event_id)
    and (assigned_to is null or assigned_to = (select auth.uid()))
  )
  with check (assigned_to is null or assigned_to = (select auth.uid()));

revoke update on public.bring_items from anon, authenticated;
grant update (assigned_to) on public.bring_items to authenticated;

create policy "Remove your own items, or organiser or admin" on public.bring_items
  for delete to authenticated
  using (created_by = (select auth.uid()) or private.can_manage_event(event_id));