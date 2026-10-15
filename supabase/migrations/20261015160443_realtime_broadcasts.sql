-- One trigger function for all tables: work out which group a change belongs to,
-- then send a tiny signal on that group's private channel.
create function private.broadcast_group_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_group_id uuid;
  v_event_id uuid;
begin
  if tg_table_name = 'groups' then
    v_group_id := coalesce(new.id, old.id);
  elsif tg_table_name = 'group_members' then
    v_group_id := coalesce(new.group_id, old.group_id);
  elsif tg_table_name = 'events' then
    v_event_id := coalesce(new.id, old.id);
    v_group_id := coalesce(new.group_id, old.group_id);
  elsif tg_table_name = 'event_responses' then
    select o.event_id into v_event_id
    from public.event_date_options o
    where o.id = coalesce(new.option_id, old.option_id);
  else -- event_date_options, attendance, bring_items
    v_event_id := coalesce(new.event_id, old.event_id);
  end if;

  if v_group_id is null and v_event_id is not null then
    select e.group_id into v_group_id from public.events e where e.id = v_event_id;
  end if;

  -- During a cascade delete the parent may already be gone: then there's nothing to signal
  if v_group_id is not null then
    perform realtime.send(
      jsonb_build_object('table', tg_table_name, 'event_id', v_event_id), -- payload: no row data
      'changed',                                                         -- event name
      'group:' || v_group_id::text,                                      -- topic
      true                                                               -- private channel
    );
  end if;

  return null;
end;
$$;

create trigger broadcast_groups after insert or update or delete on public.groups
  for each row execute function private.broadcast_group_change();
create trigger broadcast_group_members after insert or update or delete on public.group_members
  for each row execute function private.broadcast_group_change();
create trigger broadcast_events after insert or update or delete on public.events
  for each row execute function private.broadcast_group_change();
create trigger broadcast_event_date_options after insert or update or delete on public.event_date_options
  for each row execute function private.broadcast_group_change();
create trigger broadcast_event_responses after insert or update or delete on public.event_responses
  for each row execute function private.broadcast_group_change();
create trigger broadcast_attendance after insert or update or delete on public.attendance
  for each row execute function private.broadcast_group_change();
create trigger broadcast_bring_items after insert or update or delete on public.bring_items
  for each row execute function private.broadcast_group_change();

-- Who may LISTEN to which channel: members of that group only.
-- There's no insert policy, so the app itself can't send on these channels;
-- only the database triggers can.
create policy "Members receive their group's changes" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'group:%'
    and private.is_group_member(private.try_uuid(split_part(realtime.topic(), ':', 2)))
  );