-- ============ Columns store a storage path, not a URL ============
alter table public.profiles rename column avatar_url to avatar_path;
alter table public.groups rename column logo_url to logo_path;
-- (column grants follow the rename: admins can still update logo_path)

-- ============ Buckets (private, size and type limited on the server) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 1048576, array['image/jpeg']),
  ('group-logos', 'group-logos', false, 1048576, array['image/jpeg']);

-- Safe cast: a malformed folder name gives null instead of a query error
create function private.try_uuid(p_value text)
returns uuid
language plpgsql immutable
as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

-- ============ avatars/{user_id}/{file}.jpg ============
create policy "Upload own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Delete own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "View own and group-mates' avatars" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or private.shares_group_with(private.try_uuid((storage.foldername(name))[1]))
    )
  );

-- ============ group-logos/{group_id}/{file}.jpg ============
create policy "Admins upload group logo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'group-logos'
    and private.is_group_admin(private.try_uuid((storage.foldername(name))[1]))
  );

create policy "Admins delete group logo" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'group-logos'
    and private.is_group_admin(private.try_uuid((storage.foldername(name))[1]))
  );

create policy "Members view group logo" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'group-logos'
    and private.is_group_member(private.try_uuid((storage.foldername(name))[1]))
  );