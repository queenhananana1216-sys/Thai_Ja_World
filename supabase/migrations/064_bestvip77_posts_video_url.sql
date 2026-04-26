-- =============================================================================
-- 064_bestvip77_posts_video_url
-- 앱: 02_Workspace/bestvip77
-- =============================================================================

alter table public.bestvip77_posts
  add column if not exists video_url text;

comment on column public.bestvip77_posts.video_url is
  '광고 카드 상세 페이지에 표시될 영상(유튜브 쇼츠 등) URL.';
