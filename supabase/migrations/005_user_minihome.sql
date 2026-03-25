-- =============================================================================
-- 005_user_minihome — 회원 미니홈 피 (1차: 공간 확보 + 일촌평·사진첩 스키마만, 쓰기 차단)
-- =============================================================================
-- - user_minihomes: profiles 1:1, 공개 slug, 테마·타이틀 (본인만 수정)
-- - minihome_guestbook_entries / minihome_photo_albums / minihome_photos:
--     읽기 정책만 준비, INSERT·UPDATE·DELETE 정책 없음 → 클라이언트 쓰기 불가
--   (오픈 시 마이그레이션으로 정책·트리거 추가)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_minihomes — 이용자 개인 미니홈 껍데기
-- -----------------------------------------------------------------------------
create table if not exists public.user_minihomes (
  owner_id    uuid primary key references public.profiles (id) on delete cascade,
  public_slug text not null,
  title       text,
  tagline     text,
  theme       jsonb not null default '{}',
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint user_minihomes_public_slug_len check (char_length(public_slug) >= 4 and char_length(public_slug) <= 40),
  constraint user_minihomes_public_slug_format check (
    public_slug ~ '^[a-f0-9]{12}$'
    or public_slug ~ '^[a-z0-9][a-z0-9_-]{2,38}[a-z0-9]$'
  )
);

-- slug: 초기엔 짧은 랜덤(알파벳 소문자+숫자 12자). 이후 사용자 커스텀 허용 시 앱에서 검증·변경.
create unique index if not exists idx_user_minihomes_public_slug
  on public.user_minihomes (public_slug);

comment on table public.user_minihomes is '회원 1:1 미니홈. 1차 출시: 본인 공간·기본 메타만, 일촌평/사진첩은 별도 테이블(쓰기 RLS 미부여).';

create trigger trg_user_minihomes_updated_at
  before update on public.user_minihomes
  for each row execute function public.set_updated_at();

-- 신규 가입 시 프로필 행 생성 직후 미니홈 행 자동 생성
create or replace function public.ensure_minihome_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  tries int := 0;
begin
  loop
    candidate := substring(encode(gen_random_bytes(9), 'hex') from 1 for 12);
    begin
      insert into public.user_minihomes (owner_id, public_slug, title)
      values (
        new.id,
        candidate,
        coalesce(new.display_name, '미니홈') || '님의 공간'
      );
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 8 then
        raise;
      end if;
    end;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_profiles_ensure_minihome on public.profiles;
create trigger trg_profiles_ensure_minihome
  after insert on public.profiles
  for each row execute function public.ensure_minihome_for_profile();

-- 기존 회원 백필 (이미 미니홈 있으면 스킵)
insert into public.user_minihomes (owner_id, public_slug, title)
select
  p.id,
  substring(encode(gen_random_bytes(9), 'hex') from 1 for 12),
  coalesce(p.display_name, '회원') || '님의 공간'
from public.profiles p
where not exists (select 1 from public.user_minihomes m where m.owner_id = p.id);

-- slug 유일성 보장 (백필 중 충돌 시 — 극히 드묾 — 수동 재시도)
-- 충돌 나면: update user_minihomes set public_slug = substring(...) where owner_id = ...

-- -----------------------------------------------------------------------------
-- 일촌평 (추후 오픈) — 지금은 쓰기 정책 없음
-- -----------------------------------------------------------------------------
create table if not exists public.minihome_guestbook_entries (
  id                 uuid primary key default gen_random_uuid(),
  minihome_owner_id  uuid not null references public.user_minihomes (owner_id) on delete cascade,
  author_id          uuid not null references public.profiles (id) on delete cascade,
  body               text not null,
  is_hidden          boolean not null default false,
  created_at         timestamptz not null default now(),
  constraint minihome_guestbook_body_len check (char_length(body) <= 2000)
);

create index if not exists idx_minihome_guestbook_owner
  on public.minihome_guestbook_entries (minihome_owner_id, created_at desc);

create index if not exists idx_minihome_guestbook_author
  on public.minihome_guestbook_entries (author_id);

comment on table public.minihome_guestbook_entries is '일촌평(방명록). 1차 출시: RLS 쓰기 미허용 — 오픈 시 insert 정책 추가.';

-- -----------------------------------------------------------------------------
-- 사진첩 (추후 오픈) — 지금은 쓰기 정책 없음
-- -----------------------------------------------------------------------------
create table if not exists public.minihome_photo_albums (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.user_minihomes (owner_id) on delete cascade,
  title       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_minihome_albums_owner
  on public.minihome_photo_albums (owner_id, sort_order);

create trigger trg_minihome_photo_albums_updated_at
  before update on public.minihome_photo_albums
  for each row execute function public.set_updated_at();

create table if not exists public.minihome_photos (
  id            uuid primary key default gen_random_uuid(),
  album_id      uuid not null references public.minihome_photo_albums (id) on delete cascade,
  storage_path  text not null,
  caption       text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_minihome_photos_album
  on public.minihome_photos (album_id, sort_order);

comment on table public.minihome_photo_albums is '미니홈 사진첩. 1차 출시: 앱/RLS 쓰기 없음.';
comment on table public.minihome_photos is '스토리지 경로만 보관. 버킷·업로드는 오픈 시 연동.';

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.user_minihomes enable row level security;
alter table public.minihome_guestbook_entries enable row level security;
alter table public.minihome_photo_albums enable row level security;
alter table public.minihome_photos enable row level security;

-- 미니홈: 공개 프로필이면 누구나 읽기, 비공개면 본인만
drop policy if exists user_minihomes_select on public.user_minihomes;
create policy user_minihomes_select on public.user_minihomes
  for select using (is_public = true or auth.uid() = owner_id);

drop policy if exists user_minihomes_update_own on public.user_minihomes;
create policy user_minihomes_update_own on public.user_minihomes
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- insert는 트리거(security definer)로만 — 클라이언트 직접 insert 불가
-- service role은 RLS 우회

-- 일촌평: 공개 미니홈이면 열람(숨김 제외). 쓰기 정책 의도적 부재.
drop policy if exists minihome_guestbook_select on public.minihome_guestbook_entries;
create policy minihome_guestbook_select on public.minihome_guestbook_entries
  for select using (
    exists (
      select 1 from public.user_minihomes h
      where h.owner_id = minihome_guestbook_entries.minihome_owner_id
        and (h.is_public = true or auth.uid() = h.owner_id)
    )
    and (is_hidden = false or auth.uid() = minihome_owner_id)
  );

-- 사진첩·사진: 공개 미니홈 소유 앨범만 열람 (본인은 전체)
drop policy if exists minihome_albums_select on public.minihome_photo_albums;
create policy minihome_albums_select on public.minihome_photo_albums
  for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.user_minihomes h
      where h.owner_id = minihome_photo_albums.owner_id
        and h.is_public = true
    )
  );

drop policy if exists minihome_photos_select on public.minihome_photos;
create policy minihome_photos_select on public.minihome_photos
  for select using (
    exists (
      select 1 from public.minihome_photo_albums a
      join public.user_minihomes h on h.owner_id = a.owner_id
      where a.id = minihome_photos.album_id
        and (h.is_public = true or auth.uid() = h.owner_id)
    )
  );

-- (향후) insert/update/delete policies 추가 위치
