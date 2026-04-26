-- =============================================================================
-- 055_bestvip77_portal — 광고 포털 bestvip77 (공개 읽기 / 관리자 쓰기 / 댓글은 본인)
-- 앱: 02_Workspace/bestvip77
-- 관리자 등록: insert into public.bestvip77_admins (user_id) values ('<auth.users.id>');
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 사이트 설정 (단일 행 JSON — 문구·링크·배너 등 관리자만 수정)
-- ---------------------------------------------------------------------------
create table if not exists public.bestvip77_site_settings (
  id int primary key default 1,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint bestvip77_site_settings_singleton check (id = 1)
);

comment on table public.bestvip77_site_settings is
  'bestvip77 포털 공개 설정. content 구조는 앱 타입 PortalSiteContent 참고.';

-- ---------------------------------------------------------------------------
-- 광고 카드(피드)
-- ---------------------------------------------------------------------------
create table if not exists public.bestvip77_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  price_info text not null default '',
  is_pinned boolean not null default false,
  profile_image_url text not null default '',
  gallery_image_urls text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bestvip77_posts_sort_idx on public.bestvip77_posts (sort_order desc, created_at desc);

-- ---------------------------------------------------------------------------
-- 댓글 (로그인 사용자, 본인만 수정·삭제)
-- ---------------------------------------------------------------------------
create table if not exists public.bestvip77_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.bestvip77_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bestvip77_comments_len check (char_length(content) between 1 and 2000)
);

create index if not exists bestvip77_comments_post_idx on public.bestvip77_comments (post_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 관리자 (auth.users.id)
-- ---------------------------------------------------------------------------
create table if not exists public.bestvip77_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 관리자 판별 (RLS용)
-- ---------------------------------------------------------------------------
create or replace function public.bestvip77_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.bestvip77_admins a
      where a.user_id = (select auth.uid())
    ),
    false
  );
$$;

comment on function public.bestvip77_is_admin() is
  'bestvip77 관리자 여부. RLS 정책에서 사용.';

grant execute on function public.bestvip77_is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.bestvip77_site_settings enable row level security;
alter table public.bestvip77_posts enable row level security;
alter table public.bestvip77_comments enable row level security;
alter table public.bestvip77_admins enable row level security;

-- site_settings: 공개 읽기, 관리자만 쓰기
drop policy if exists "bestvip77_site_settings_select" on public.bestvip77_site_settings;
create policy "bestvip77_site_settings_select"
  on public.bestvip77_site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "bestvip77_site_settings_write_admin" on public.bestvip77_site_settings;
create policy "bestvip77_site_settings_write_admin"
  on public.bestvip77_site_settings for all
  to authenticated
  using (public.bestvip77_is_admin())
  with check (public.bestvip77_is_admin());

-- posts: 공개 읽기, 관리자만 쓰기
drop policy if exists "bestvip77_posts_select" on public.bestvip77_posts;
create policy "bestvip77_posts_select"
  on public.bestvip77_posts for select
  to anon, authenticated
  using (true);

drop policy if exists "bestvip77_posts_write_admin" on public.bestvip77_posts;
create policy "bestvip77_posts_write_admin"
  on public.bestvip77_posts for all
  to authenticated
  using (public.bestvip77_is_admin())
  with check (public.bestvip77_is_admin());

-- comments: 공개 읽기, 로그인 작성(본인 user_id), 본인만 수정·삭제
drop policy if exists "bestvip77_comments_select" on public.bestvip77_comments;
create policy "bestvip77_comments_select"
  on public.bestvip77_comments for select
  to anon, authenticated
  using (true);

drop policy if exists "bestvip77_comments_insert_own" on public.bestvip77_comments;
create policy "bestvip77_comments_insert_own"
  on public.bestvip77_comments for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "bestvip77_comments_update_own" on public.bestvip77_comments;
create policy "bestvip77_comments_update_own"
  on public.bestvip77_comments for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "bestvip77_comments_delete_own" on public.bestvip77_comments;
create policy "bestvip77_comments_delete_own"
  on public.bestvip77_comments for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- admins: 본인 행만 읽기(관리 여부 확인), 쓰기는 DB에서만(또는 service_role)
drop policy if exists "bestvip77_admins_select_self" on public.bestvip77_admins;
create policy "bestvip77_admins_select_self"
  on public.bestvip77_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 기본 설정 행 (문구는 관리자 화면에서 수정)
-- ---------------------------------------------------------------------------
insert into public.bestvip77_site_settings (id, content)
values (
  1,
  '{
    "siteName": "bestvip77",
    "header": {
      "registerLabel": "註冊",
      "loginLabel": "登入",
      "logoutLabel": "登出",
      "showSearchIcon": true
    },
    "topBanner": {
      "imageUrl": "",
      "linkUrl": "",
      "alt": ""
    },
    "hero": {
      "eyebrow": "最新網址發布",
      "mainBrand": "bestvip77",
      "versionBubbles": []
    },
    "urlStrip": {
      "heading": "快捷入口",
      "items": []
    },
    "telegram": {
      "title": "官方 Telegram",
      "body": "取得最新網址與公告。",
      "ctaLabel": "加入頻道",
      "ctaHref": "https://t.me"
    },
    "adCta": {
      "title": "廣告發布",
      "body": "需要刊登廣告？點擊下方由專人協助。",
      "buttonLabel": "立即聯繫",
      "buttonHref": "https://example.com"
    },
    "feed": {
      "title": "合作商家",
      "subtitle": "後台「광고 카드」可編輯圖片與文案。"
    }
  }'::jsonb
)
on conflict (id) do nothing;
