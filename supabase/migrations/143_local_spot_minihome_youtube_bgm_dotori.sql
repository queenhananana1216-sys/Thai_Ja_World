-- =============================================================================
-- 143_local_spot_minihome_youtube_bgm_dotori.sql
-- 로컬 미니홈 BGM(YouTube만): 변경 시 도토리 100 차감 + minihome_bgm_url 정규화
-- =============================================================================

create or replace function public.youtube_extract_video_id(p_url text)
returns text
language plpgsql
immutable
as $$
declare
  s text := trim(coalesce(p_url, ''));
begin
  if s = '' then
    return null;
  end if;

  if s ~* 'youtu\.be/' then
    return (regexp_match(s, 'youtu\.be/([A-Za-z0-9_-]{11})'))[1];
  end if;

  if s ~* 'youtube-nocookie\.com/embed/' then
    return (regexp_match(s, 'youtube-nocookie\.com/embed/([A-Za-z0-9_-]{11})'))[1];
  end if;

  if s ~* 'youtube\.com/embed/' then
    return (regexp_match(s, 'youtube\.com/embed/([A-Za-z0-9_-]{11})'))[1];
  end if;

  if s ~* 'youtube\.com/shorts/' then
    return (regexp_match(s, 'youtube\.com/shorts/([A-Za-z0-9_-]{11})'))[1];
  end if;

  if s ~* 'youtube\.com/live/' then
    return (regexp_match(s, 'youtube\.com/live/([A-Za-z0-9_-]{11})'))[1];
  end if;

  if s ~* 'youtube\.com/watch\?' then
    return (regexp_match(s, '[?&]v=([A-Za-z0-9_-]{11})'))[1];
  end if;

  return null;
end;
$$;

comment on function public.youtube_extract_video_id(text) is
  'YouTube watch/embed/shorts/live/youtu.be URL에서 11자 video id 추출 (실패 시 null).';

-- dotori_events.event_type 확장
do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'dotori_events'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%event_type%';
  if cname is not null then
    execute format('alter table public.dotori_events drop constraint %I', cname);
  end if;
end $$;

alter table public.dotori_events
  add constraint dotori_events_event_type_check check (event_type in (
    'daily_checkin',
    'write_post',
    'receive_like',
    'guestbook_write',
    'referral',
    'purchase',
    'signup_greeting',
    'admin_grant',
    'greetings_board_open_bonus',
    'local_minihome_bgm_youtube'
  ));

create or replace function public.local_spot_save_minihome_bgm_with_dotori(
  p_local_spot_id uuid,
  p_bgm_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_owner uuid;
  v_old text;
  v_new_raw text := nullif(trim(coalesce(p_bgm_url, '')), '');
  v_old_id text;
  v_new_id text;
  v_canonical text;
  v_charge boolean;
  v_cost int := 100;
  v_bal int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  end if;

  select ls.owner_profile_id, ls.minihome_bgm_url
  into v_owner, v_old
  from public.local_spots ls
  where ls.id = p_local_spot_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'SPOT_NOT_FOUND');
  end if;

  if v_owner is distinct from uid then
    return jsonb_build_object('ok', false, 'reason', 'FORBIDDEN');
  end if;

  v_old_id := public.youtube_extract_video_id(v_old);

  if v_new_raw is null then
    update public.local_spots
    set minihome_bgm_url = null
    where id = p_local_spot_id;

    select p.dotori_balance into v_bal
    from public.profiles p
    where p.id = uid;

    return jsonb_build_object(
      'ok', true,
      'charged', false,
      'bgm_url', null,
      'dotori_balance', coalesce(v_bal, 0)
    );
  end if;

  v_new_id := public.youtube_extract_video_id(v_new_raw);
  if v_new_id is null then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_YOUTUBE_URL');
  end if;

  v_canonical :=
    'https://www.youtube-nocookie.com/embed/'
    || v_new_id
    || '?enablejsapi=1&playsinline=1&loop=1&playlist='
    || v_new_id;

  v_charge := v_old_id is distinct from v_new_id;

  if v_charge then
    select p.dotori_balance into v_bal
    from public.profiles p
    where p.id = uid
    for update;

    if not found then
      return jsonb_build_object('ok', false, 'reason', 'PROFILE_NOT_FOUND');
    end if;

    if coalesce(v_bal, 0) < v_cost then
      return jsonb_build_object(
        'ok', false,
        'reason', 'INSUFFICIENT_DOTORI',
        'need', v_cost,
        'have', coalesce(v_bal, 0)
      );
    end if;

    perform set_config('app.profile_style_guard_bypass', '1', true);

    insert into public.dotori_events (profile_id, event_type, amount)
    values (uid, 'local_minihome_bgm_youtube', -v_cost);

    update public.profiles
    set
      dotori_balance = dotori_balance - v_cost,
      style_score_total = greatest(0, style_score_total - v_cost)
    where id = uid;
  end if;

  update public.local_spots
  set minihome_bgm_url = v_canonical
  where id = p_local_spot_id;

  select p.dotori_balance into v_bal
  from public.profiles p
  where p.id = uid;

  return jsonb_build_object(
    'ok', true,
    'charged', v_charge,
    'bgm_url', v_canonical,
    'dotori_balance', coalesce(v_bal, 0)
  );
end;
$$;

comment on function public.local_spot_save_minihome_bgm_with_dotori(uuid, text) is
  '소유자만: 미니홈 BGM을 YouTube embed URL로 저장. 다른 영상으로 바뀔 때 도토리 100 차감.';

alter function public.youtube_extract_video_id(text) owner to postgres;
alter function public.local_spot_save_minihome_bgm_with_dotori(uuid, text) owner to postgres;

grant execute on function public.local_spot_save_minihome_bgm_with_dotori(uuid, text) to authenticated;

notify pgrst, 'reload_schema';
