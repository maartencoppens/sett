-- upsert() updates every column it sends, so all four need UPDATE privilege.
-- RLS (user_id = auth.uid() + open option in your group) still restricts what you can write.
grant update (option_id, user_id) on public.event_responses to authenticated;