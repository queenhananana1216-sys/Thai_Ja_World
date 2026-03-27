-- =============================================================================
-- 태자 월드 (thai_ja_world) — v2 초기 스키마 (빈 프로젝트용)
-- =============================================================================
-- 사용법:
--   1) Supabase에서 새 프로젝트 생성 (또는 기존 DB를 비운 뒤 — 프로덕션 데이터 전부 삭제 주의)
--   2) SQL Editor에 이 파일 전체 붙여넣기 → Run
--   3) Authentication → Providers → Email → "Confirm email" 켜기
--   4) 캡챠(Cloudflare Turnstile / reCAPTCHA v3 등)는 DB가 아니라 Next 앱에서
--      signUp 직전에 토큰 검증 후에만 supabase.auth.signUp 호출하도록 구현
-- =============================================================================

-- 확장 (UUID)
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 공통: updated_at 트리거
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — auth.users 1:1 (회원가입 후 트리거로 자동 생성)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text,
  avatar_url        text,
  locale            text not null default 'ko',
  style_score_total integer not null default 0,
  banned_until      timestamptz,
  ban_reason        text,
  moderation_strikes integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_profiles_style_score on public.profiles (style_score_total desc);

create index if not exists idx_profiles_banned_until on public.profiles (banned_until)
  where banned_until is not null;

create or replace function public.protect_profile_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if auth.uid() is null then
    return new;
  end if;
  if new.banned_until is distinct from old.banned_until
     or new.ban_reason is distinct from old.ban_reason
     or new.moderation_strikes is distinct from old.moderation_strikes then
    raise exception 'moderation fields are system-managed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_moderation on public.profiles;
create trigger trg_profiles_protect_moderation
  before update on public.profiles
  for each row execute function public.protect_profile_moderation_fields();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 가입 시 프로필 행 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- plazas — 지역/광장(구획)
-- -----------------------------------------------------------------------------
create table if not exists public.plazas (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_plazas_updated_at
  before update on public.plazas
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- posts — 커뮤니티 게시글 (구 CommunityPost 대체)
-- -----------------------------------------------------------------------------
create table if not exists public.posts (
  id                 uuid primary key default gen_random_uuid(),
  author_id          uuid not null references public.profiles (id) on delete cascade,
  plaza_id           uuid references public.plazas (id) on delete set null,
  category           text not null,
  title              varchar(200) not null,
  content            text not null,
  image_urls         text[] not null default '{}',
  is_anonymous       boolean not null default false,
  moderation_status  text not null default 'safe'
    check (moderation_status in ('safe', 'pending', 'hidden', 'rejected')),
  severity           text,
  view_count         integer not null default 0,
  comment_count      integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_posts_created on public.posts (created_at desc);
create index if not exists idx_posts_plaza on public.posts (plaza_id);
create index if not exists idx_posts_author on public.posts (author_id);
create index if not exists idx_posts_category on public.posts (category);

create trigger trg_posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- comments — 댓글 (comment_count 정합성은 앱 또는 트리거로 맞춤)
-- -----------------------------------------------------------------------------
create table if not exists public.comments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  content       text not null,
  is_anonymous  boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_comments_post on public.comments (post_id, created_at);

-- 댓글 추가/삭제 시 posts.comment_count 유지 (간단 트리거)
create or replace function public.bump_post_comment_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_comments_count_ins on public.comments;
create trigger trg_comments_count_ins
  after insert on public.comments
  for each row execute function public.bump_post_comment_count();

drop trigger if exists trg_comments_count_del on public.comments;
create trigger trg_comments_count_del
  after delete on public.comments
  for each row execute function public.bump_post_comment_count();

-- -----------------------------------------------------------------------------
-- local_businesses — 로컬 가게 (구 LocalBusiness 대체, snake_case)
-- -----------------------------------------------------------------------------
create table if not exists public.local_businesses (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references public.profiles (id) on delete set null,
  slug            text not null unique,
  name            varchar(200) not null,
  category        text not null,
  region          text not null default '방콕',
  address         text,
  price_range     text,
  description     text,
  discount        text,
  image_url       text,
  image_urls      text[] not null default '{}',
  emoji           text not null default '🏪',
  phone           text,
  line_id         text,
  kakao_id        text,
  map_url         text,
  tags            text[] not null default '{}',
  tier            text not null default 'basic'
    check (tier in ('premium', 'standard', 'basic')),
  is_recommended  boolean not null default false,
  has_discount    boolean not null default false,
  is_active       boolean not null default true,
  mini_home       jsonb not null default '{}',
  view_count      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_local_businesses_region on public.local_businesses (region);
create index if not exists idx_local_businesses_tier on public.local_businesses (tier);
create index if not exists idx_local_businesses_active on public.local_businesses (is_active) where is_active = true;

create trigger trg_local_businesses_updated_at
  before update on public.local_businesses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- shop_announcements — 가게 공지 / 오늘 소진 / 특별 메뉴 등
-- -----------------------------------------------------------------------------
create table if not exists public.shop_announcements (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.local_businesses (id) on delete cascade,
  kind         text not null check (kind in ('notice', 'special_menu', 'hours', 'other')),
  title        text,
  body         text not null,
  starts_at    timestamptz,
  ends_at      timestamptz,
  is_pinned    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_shop_announcements_business on public.shop_announcements (business_id, created_at desc);

create trigger trg_shop_announcements_updated_at
  before update on public.shop_announcements
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- reports — 신고 (게시글/가게/댓글 등)
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles (id) on delete cascade,
  target_type   text not null check (target_type in ('post', 'comment', 'business', 'profile', 'other')),
  target_id     text not null,
  reason        text not null,
  status        text not null default 'open' check (status in ('open', 'reviewing', 'closed', 'dismissed')),
  created_at    timestamptz not null default now()
);

create index if not exists idx_reports_status on public.reports (status, created_at desc);

-- -----------------------------------------------------------------------------
-- 뉴스 파이프라인 (봇 연동용)
-- -----------------------------------------------------------------------------
create table if not exists public.news_sources (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  feed_url   text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.raw_news (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid references public.news_sources (id) on delete set null,
  external_url  text not null unique,
  title         text not null,
  raw_body      text,
  published_at  timestamptz,
  fetched_at    timestamptz not null default now()
);

create index if not exists idx_raw_news_fetched on public.raw_news (fetched_at desc);

create table if not exists public.processed_news (
  id           uuid primary key default gen_random_uuid(),
  raw_news_id  uuid not null references public.raw_news (id) on delete cascade,
  clean_body   text,
  language     text default 'ko',
  created_at   timestamptz not null default now()
);

create table if not exists public.summaries (
  id                 uuid primary key default gen_random_uuid(),
  processed_news_id  uuid not null references public.processed_news (id) on delete cascade,
  summary_text       text not null,
  model              text,
  created_at         timestamptz not null default now()
);

create table if not exists public.publish_logs (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id   uuid not null,
  channel     text not null default 'web',
  published_at timestamptz not null default now(),
  meta        jsonb not null default '{}'
);

-- -----------------------------------------------------------------------------
-- bot_actions — 봇 실행 로그 (기존 마이그레이션과 동일 개념)
-- -----------------------------------------------------------------------------
create table if not exists public.bot_actions (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null,
  bot_name         text not null,
  action_type      text not null
    check (action_type in ('collect_data', 'analyze', 'publish', 'alert', 'heal')),
  objective        text not null,
  target_entity    text,
  target_id        text,
  status           text not null
    check (status in ('queued', 'running', 'success', 'failed', 'skipped')),
  priority         integer not null default 3,
  input_payload    jsonb not null default '{}',
  output_payload   jsonb not null default '{}',
  metrics_before   jsonb not null default '{}',
  metrics_after    jsonb not null default '{}',
  error_code       text,
  error_message    text,
  retry_count      integer not null default 0,
  started_at       timestamptz,
  finished_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_bot_actions_bot_name_created
  on public.bot_actions (bot_name, created_at desc);
create index if not exists idx_bot_actions_run_id on public.bot_actions (run_id);

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.plazas enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.local_businesses enable row level security;
alter table public.shop_announcements enable row level security;
alter table public.reports enable row level security;
alter table public.news_sources enable row level security;
alter table public.raw_news enable row level security;
alter table public.processed_news enable row level security;
alter table public.summaries enable row level security;
alter table public.publish_logs enable row level security;
alter table public.bot_actions enable row level security;

-- bot_actions: 서버 봇 로그 — PostgREST anon/authenticated 명시 차단 (lint 0008, service_role 은 RLS 우회)
drop policy if exists bot_actions_no_client_access on public.bot_actions;
create policy bot_actions_no_client_access on public.bot_actions
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- profiles: 누구나 읽기(공개 프로필) — 민감 필드 생기면 컬럼/뷰로 제한할 것
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles for select using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- plazas: 읽기 공개
drop policy if exists plazas_select_all on public.plazas;
create policy plazas_select_all on public.plazas for select using (true);

-- posts: 읽기 공개, 쓰기는 로그인 사용자 (본인 명의)
drop policy if exists posts_select_all on public.posts;
create policy posts_select_all on public.posts for select using (true);

drop policy if exists posts_insert_authenticated on public.posts;
-- 게시글 INSERT 는 service_role(API) 전용 — 클라이언트는 /api/community/posts

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
  for delete using (auth.uid() = author_id);

-- comments
drop policy if exists comments_select_all on public.comments;
create policy comments_select_all on public.comments for select using (true);

drop policy if exists comments_insert_authenticated on public.comments;
create policy comments_insert_authenticated on public.comments
  for insert with check (
    auth.uid() = author_id
    and not exists (
      select 1 from public.profiles p
      where p.id = author_id
        and p.banned_until is not null
        and p.banned_until > now()
    )
  );

drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete using (auth.uid() = author_id);

-- local_businesses: 읽기 공개; 쓰기는 이후 owner_id 정책으로 조이기 (현재는 service role로 시드 권장)
drop policy if exists businesses_select_all on public.local_businesses;
create policy businesses_select_all on public.local_businesses for select using (true);

drop policy if exists businesses_insert_owner on public.local_businesses;
create policy businesses_insert_owner on public.local_businesses
  for insert with check (auth.uid() = owner_id);

drop policy if exists businesses_update_owner on public.local_businesses;
create policy businesses_update_owner on public.local_businesses
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- shop_announcements: 가게 소유자만
drop policy if exists shop_ann_select_all on public.shop_announcements;
create policy shop_ann_select_all on public.shop_announcements for select using (true);

drop policy if exists shop_ann_write_owner on public.shop_announcements;
create policy shop_ann_write_owner on public.shop_announcements
  for all using (
    exists (
      select 1 from public.local_businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.local_businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- reports: 본인 신고만 조회·생성
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists reports_select_own on public.reports;
create policy reports_select_own on public.reports
  for select using (auth.uid() = reporter_id);

-- 뉴스·봇: 일반 사용자는 읽기만 (쓰기는 service_role)
drop policy if exists news_sources_select on public.news_sources;
create policy news_sources_select on public.news_sources for select using (true);

drop policy if exists raw_news_select on public.raw_news;
create policy raw_news_select on public.raw_news for select using (true);

drop policy if exists processed_news_select on public.processed_news;
create policy processed_news_select on public.processed_news for select using (true);

drop policy if exists summaries_select on public.summaries;
create policy summaries_select on public.summaries for select using (true);

drop policy if exists publish_logs_select on public.publish_logs;
create policy publish_logs_select on public.publish_logs for select using (true);

-- =============================================================================
-- 선택: 데모용 plaza 1개
-- =============================================================================
insert into public.plazas (slug, name, sort_order)
values ('bangkok', '방콕', 0)
on conflict (slug) do nothing;
