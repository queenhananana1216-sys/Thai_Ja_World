-- =============================================================================
-- board_posts: 서버(Vercel) 전용 — PostgREST 테이블 INSERT/UPDATE 캐시 이슈 우회
-- service_role 만 EXECUTE (JWT 검증은 앱 API에서 수행 후 호출)
-- =============================================================================

create or replace function public.board_posts_insert_for_service(
  p_user_id uuid,
  p_board_type text,
  p_title text,
  p_content text,
  p_image_urls text[],
  p_lat double precision,
  p_lng double precision,
  p_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_board_type is null or p_board_type not in ('free', 'info') then
    raise exception 'invalid_board_type';
  end if;
  if p_title is null or length(trim(p_title)) < 1 or length(trim(p_title)) > 200 then
    raise exception 'invalid_title';
  end if;
  if (p_lat is null) is distinct from (p_lng is null) then
    raise exception 'lat_lng_pair_required';
  end if;

  insert into public.board_posts (
    user_id,
    board_type,
    title,
    content,
    image_urls,
    lat,
    lng,
    address
  )
  values (
    p_user_id,
    p_board_type,
    trim(p_title),
    coalesce(p_content, ''),
    coalesce(p_image_urls, '{}'::text[]),
    p_lat,
    p_lng,
    p_address
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.board_posts_update_for_service(
  p_post_id uuid,
  p_user_id uuid,
  p_title text,
  p_content text,
  p_image_urls text[],
  p_lat double precision,
  p_lng double precision,
  p_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_title is null or length(trim(p_title)) < 1 or length(trim(p_title)) > 200 then
    raise exception 'invalid_title';
  end if;
  if (p_lat is null) is distinct from (p_lng is null) then
    raise exception 'lat_lng_pair_required';
  end if;

  update public.board_posts
  set
    title = trim(p_title),
    content = coalesce(p_content, ''),
    image_urls = coalesce(p_image_urls, '{}'::text[]),
    lat = p_lat,
    lng = p_lng,
    address = p_address
  where id = p_post_id
    and user_id = p_user_id
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.board_posts_delete_for_service(
  p_post_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  delete from public.board_posts
  where id = p_post_id
    and user_id = p_user_id
  returning id into v_id;

  return v_id is not null;
end;
$$;

alter function public.board_posts_insert_for_service(uuid, text, text, text, text[], double precision, double precision, text) owner to postgres;
alter function public.board_posts_update_for_service(uuid, uuid, text, text, text[], double precision, double precision, text) owner to postgres;
alter function public.board_posts_delete_for_service(uuid, uuid) owner to postgres;

revoke all on function public.board_posts_insert_for_service(uuid, text, text, text, text[], double precision, double precision, text) from public;
revoke all on function public.board_posts_update_for_service(uuid, uuid, text, text, text[], double precision, double precision, text) from public;
revoke all on function public.board_posts_delete_for_service(uuid, uuid) from public;

grant execute on function public.board_posts_insert_for_service(uuid, text, text, text, text[], double precision, double precision, text) to service_role;
grant execute on function public.board_posts_update_for_service(uuid, uuid, text, text, text[], double precision, double precision, text) to service_role;
grant execute on function public.board_posts_delete_for_service(uuid, uuid) to service_role;

notify pgrst, 'reload_schema';
