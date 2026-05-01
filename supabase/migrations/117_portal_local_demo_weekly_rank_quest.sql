-- =============================================================================
-- 117_portal_local_demo_weekly_rank_quest.sql
-- 포털 SSR: 로컬 데모 플래그, 주간 도토리 랭킹(공개), 첫 글 500 도토리 퀘스트 인스턴스 보장
-- =============================================================================

-- 1) local_businesses: 데모 노출용 플래그
alter table public.local_businesses
  add column if not exists is_demo boolean not null default false;

comment on column public.local_businesses.is_demo is
  'true 인 행은 실데이터가 비었을 때 포털 우측 로컬 위젯 데모 롤링에만 사용.';

-- 2) 데모 시드 (slug 고정 — 앱에서 /shop 슬러그와 맞추면 미니홈으로 직결)
insert into public.local_businesses (
  slug,
  name,
  category,
  region,
  description,
  emoji,
  tier,
  is_recommended,
  is_active,
  is_demo,
  mini_home
)
values (
  'bangkok-quick-bites',
  'Bangkok Quick Bites',
  'restaurant',
  'Bangkok',
  '태자월드 데모 로컬 맛집 — 포털이 비었을 때만 노출됩니다.',
  '🍜',
  'standard',
  true,
  true,
  true,
  jsonb_build_object(
    'portal_demo', true,
    'shop_minihome_slug', 'bangkok-quick-bites'
  )
)
on conflict (slug) do update
  set
    is_demo = true,
    is_active = true,
    name = excluded.name,
    description = excluded.description,
    mini_home = excluded.mini_home;

-- 3) 주간 도토리 획득 랭킹 (user_weekly_quest_progress + weekly_quests)
create or replace function public.get_public_weekly_dotori_ranking(p_limit int default 5)
returns table (
  rank int,
  profile_id uuid,
  display_name text,
  dotori_earned int
)
language sql
security definer
set search_path = public
stable
as $$
  with bounds as (
    select (date_trunc('week', (current_timestamp at time zone 'Asia/Seoul')::timestamp)::date) as week_start_local
  ),
  agg as (
    select
      u.profile_id,
      coalesce(
        sum(
          case
            when u.completed_at is not null then w.reward_dotori
            else 0
          end
        ),
        0
      )::int as earned
    from public.user_weekly_quest_progress u
    inner join public.weekly_quests w on w.id = u.quest_id
    cross join bounds b
    where (u.week_start::date) = b.week_start_local
    group by u.profile_id
  )
  select
    (row_number() over (order by a.earned desc, a.profile_id asc))::int as rank,
    a.profile_id,
    coalesce(nullif(trim(pr.display_name), ''), '익명') as display_name,
    a.earned as dotori_earned
  from agg a
  left join public.profiles pr on pr.id = a.profile_id
  where a.earned > 0
  order by a.earned desc, a.profile_id asc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;

alter function public.get_public_weekly_dotori_ranking(int) owner to postgres;
grant execute on function public.get_public_weekly_dotori_ranking(int) to anon, authenticated;

-- 4) 첫 글 작성 500 도토리 — 이벤트형 정의 + 본인 인스턴스 1회 보장 (quest_instances)
insert into public.quest_definitions (
  quest_code,
  title_ko,
  title_th,
  description_ko,
  description_th,
  period_type,
  event_type,
  goal_count,
  reward_corn,
  active,
  starts_at,
  ends_at,
  conditions
)
values (
  'onboarding_first_post_500',
  '첫 글 작성하고 도토리 500개',
  'โพสต์แรกรับดอทอรี่ 500',
  '광장에 첫 글을 올리면 도토리 500개를 드립니다.',
  'โพสต์แรกในกระดานเพื่อรับดอทอรี่ 500',
  'event',
  'write_post',
  1,
  500,
  true,
  now(),
  null,
  '{}'::jsonb
)
on conflict (quest_code) do update
  set
    title_ko = excluded.title_ko,
    title_th = excluded.title_th,
    description_ko = excluded.description_ko,
    description_th = excluded.description_th,
    event_type = excluded.event_type,
    goal_count = excluded.goal_count,
    reward_corn = excluded.reward_corn,
    active = excluded.active,
    ends_at = excluded.ends_at;

create or replace function public.quest_ensure_onboarding_first_post_instance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_def_id uuid;
  v_code text := 'onboarding_first_post_500';
  v_period text := 'onboarding_once';
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'AUTH_REQUIRED');
  end if;

  select q.id
    into v_def_id
  from public.quest_definitions q
  where q.quest_code = v_code
    and q.active = true
  limit 1;

  if v_def_id is null then
    return jsonb_build_object('ok', false, 'reason', 'QUEST_DEF_MISSING');
  end if;

  insert into public.quest_instances (
    profile_id,
    definition_id,
    quest_code,
    period_key,
    goal_count,
    reward_corn,
    status,
    metadata
  )
  values (
    uid,
    v_def_id,
    v_code,
    v_period,
    1,
    500,
    'active',
    jsonb_build_object('source', 'portal_cta', 'created_at', now())
  )
  on conflict (profile_id, quest_code, period_key) do nothing;

  return jsonb_build_object('ok', true, 'quest_code', v_code);
end;
$$;

alter function public.quest_ensure_onboarding_first_post_instance() owner to postgres;
grant execute on function public.quest_ensure_onboarding_first_post_instance() to authenticated;
