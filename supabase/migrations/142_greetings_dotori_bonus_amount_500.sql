-- =============================================================================
-- 142_greetings_dotori_bonus_amount_500.sql
-- 가입 인사 첫글 RPC 보상액을 500 도토리로 고정 (이전에 141이 5,000으로 적용된 DB 패치)
-- =============================================================================

create or replace function public.grant_greetings_board_open_dotori_bonus(
  p_profile_id uuid,
  p_post_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus int := 500;
begin
  if p_profile_id is null or p_post_id is null then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_INPUT');
  end if;

  perform 1
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'PROFILE_NOT_FOUND');
  end if;

  if exists (
    select 1
    from public.dotori_events
    where profile_id = p_profile_id
      and event_type = 'greetings_board_open_bonus'
  ) then
    return jsonb_build_object('ok', true, 'reason', 'ALREADY_GRANTED', 'amount', 0);
  end if;

  if not exists (
    select 1
    from public.posts
    where id = p_post_id
      and author_id = p_profile_id
      and category = 'greetings'
      and moderation_status = 'safe'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'POST_NOT_ELIGIBLE');
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  insert into public.dotori_events (profile_id, event_type, amount)
  values (p_profile_id, 'greetings_board_open_bonus', v_bonus);

  update public.profiles
  set style_score_total = style_score_total + v_bonus,
      dotori_balance = dotori_balance + v_bonus
  where id = p_profile_id;

  return jsonb_build_object('ok', true, 'reason', 'GRANTED', 'amount', v_bonus);
end;
$$;

alter function public.grant_greetings_board_open_dotori_bonus(uuid, uuid) owner to postgres;

grant execute on function public.grant_greetings_board_open_dotori_bonus(uuid, uuid) to service_role;

notify pgrst, 'reload_schema';
