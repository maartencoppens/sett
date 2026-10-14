alter table public.profiles
  add constraint display_name_length
  check (char_length(display_name) between 1 and 50);