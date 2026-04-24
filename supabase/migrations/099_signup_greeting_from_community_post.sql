-- =============================================================================
-- 099_signup_greeting_from_community_post.sql
-- 가입인사(말머리 intro) 게시글 1회 성공 시 미니홤과 동일한 1회 보상 경로
-- (dotori_events.signup_greeting + style_score_total + signup_greeting_done)
-- 서비스 롤로만 RPC 호출 — 본인 글·말머리·승인 상태 검증
-- =============================================================================

create or replace function public.apply_signup_greeting_from_community_post(
  p_post_id uuid,
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bonus int := 150;
  p record;
  done boolean;
  has_event boolean;
begin
  if p_post_id is null or p_profile_id is null then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_INPUT');
  end if;

  select
    id,
    author_id,
    category,
    moderation_status
  into p
  from public.posts
  where id = p_post_id;

  if p.id is null then
    return jsonb_build_object('ok', false, 'reason', 'POST_NOT_FOUND');
  end if;

  if p.author_id is distinct from p_profile_id then
    return jsonb_build_object('ok', false, 'reason', 'NOT_POST_OWNER');
  end if;

  if p.category is distinct from 'intro' then
    return jsonb_build_object('ok', false, 'reason', 'NOT_INTRO_CATEGORY');
  end if;

  if p.moderation_status is distinct from 'safe' then
    return jsonb_build_object('ok', false, 'reason', 'POST_NOT_SAFE');
  end if;

  select coalesce(pr.signup_greeting_done, false) into done
  from public.profiles pr
  where pr.id = p_profile_id;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'PROFILE_NOT_FOUND');
  end if;

  if done then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_DONE');
  end if;

  select exists(
    select 1 from public.dotori_events de
    where de.profile_id = p_profile_id
      and de.event_type = 'signup_greeting'
  ) into has_event;

  if has_event then
    perform set_config('app.profile_style_guard_bypass', '1', true);
    update public.profiles
    set signup_greeting_done = true
    where id = p_profile_id;
    return jsonb_build_object('ok', false, 'reason', 'SIGNUP_GREETING_ALREADY_RECORDED');
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  insert into public.dotori_events (profile_id, event_type, amount)
  values (p_profile_id, 'signup_greeting', bonus);

  update public.profiles
  set
    style_score_total = style_score_total + bonus,
    signup_greeting_done = true
  where id = p_profile_id;

  return jsonb_build_object('ok', true, 'points_granted', bonus);
end;
$$;

comment on function public.apply_signup_greeting_from_community_post(uuid, uuid) is
  'Service role: award one-time signup greeting (dotori) when first intro post is approved.';

alter function public.apply_signup_greeting_from_community_post(uuid, uuid) owner to postgres;

grant execute on function public.apply_signup_greeting_from_community_post(uuid, uuid) to service_role;
