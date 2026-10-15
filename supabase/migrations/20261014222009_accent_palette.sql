alter table public.groups
  add constraint groups_accent_color_check
  check (accent_color in ('indigo', 'teal', 'rose', 'amber', 'violet', 'green', 'orange', 'slate'));