-- 117_delete_processed_knowledge_placeholders
-- Remove stub rows; hide linked posts from hub. clean_body may be jsonb: cast to text.

begin;

update public.posts p
set
  moderation_status = 'hidden',
  is_knowledge_tip = false
where p.id in (
  select pk.post_id
  from public.processed_knowledge pk
  where pk.post_id is not null
    and pk.clean_body is not null
    and (
      (pk.clean_body)::text ilike '%내용 준비 중%'
      or (pk.clean_body)::text ilike '%가공 전%'
      or (pk.clean_body)::text ilike '%가공전%'
      or (pk.clean_body)::text ilike '%내용 준비중%'
    )
);

delete from public.processed_knowledge pk
where pk.clean_body is not null
  and (
    (pk.clean_body)::text ilike '%내용 준비 중%'
    or (pk.clean_body)::text ilike '%가공 전%'
    or (pk.clean_body)::text ilike '%가공전%'
    or (pk.clean_body)::text ilike '%내용 준비중%'
  );

commit;
