-- =============================================================================
-- 017_profile_compute_admin_search_search_path
-- Supabase Advisor lint 0011_function_search_path_mutable 대응:
-- public.profile_compute_admin_search 및 연쇄 호출 utf8_first_codepoint,
-- 트리거 래퍼 trg_profiles_set_admin_search 에 고정 search_path 부여.
-- search_path = '' 는 스키마 한정 참조 + pg_catalog 내장만 사용할 때 안전.
-- =============================================================================

create or replace function public.utf8_first_codepoint(c text)
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

create or replace function public.profile_compute_admin_search(raw text)
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
  c char(1);
begin
  if raw is null or btrim(raw) = '' then
    return '';
  end if;
  for i in 1..char_length(raw) loop
    ch := substr(raw, i, 1);
    cp := public.utf8_first_codepoint(ch);
    if cp between 44032 and 55203 then
      cho_idx := (cp - 44032) / 588;
      if cho_idx between 0 and 18 then
        result := result || chosung[cho_idx + 1];
      end if;
    elsif (ch ~ '[a-zA-Z0-9]') then
      lower_ascii := lower_ascii || lower(ch);
    end if;
  end loop;
  return trim(both ' ' from (result || ' ' || lower_ascii || ' ' || lower(raw)));
end;
$$;

create or replace function public.trg_profiles_set_admin_search()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.admin_search := public.profile_compute_admin_search(new.display_name);
  return new;
end;
$$;
