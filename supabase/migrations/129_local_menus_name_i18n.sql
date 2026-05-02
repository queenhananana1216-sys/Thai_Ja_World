-- Multilingual dish names for QR digital menu (ko/th/en/zh). Fallback: name column.
alter table public.local_menus
  add column if not exists name_i18n jsonb;

comment on column public.local_menus.name_i18n is
  'Optional labels per locale, e.g. {"ko":"…","th":"…","en":"…","zh":"…"}. When null, UI uses name only.';
