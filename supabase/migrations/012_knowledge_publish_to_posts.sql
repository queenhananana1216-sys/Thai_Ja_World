-- 012_knowledge_publish_to_posts.sql
-- processed_knowledge 초안을 publish/draft/delete 할 때 실제 커뮤니티 posts 로 연결하기 위한 post_id 필드 추가

alter table public.processed_knowledge
  add column if not exists post_id uuid references public.posts (id) on delete set null;

create index if not exists idx_processed_knowledge_post_id
  on public.processed_knowledge (post_id);

-- post_id는 1 processed_knowledge에만 매핑되도록(중복 publish 클릭 방지)
create unique index if not exists processed_knowledge_post_id_uniq
  on public.processed_knowledge (post_id)
  where post_id is not null;

