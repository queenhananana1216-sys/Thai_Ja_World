-- 업체/광고 카드 본문 (관리자에서 수정)
alter table public.bestvip77_posts
  add column if not exists body_text text not null default '';

comment on column public.bestvip77_posts.body_text is
  '광고 카드 소개 문구. 제목·가격 외 본문.';
