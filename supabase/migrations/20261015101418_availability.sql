create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text check (char_length(label) <= 40),        -- private, never shared
  repeat text not null check (repeat in ('none', 'weekly')),

  -- one-off: a fixed moment in time
  starts_at timestamptz,
  ends_at timestamptz,

  -- weekly: local wall-clock time in a time zone (survives summer/winter time)
  weekday smallint check (weekday between 1 and 7),   -- ISO: 1 = Monday … 7 = Sunday
  start_time time,
  end_time time,
  time_zone text,
  until_date date,

  created_at timestamptz not null default now(),

  constraint one_off_shape check (
    repeat <> 'none'
    or (starts_at is not null and ends_at > starts_at and weekday is null and start_time is null)
  ),
  constraint weekly_shape check (
    repeat <> 'weekly'
    or (weekday is not null and start_time is not null and end_time > start_time
        and time_zone is not null and starts_at is null and ends_at is null)
  )
);

create index availability_blocks_user_id_idx on public.availability_blocks (user_id);

alter table public.availability_blocks enable row level security;

-- Only the owner can read or change their own blocks, labels included
create policy "Own availability: read" on public.availability_blocks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Own availability: insert" on public.availability_blocks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Own availability: update" on public.availability_blocks
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Own availability: delete" on public.availability_blocks
  for delete to authenticated using (user_id = (select auth.uid()));

-- Reject unknown time zones. One bad value would otherwise break
-- the busy overview for the whole group.
create function private.check_time_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.time_zone is not null
     and not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    raise exception 'Unknown time zone: %', new.time_zone;
  end if;
  return new;
end;
$$;

create trigger availability_blocks_check_time_zone
  before insert or update on public.availability_blocks
  for each row execute function private.check_time_zone();

-- ============ What group-mates get: busy intervals only ============
create function public.group_busy(p_group_id uuid, p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_group_member(p_group_id) then
    raise exception 'Not a member of this group';
  end if;
  if p_to <= p_from or p_to - p_from > interval '62 days' then
    raise exception 'Range must be longer than 0 and at most 62 days';
  end if;

  return query
  -- one-off blocks that overlap the range
  select b.user_id, b.starts_at, b.ends_at
  from public.availability_blocks b
  join public.group_members m on m.user_id = b.user_id and m.group_id = p_group_id
  where b.repeat = 'none'
    and b.starts_at < p_to
    and b.ends_at > p_from

  union all

  -- weekly blocks, expanded day by day in each member's own time zone
  select
    b.user_id,
    (d.day + b.start_time) at time zone b.time_zone,
    (d.day + b.end_time) at time zone b.time_zone
  from public.availability_blocks b
  join public.group_members m on m.user_id = b.user_id and m.group_id = p_group_id
  cross join lateral generate_series(
    ((p_from at time zone b.time_zone)::date - 1)::timestamp,
    ((p_to at time zone b.time_zone)::date)::timestamp,
    interval '1 day'
  ) as d(day)
  where b.repeat = 'weekly'
    and extract(isodow from d.day) = b.weekday
    and (b.until_date is null or d.day::date <= b.until_date)
    and (d.day + b.start_time) at time zone b.time_zone < p_to
    and (d.day + b.end_time) at time zone b.time_zone > p_from;
end;
$$;

revoke execute on function public.group_busy(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.group_busy(uuid, timestamptz, timestamptz) to authenticated;