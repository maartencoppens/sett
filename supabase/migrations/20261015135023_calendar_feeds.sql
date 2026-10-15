create table public.calendar_feeds (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

alter table public.calendar_feeds enable row level security;

-- You can see and remove your own feeds. Creating/resetting goes through a function.
create policy "Read own feeds" on public.calendar_feeds
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Remove own feeds" on public.calendar_feeds
  for delete to authenticated using (user_id = (select auth.uid()));

-- Create or reset your feed for a group: a new random token each time
create function public.rotate_calendar_feed(p_group_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex'); -- 48 hex characters
begin
  if not private.is_group_member(p_group_id) then
    raise exception 'Not a member of this group';
  end if;

  insert into public.calendar_feeds (user_id, group_id, token)
  values (auth.uid(), p_group_id, v_token)
  on conflict (user_id, group_id)
  do update set token = excluded.token, created_at = now();

  return v_token;
end;
$$;

revoke execute on function public.rotate_calendar_feed(uuid) from public, anon;
grant execute on function public.rotate_calendar_feed(uuid) to authenticated;

-- What a calendar app may see for a token: confirmed events of that group, nothing else.
-- Returns null for an unknown token, a member who left, or an archived group.
create function public.calendar_feed(p_token text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'group_name', g.name,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'type', e.type, 'title', e.title, 'notes', e.notes,
        'venue', e.venue, 'address', e.address,
        'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'load_in_at', e.load_in_at, 'soundcheck_at', e.soundcheck_at
      ) order by e.starts_at)
      from public.events e
      where e.group_id = f.group_id
        and e.status = 'confirmed'
        and e.ends_at > now() - interval '30 days'
    ), '[]'::jsonb)
  )
  from public.calendar_feeds f
  join public.group_members m on m.group_id = f.group_id and m.user_id = f.user_id  -- still a member?
  join public.groups g on g.id = f.group_id and g.archived_at is null
  where f.token = p_token
    and char_length(p_token) = 48;
$$;

-- Calendar apps aren't logged in, so the anonymous role may call this one function
revoke execute on function public.calendar_feed(text) from public;
grant execute on function public.calendar_feed(text) to anon, authenticated;