-- =============================================================================
-- bestvip77: Chinese-first member CRM expansion for admin console
-- - multilingual names (ZH required, KO/EN optional)
-- - mirrored verified phone
-- - admin note / updated_at / last_seen_at
-- - searchable text + Korean chosung
-- - own safe RPCs for phone sync and last-seen heartbeat
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

do $do$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'
      and n.nspname = 'public'
  ) then
    execute 'alter extension pg_trgm set schema extensions';
  end if;
end
$do$;

create or replace function public.bestvip77_utf8_first_codepoint(c text)
returns integer
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  b bytea;
  len int;
begin
  if c is null or length(c) < 1 then
    return -1;
  end if;

  c := substr(c, 1, 1);
  b := convert_to(c, 'UTF8');
  len := octet_length(b);

  if len = 1 then
    return get_byte(b, 0);
  elsif len = 2 then
    return ((get_byte(b, 0) & 31) << 6) | (get_byte(b, 1) & 63);
  elsif len = 3 then
    return ((get_byte(b, 0) & 15) << 12) | ((get_byte(b, 1) & 63) << 6) | (get_byte(b, 2) & 63);
  elsif len = 4 then
    return ((get_byte(b, 0) & 7) << 18) | ((get_byte(b, 1) & 63) << 12) | ((get_byte(b, 2) & 63) << 6) | (get_byte(b, 3) & 63);
  end if;

  return -1;
end;
$$;

create or replace function public.bestvip77_compute_chosung(raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  result text := '';
  i int;
  ch text;
  cp int;
  cho_idx int;
  chosung text[] := array[
    'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ',
    'ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
  ];
  lower_ascii text := '';
begin
  if raw is null or btrim(raw) = '' then
    return '';
  end if;

  for i in 1..char_length(raw) loop
    ch := substr(raw, i, 1);
    cp := public.bestvip77_utf8_first_codepoint(ch);
    if cp between 44032 and 55203 then
      cho_idx := (cp - 44032) / 588;
      if cho_idx between 0 and 18 then
        result := result || chosung[cho_idx + 1];
      end if;
    elsif ch ~ '[a-zA-Z0-9]' then
      lower_ascii := lower_ascii || lower(ch);
    end if;
  end loop;

  return trim(both ' ' from (result || ' ' || lower_ascii || ' ' || lower(raw)));
end;
$$;

create or replace function public.bestvip77_build_member_search_text(
  p_display_name_zh text,
  p_display_name_ko text,
  p_display_name_en text,
  p_email text,
  p_phone_e164 text,
  p_carrier_country text,
  p_carrier_label text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(
    trim(
      both ' ' from concat_ws(
        ' ',
        nullif(btrim(coalesce(p_display_name_zh, '')), ''),
        nullif(btrim(coalesce(p_display_name_ko, '')), ''),
        nullif(btrim(coalesce(p_display_name_en, '')), ''),
        nullif(btrim(coalesce(p_email, '')), ''),
        nullif(btrim(coalesce(p_phone_e164, '')), ''),
        nullif(btrim(coalesce(p_carrier_country, '')), ''),
        nullif(btrim(coalesce(p_carrier_label, '')), '')
      )
    )
  );
$$;

alter table public.bestvip77_member_profiles
  add column if not exists display_name_zh text,
  add column if not exists display_name_ko text,
  add column if not exists display_name_en text,
  add column if not exists phone_e164 text,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists admin_note text not null default '',
  add column if not exists search_text text not null default '',
  add column if not exists search_chosung text not null default '',
  add column if not exists updated_at timestamptz not null default now();

update public.bestvip77_member_profiles
set
  display_name_zh = coalesce(
    nullif(btrim(display_name_zh), ''),
    nullif(split_part(coalesce(email, ''), '@', 1), ''),
    '會員-' || substr(user_id::text, 1, 8)
  ),
  display_name_ko = nullif(btrim(coalesce(display_name_ko, '')), ''),
  display_name_en = nullif(btrim(coalesce(display_name_en, '')), ''),
  phone_e164 = nullif(btrim(coalesce(phone_e164, '')), ''),
  admin_note = btrim(coalesce(admin_note, ''));

alter table public.bestvip77_member_profiles
  alter column display_name_zh set not null;

do $do$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bestvip77_member_profiles_display_name_zh_nonempty'
  ) then
    alter table public.bestvip77_member_profiles
      add constraint bestvip77_member_profiles_display_name_zh_nonempty
      check (length(btrim(display_name_zh)) > 0);
  end if;
end
$do$;

comment on column public.bestvip77_member_profiles.display_name_zh is
  '중국어 기본 표시 이름 (필수).';
comment on column public.bestvip77_member_profiles.display_name_ko is
  '한국어 별칭/이름 (선택).';
comment on column public.bestvip77_member_profiles.display_name_en is
  '영문 별칭/이름 (선택).';
comment on column public.bestvip77_member_profiles.phone_e164 is
  'SMS 인증이 끝난 E.164 형식 전화번호 미러.';
comment on column public.bestvip77_member_profiles.phone_verified_at is
  '휴대폰 OTP 인증 완료 시각.';
comment on column public.bestvip77_member_profiles.last_seen_at is
  '앱 내 최근 활동 시각.';
comment on column public.bestvip77_member_profiles.admin_note is
  '관리자 전용 메모.';
comment on column public.bestvip77_member_profiles.search_text is
  '이름/연락처/지역을 합친 검색용 텍스트.';
comment on column public.bestvip77_member_profiles.search_chosung is
  '한국어 이름 초성 검색 문자열.';

create or replace function public.trg_bestvip77_member_profiles_derive()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  new.email := nullif(btrim(coalesce(new.email, '')), '');
  new.display_name_zh := coalesce(
    nullif(btrim(coalesce(new.display_name_zh, '')), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '會員-' || substr(new.user_id::text, 1, 8)
  );
  new.display_name_ko := nullif(btrim(coalesce(new.display_name_ko, '')), '');
  new.display_name_en := nullif(btrim(coalesce(new.display_name_en, '')), '');
  new.carrier_country := upper(trim(coalesce(new.carrier_country, 'KR')));
  if new.carrier_country not in ('KR', 'CN') then
    new.carrier_country := 'KR';
  end if;
  new.carrier_label := nullif(btrim(coalesce(new.carrier_label, '')), '');
  new.phone_e164 := nullif(regexp_replace(coalesce(new.phone_e164, ''), '[^0-9+]+', '', 'g'), '');
  new.admin_note := btrim(coalesce(new.admin_note, ''));
  new.search_text := public.bestvip77_build_member_search_text(
    new.display_name_zh,
    new.display_name_ko,
    new.display_name_en,
    new.email,
    new.phone_e164,
    new.carrier_country,
    new.carrier_label
  );
  new.search_chosung := public.bestvip77_compute_chosung(coalesce(new.display_name_ko, ''));
  new.updated_at := now();
  return new;
end;
$$;

alter function public.trg_bestvip77_member_profiles_derive() owner to postgres;

drop trigger if exists trg_bestvip77_member_profiles_derive on public.bestvip77_member_profiles;
create trigger trg_bestvip77_member_profiles_derive
  before insert or update on public.bestvip77_member_profiles
  for each row
  execute function public.trg_bestvip77_member_profiles_derive();

update public.bestvip77_member_profiles
set updated_at = now();

create index if not exists bestvip77_member_profiles_country_idx
  on public.bestvip77_member_profiles (carrier_country);

create index if not exists bestvip77_member_profiles_last_seen_idx
  on public.bestvip77_member_profiles (last_seen_at desc nulls last);

create index if not exists bestvip77_member_profiles_phone_verified_idx
  on public.bestvip77_member_profiles (phone_verified_at desc nulls last);

create unique index if not exists bestvip77_member_profiles_phone_e164_uidx
  on public.bestvip77_member_profiles (phone_e164)
  where phone_e164 is not null;

create index if not exists bestvip77_member_profiles_search_text_trgm_idx
  on public.bestvip77_member_profiles
  using gin (search_text extensions.gin_trgm_ops);

create index if not exists bestvip77_member_profiles_search_chosung_trgm_idx
  on public.bestvip77_member_profiles
  using gin (search_chosung extensions.gin_trgm_ops);

create or replace function public.bestvip77_auth_user_hook()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  cc text;
  cl text;
  name_zh text;
  name_ko text;
  name_en text;
begin
  if coalesce(new.raw_user_meta_data->>'bestvip77', '') not in ('true', '1') then
    return new;
  end if;

  cc := upper(trim(coalesce(new.raw_user_meta_data->>'carrier_country', '')));
  if cc not in ('KR', 'CN') then
    cc := 'KR';
  end if;

  cl := nullif(trim(coalesce(new.raw_user_meta_data->>'carrier_label', '')), '');
  name_zh := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name_zh', '')), '');
  name_ko := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name_ko', '')), '');
  name_en := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name_en', '')), '');

  insert into public.bestvip77_member_profiles (
    user_id,
    email,
    carrier_country,
    carrier_label,
    status,
    display_name_zh,
    display_name_ko,
    display_name_en
  )
  values (
    new.id,
    new.email,
    cc,
    cl,
    'pending',
    coalesce(name_zh, nullif(split_part(coalesce(new.email, ''), '@', 1), ''), '會員-' || substr(new.id::text, 1, 8)),
    name_ko,
    name_en
  )
  on conflict (user_id) do update
    set email = coalesce(excluded.email, public.bestvip77_member_profiles.email),
        display_name_zh = case
          when nullif(btrim(coalesce(public.bestvip77_member_profiles.display_name_zh, '')), '') is null
            then excluded.display_name_zh
          else public.bestvip77_member_profiles.display_name_zh
        end,
        display_name_ko = coalesce(public.bestvip77_member_profiles.display_name_ko, excluded.display_name_ko),
        display_name_en = coalesce(public.bestvip77_member_profiles.display_name_en, excluded.display_name_en);

  return new;
end;
$$;

alter function public.bestvip77_auth_user_hook() owner to postgres;

grant execute on function public.bestvip77_auth_user_hook() to supabase_auth_admin;

create or replace function public.bestvip77_sync_own_phone(p_phone_e164 text)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.bestvip77_member_profiles
  set
    phone_e164 = nullif(regexp_replace(coalesce(p_phone_e164, ''), '[^0-9+]+', '', 'g'), ''),
    phone_verified_at = now()
  where user_id = auth.uid();
end;
$$;

alter function public.bestvip77_sync_own_phone(text) owner to postgres;
revoke all on function public.bestvip77_sync_own_phone(text) from public;
grant execute on function public.bestvip77_sync_own_phone(text) to authenticated;
grant execute on function public.bestvip77_sync_own_phone(text) to service_role;

create or replace function public.bestvip77_touch_member_last_seen()
returns timestamptz
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  touched_at timestamptz;
begin
  if auth.uid() is null then
    return null;
  end if;

  update public.bestvip77_member_profiles
  set last_seen_at = now()
  where user_id = auth.uid()
    and (
      last_seen_at is null
      or last_seen_at < now() - interval '5 minutes'
    )
  returning last_seen_at into touched_at;

  if touched_at is null then
    select last_seen_at
      into touched_at
    from public.bestvip77_member_profiles
    where user_id = auth.uid();
  end if;

  return touched_at;
end;
$$;

alter function public.bestvip77_touch_member_last_seen() owner to postgres;
revoke all on function public.bestvip77_touch_member_last_seen() from public;
grant execute on function public.bestvip77_touch_member_last_seen() to authenticated;
grant execute on function public.bestvip77_touch_member_last_seen() to service_role;
