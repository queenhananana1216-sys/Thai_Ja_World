-- 미니홈 AI 꾸미기 파이프라인: 스킨·BGM·미니미 카탈로그 + 태그 기반 분위기 매칭
-- PostgREST: NOTIFY pgrst, 'reload_schema';
--
-- 태그(tag) 컨벤션 (AI·앱 공통):
--   atmosphere_* 생략하고 그대로 사용: modern, traditional, lively, calm, retro, neon, cozy, premium, minimal
--   컨텍스트: cafe, korean_food, bbq, street_food, night_shop, family_friendly, youth

do $$
begin
  if not exists (select 1 from pg_type where typname = 'decoration_asset_type') then
    create type public.decoration_asset_type as enum (
      'skin_basic',
      'skin_special',
      'bgm',
      'minime'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'decoration_audio_source') then
    create type public.decoration_audio_source as enum (
      'ncs',
      'youtube_audio_library',
      'internal',
      'unknown'
    );
  end if;
end$$;

create table if not exists public.decoration_assets (
  id uuid primary key default gen_random_uuid(),
  type public.decoration_asset_type not null,
  name text not null
    check (char_length(trim(name)) >= 1 and char_length(name) <= 200),
  asset_url text
    check (asset_url is null or char_length(asset_url) <= 2048),
  color_code text
    check (color_code is null or char_length(trim(color_code)) >= 1 and char_length(color_code) <= 120),
  tags text[] not null default '{}'::text[],
  audio_embed_url text
    check (audio_embed_url is null or char_length(audio_embed_url) <= 2048),
  audio_source public.decoration_audio_source,
  license_note text
    check (license_note is null or char_length(license_note) <= 500),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decoration_assets_payload_ck check (
    (
      asset_url is not null
      and trim(asset_url) <> ''
    )
    or (
      color_code is not null
      and trim(color_code) <> ''
    )
    or (
      audio_embed_url is not null
      and trim(audio_embed_url) <> ''
    )
  ),
  constraint decoration_assets_bgm_embed_ck check (
    type <> 'bgm'
    or (
      audio_embed_url is not null
      and trim(audio_embed_url) <> ''
    )
  )
);

comment on table public.decoration_assets is
  '미니홈 꾸미기 카탈로그(스킨·BGM·미니미). tags로 매장 분위기·업종과 매칭; BGM은 audio_embed_url에 YouTube embed 등 무저작권 소스 URL.';

comment on column public.decoration_assets.asset_url is
  '스킨 텍스처·미니미 스프라이트 등 HTTPS URL. BGM은 주로 audio_embed_url 사용.';

comment on column public.decoration_assets.color_code is
  'CSS 색 토큰·HEX 등 (#rrggbb 또는 var(--token)). 스킨 단색·포인트 컬러.';

comment on column public.decoration_assets.tags is
  '분위기·업종 키워드 배열. 예: modern, traditional, lively, calm, korean_food, cafe — AI 매칭·필터용.';

comment on column public.decoration_assets.audio_embed_url is
  'BGM: iframe src용 embed URL (예: https://www.youtube.com/embed/VIDEO_ID). 저작권 출처는 audio_source·license_note.';

comment on column public.decoration_assets.audio_source is
  '오디오 출처 분류 (NCS, 유튜브 오디오 라이브러리 등).';

create index if not exists decoration_assets_type_active_idx
  on public.decoration_assets (type, is_active, sort_order);

create index if not exists decoration_assets_tags_gin_idx
  on public.decoration_assets using gin (tags);

alter table public.decoration_assets enable row level security;

drop policy if exists decoration_assets_select_public on public.decoration_assets;
create policy decoration_assets_select_public
  on public.decoration_assets
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists decoration_assets_no_insert on public.decoration_assets;
create policy decoration_assets_no_insert
  on public.decoration_assets
  for insert
  to anon, authenticated
  with check (false);

drop policy if exists decoration_assets_no_update on public.decoration_assets;
create policy decoration_assets_no_update
  on public.decoration_assets
  for update
  to anon, authenticated
  using (false);

drop policy if exists decoration_assets_no_delete on public.decoration_assets;
create policy decoration_assets_no_delete
  on public.decoration_assets
  for delete
  to anon, authenticated
  using (false);

grant select on public.decoration_assets to anon, authenticated;

drop trigger if exists trg_decoration_assets_updated_at on public.decoration_assets;
create trigger trg_decoration_assets_updated_at
  before update on public.decoration_assets
  for each row
  execute function public.set_updated_at();

-- Seed: 기본·스페셜 스킨, BGM(NCS 공식 채널 embed), 미니미 플레이스홀더 (10건 이상)
insert into public.decoration_assets (
  type, name, asset_url, color_code, tags,
  audio_embed_url, audio_source, license_note, sort_order
) values
  (
    'skin_basic',
    'Basic Dark',
    null,
    '#0f0f12',
    array['modern', 'calm', 'minimal', 'night_shop', 'premium']::text[],
    null,
    null,
    null,
    10
  ),
  (
    'skin_basic',
    'Basic Amber',
    null,
    '#f59e0b',
    array['warm', 'traditional', 'cozy', 'korean_food', 'family_friendly']::text[],
    null,
    null,
    null,
    11
  ),
  (
    'skin_basic',
    'Basic Light',
    null,
    '#fafafa',
    array['modern', 'calm', 'minimal', 'cafe', 'clean']::text[],
    null,
    null,
    null,
    12
  ),
  (
    'skin_basic',
    'Basic Ocean',
    null,
    '#0ea5e9',
    array['modern', 'calm', 'cafe', 'youth']::text[],
    null,
    null,
    null,
    13
  ),
  (
    'skin_special',
    'Wood Tone',
    null,
    '#5c4033',
    array['traditional', 'cozy', 'korean_food', 'warm', 'family_friendly']::text[],
    null,
    null,
    null,
    20
  ),
  (
    'skin_special',
    'Neon Night',
    null,
    '#22d3ee',
    array['neon', 'lively', 'youth', 'night_shop', 'modern']::text[],
    null,
    null,
    null,
    21
  ),
  (
    'skin_special',
    'Pastel Soft',
    null,
    '#fbcfe8',
    array['calm', 'cafe', 'youth', 'modern', 'family_friendly']::text[],
    null,
    null,
    null,
    22
  ),
  (
    'skin_special',
    'Charcoal BBQ',
    null,
    '#292524',
    array['korean_food', 'bbq', 'warm', 'traditional', 'lively']::text[],
    null,
    null,
    null,
    23
  ),
  (
    'bgm',
    'Calm Cafe (Chill NCS)',
    null,
    null,
    array['calm', 'cafe', 'acoustic', 'modern', 'minimal']::text[],
    'https://www.youtube.com/embed/jK2aIUmmdP4',
    'ncs',
    'NoCopyrightSounds — 채널 안내에 따라 크레딧 표기 후 사용.',
    30
  ),
  (
    'bgm',
    'Upbeat Pop (Energy)',
    null,
    null,
    array['lively', 'modern', 'youth', 'street_food']::text[],
    'https://www.youtube.com/embed/I62KbVk0Pgc',
    'ncs',
    'NoCopyrightSounds — 채널 안내에 따라 크레딧 표기 후 사용.',
    31
  ),
  (
    'bgm',
    'Traditional Calm',
    null,
    null,
    array['traditional', 'calm', 'korean_food', 'family_friendly']::text[],
    'https://www.youtube.com/embed/AOeY-nDp7hI',
    'ncs',
    'NoCopyrightSounds — 채널 안내에 따라 크레딧 표기 후 사용.',
    32
  ),
  (
    'bgm',
    'Late Night Shop',
    null,
    null,
    array['night_shop', 'calm', 'minimal', 'premium']::text[],
    'https://www.youtube.com/embed/7k_EPcvGOtU',
    'youtube_audio_library',
    '유튜브 스튜디오 오디오 라이브러리 정책에 맞는 트랙으로 embed 교체 권장 (현재 행은 플레이스홀더 URL).',
    33
  ),
  (
    'minime',
    'Default Avatar',
    'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_128.png',
    null,
    array['modern', 'neutral', 'family_friendly']::text[],
    null,
    null,
    'Pixabay 라이선스 확인 후 서비스 도메인 에셋으로 교체 권장.',
    40
  ),
  (
    'minime',
    'Friendly Chef',
    'https://cdn.pixabay.com/photo/2022/01/21/01/46/icon-6956727_128.png',
    null,
    array['korean_food', 'lively', 'family_friendly', 'warm']::text[],
    null,
    null,
    'Pixabay 라이선스 확인 후 서비스 도메인 에셋으로 교체 권장.',
    41
  ),
  (
    'minime',
    'Street Food Buddy',
    'https://cdn.pixabay.com/photo/2017/01/31/17/33/cooking-2024691_128.png',
    null,
    array['street_food', 'lively', 'youth', 'modern']::text[],
    null,
    null,
    'Pixabay 라이선스 확인 후 서비스 도메인 에셋으로 교체 권장.',
    42
  );

notify pgrst, 'reload_schema';
