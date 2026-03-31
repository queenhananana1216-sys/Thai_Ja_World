-- =============================================================================
-- 049_style_points_minihome_shop.sql
-- 가입 인사(본인 미니홈 방명록 1회) → 스타일 점수 지급
-- 스타일 상점: room_skin / minimi 를 점수로 구매·장착 (RPC + RLS)
-- profiles.style_score_total 은 일반 UPDATE 로 조작 불가 (트리거 + RPC만)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: 스타일 점수 (초기 스키마에 없을 수 있음 → 멱등 추가)
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists style_score_total integer not null default 0;

create index if not exists idx_profiles_style_score on public.profiles (style_score_total desc);

-- -----------------------------------------------------------------------------
-- profiles: 가입 인사 완료 플래그
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists signup_greeting_done boolean not null default false;

comment on column public.profiles.signup_greeting_done is
  '가입 인사(본인 미니홈 방명록 1회) 완료 시 true. 신규만 false.';

-- 기존 회원은 요구하지 않음(마이그레이션 시점 가입자)
update public.profiles set signup_greeting_done = true where signup_greeting_done = false;

-- -----------------------------------------------------------------------------
-- 스타일 상점 카탈로그
-- -----------------------------------------------------------------------------
create table if not exists public.style_shop_items (
  item_key text primary key,
  category text not null check (category in ('room_skin', 'minimi')),
  price_points int not null check (price_points > 0 and price_points <= 500000),
  label_ko text not null,
  label_th text not null,
  payload jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  active boolean not null default true,
  constraint style_shop_items_payload_object check (jsonb_typeof(payload) = 'object')
);

comment on table public.style_shop_items is
  '미니홈 코스메틱 상점. payload 는 user_minihomes.theme 에 병합(room_skin: accent·wallpaper, minimi: minimi).';

create index if not exists idx_style_shop_items_active_sort
  on public.style_shop_items (active, sort_order, item_key);

-- -----------------------------------------------------------------------------
-- 구매(보유) 기록
-- -----------------------------------------------------------------------------
create table if not exists public.profile_style_unlocks (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  item_key text not null references public.style_shop_items (item_key) on delete restrict,
  purchased_at timestamptz not null default now(),
  primary key (profile_id, item_key)
);

create index if not exists idx_profile_style_unlocks_profile
  on public.profile_style_unlocks (profile_id);

comment on table public.profile_style_unlocks is
  '스타일 상점 구매 내역. INSERT·DELETE 는 RPC(service)만 — 클라이언트 직접 쓰기 없음.';

-- -----------------------------------------------------------------------------
-- 트리거: style_score_total · signup_greeting_done 는 앱에서 직접 수정 금지
-- RPC 에서만 set_config 로 우회
-- -----------------------------------------------------------------------------
create or replace function public.protect_profile_style_locked_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if current_setting('app.profile_style_guard_bypass', true) = '1' then
    return new;
  end if;
  if auth.uid() is null then
    return new;
  end if;
  if new.style_score_total is distinct from old.style_score_total
     or new.signup_greeting_done is distinct from old.signup_greeting_done then
    raise exception 'PROFILE_STYLE_OR_GREETING_LOCKED' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_style_locked on public.profiles;
create trigger trg_profiles_protect_style_locked
  before update on public.profiles
  for each row execute function public.protect_profile_style_locked_columns();

-- 방명록 INSERT 는 클라이언트에 열지 않음(스팸 방지). 가입 인사는 style_complete_signup_greeting RPC만 기록.

-- -----------------------------------------------------------------------------
-- RLS: 상점·인벤토리
-- -----------------------------------------------------------------------------
alter table public.style_shop_items enable row level security;
alter table public.profile_style_unlocks enable row level security;

drop policy if exists style_shop_items_select on public.style_shop_items;
create policy style_shop_items_select on public.style_shop_items
  for select to anon, authenticated
  using (true);

drop policy if exists profile_style_unlocks_select_own on public.profile_style_unlocks;
create policy profile_style_unlocks_select_own on public.profile_style_unlocks
  for select to authenticated
  using (profile_id = auth.uid());

-- 시드 (멱등)
insert into public.style_shop_items (item_key, category, price_points, label_ko, label_th, payload, sort_order)
values
  (
    'skin_rose_garden',
    'room_skin',
    70,
    '로즈 가든 스킨',
    'สกินโรสการ์เดน',
    '{"accent":"#be185d"}'::jsonb,
    10
  ),
  (
    'skin_ocean_breeze',
    'room_skin',
    70,
    '오션 브리즈 스킨',
    'สกินโอเชียนบรีซ',
    '{"accent":"#0ea5e9"}'::jsonb,
    20
  ),
  (
    'skin_forest_cy',
    'room_skin',
    70,
    '포레스트 스킨',
    'สกินป่าไม้',
    '{"accent":"#15803d"}'::jsonb,
    30
  ),
  (
    'minimi_cat',
    'minimi',
    40,
    '미니미 · 고양이',
    'มินิมี · แมว',
    '{"minimi":"🐱"}'::jsonb,
    40
  ),
  (
    'minimi_dog',
    'minimi',
    40,
    '미니미 · 강아지',
    'มินิมี · หมา',
    '{"minimi":"🐶"}'::jsonb,
    50
  ),
  (
    'minimi_bear',
    'minimi',
    40,
    '미니미 · 곰',
    'มินิมี · หมี',
    '{"minimi":"🧸"}'::jsonb,
    60
  )
on conflict (item_key) do nothing;

-- -----------------------------------------------------------------------------
-- RPC: 가입 인사 (본인 방명록 + 점수)
-- -----------------------------------------------------------------------------
create or replace function public.style_complete_signup_greeting(p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b text := trim(p_body);
  bonus int := 150;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if exists (select 1 from public.profiles p where p.id = uid and p.signup_greeting_done) then
    raise exception 'GREETING_ALREADY_DONE';
  end if;

  if b is null or char_length(b) < 4 then
    raise exception 'GREETING_BODY_TOO_SHORT';
  end if;
  if char_length(b) > 2000 then
    raise exception 'GREETING_BODY_TOO_LONG';
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  insert into public.minihome_guestbook_entries (minihome_owner_id, author_id, body)
  values (uid, uid, b);

  update public.profiles
  set
    style_score_total = style_score_total + bonus,
    signup_greeting_done = true
  where id = uid;

  return jsonb_build_object('ok', true, 'points_granted', bonus);
end;
$$;

comment on function public.style_complete_signup_greeting(text) is
  '본인 미니홈 방명록에 가입 인사 1회 작성 + 스타일 점수 지급.';

-- -----------------------------------------------------------------------------
-- RPC: 구매 (점수 차감 + 보유 등록 + 테마 병합)
-- -----------------------------------------------------------------------------
create or replace function public.style_purchase_item(p_item_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  k text := nullif(trim(p_item_key), '');
  it public.style_shop_items%rowtype;
  bal int;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if k is null then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  select * into it from public.style_shop_items
  where item_key = k and active = true;
  if not found then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.profile_style_unlocks u where u.profile_id = uid and u.item_key = k
  ) then
    raise exception 'ALREADY_OWNED';
  end if;

  select p.style_score_total into bal
  from public.profiles p
  where p.id = uid
  for update;

  if bal is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if bal < it.price_points then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  update public.profiles
  set style_score_total = style_score_total - it.price_points
  where id = uid;

  insert into public.profile_style_unlocks (profile_id, item_key)
  values (uid, k);

  update public.user_minihomes
  set theme = coalesce(theme, '{}'::jsonb) || it.payload
  where owner_id = uid;

  return jsonb_build_object('ok', true, 'spent', it.price_points, 'item_key', k);
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: 보유 중인 아이템 다시 장착 (테마만 갱신)
-- -----------------------------------------------------------------------------
create or replace function public.style_equip_item(p_item_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  k text := nullif(trim(p_item_key), '');
  it public.style_shop_items%rowtype;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if k is null then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.profile_style_unlocks u where u.profile_id = uid and u.item_key = k
  ) then
    raise exception 'NOT_OWNED';
  end if;

  select * into it from public.style_shop_items
  where item_key = k and active = true;
  if not found then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  update public.user_minihomes
  set theme = coalesce(theme, '{}'::jsonb) || it.payload
  where owner_id = uid;

  return jsonb_build_object('ok', true, 'item_key', k);
end;
$$;

alter function public.style_complete_signup_greeting(text) owner to postgres;
alter function public.style_purchase_item(text) owner to postgres;
alter function public.style_equip_item(text) owner to postgres;

grant execute on function public.style_complete_signup_greeting(text) to authenticated;
grant execute on function public.style_purchase_item(text) to authenticated;
grant execute on function public.style_equip_item(text) to authenticated;
