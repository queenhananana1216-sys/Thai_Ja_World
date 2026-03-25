-- processed_news: 관리자 승인 전 초안(draft) 구분
-- NEWS_PUBLISH_MODE=manual 일 때 LLM 삽입은 published=false, 홈·푸시는 published=true 만 사용

alter table public.processed_news
  add column if not exists published boolean not null default true;

comment on column public.processed_news.published is
  'true: 홈·뉴스 상세·푸시 노출. false: 자동 번역·요약만 저장된 초안(관리자 승인 대기).';
