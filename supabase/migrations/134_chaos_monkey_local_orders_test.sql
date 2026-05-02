-- =============================================================================
-- 134_chaos_monkey_local_orders_test — 카오스 몽키 격리 스키마 + 서비스 롤 전용 RPC
-- 운영 public.local_orders 와 FK·데이터 없음. PostgREST에는 스키마 미노출(오직 RPC 경유).
-- =============================================================================

create schema if not exists local_orders_test;

comment on schema local_orders_test is
  'Chaos / load test 전용 더미 QR 주문·큐. 실제 샵 주문 테이블과 무관.';

-- -----------------------------------------------------------------------------
-- 더미 QR 주문 행 (부하·락 경쟁 훈련용)
-- -----------------------------------------------------------------------------
create table if not exists local_orders_test.qr_orders (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null,
  seq int not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint local_orders_test_qr_orders_batch_seq_uniq unique (batch_id, seq)
);

create index if not exists idx_local_orders_test_qr_orders_batch_created
  on local_orders_test.qr_orders (batch_id, created_at desc);

comment on table local_orders_test.qr_orders is
  '가짜 QR 주문 스냅샷. 카오스 부하 후 배치 단위 삭제로 정리.';

-- -----------------------------------------------------------------------------
-- 큐 시뮬레이션 (자가 치유 시 priority 재정렬 대상)
-- -----------------------------------------------------------------------------
create table if not exists local_orders_test.chaos_job_queue (
  id bigserial primary key,
  job_kind text not null default 'chaos_probe',
  priority int not null default 100,
  sort_key int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_local_orders_test_chaos_queue_pri
  on local_orders_test.chaos_job_queue (priority desc, sort_key asc, id asc);

comment on table local_orders_test.chaos_job_queue is
  '카오스 파이프라인용 더미 작업 큐. NOTIFY 이후 우선순위 재정렬 훈련.';

alter table local_orders_test.qr_orders enable row level security;
alter table local_orders_test.chaos_job_queue enable row level security;

grant usage on schema local_orders_test to postgres, service_role;
grant all on all tables in schema local_orders_test to postgres, service_role;
grant usage, select on all sequences in schema local_orders_test to postgres, service_role;

alter default privileges in schema local_orders_test
  grant all on tables to postgres, service_role;
alter default privileges in schema local_orders_test
  grant usage, select on sequences to postgres, service_role;

-- -----------------------------------------------------------------------------
-- RPC: 청크 단위 동시 삽입 (여러 연결에서 호출 시 락·경합 유발)
-- -----------------------------------------------------------------------------
create or replace function public.chaos_monkey_insert_qr_chunk(
  p_batch_id text,
  p_seq_from int,
  p_chunk_size int
)
returns int
language plpgsql
security definer
set search_path = public, local_orders_test
as $$
declare
  n int;
begin
  if p_batch_id is null or length(trim(p_batch_id)) < 8 then
    raise exception 'invalid_batch_id';
  end if;
  if p_seq_from < 1 or p_chunk_size < 1 or p_chunk_size > 250 then
    raise exception 'chunk_params_out_of_range';
  end if;

  insert into local_orders_test.qr_orders (batch_id, seq, payload)
  select
    p_batch_id,
    p_seq_from + g.n - 1,
    jsonb_build_object(
      'chaos', true,
      'qr_training', true,
      'i', p_seq_from + g.n - 1,
      'ts', extract(epoch from clock_timestamp())
    )
  from generate_series(1, p_chunk_size) as g(n);

  get diagnostics n = row_count;
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: 연결 지연(0.5s) — 클라이언트 타임아웃/재시도와 동일 조건을 서버에서 재현
-- -----------------------------------------------------------------------------
create or replace function public.chaos_monkey_pg_sleep_half_second()
returns void
language sql
security definer
set search_path = public
as $$
  select pg_sleep(0.5);
$$;

-- -----------------------------------------------------------------------------
-- RPC: PostgREST 스키마 캐시 리셋
-- -----------------------------------------------------------------------------
create or replace function public.chaos_monkey_notify_pgrst_reload_schema()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  notify pgrst, 'reload_schema';
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: 큐 priority·sort_key 재정렬 (자가 치유)
-- -----------------------------------------------------------------------------
create or replace function public.chaos_monkey_renormalize_queue()
returns int
language plpgsql
security definer
set search_path = public, local_orders_test
as $$
declare
  u int;
begin
  with ordered as (
    select
      id,
      row_number() over (
        order by priority desc, sort_key asc, id asc
      ) as rn
    from local_orders_test.chaos_job_queue
  )
  update local_orders_test.chaos_job_queue q
  set
    priority = (1000 - least(o.rn, 999))::int,
    sort_key = o.rn::int
  from ordered o
  where q.id = o.id;

  get diagnostics u = row_count;
  return coalesce(u, 0);
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: 훈련 배치 정리
-- -----------------------------------------------------------------------------
create or replace function public.chaos_monkey_prune_batch(p_batch_id text)
returns int
language plpgsql
security definer
set search_path = public, local_orders_test
as $$
declare
  n int;
begin
  delete from local_orders_test.qr_orders
  where batch_id = p_batch_id;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: 큐에 무작위 우선순위 작업 삽입 (재정렬 훈련 입력)
-- -----------------------------------------------------------------------------
create or replace function public.chaos_monkey_seed_queue_jobs(p_count int default 8)
returns int
language plpgsql
security definer
set search_path = public, local_orders_test
as $$
declare
  i int;
begin
  if p_count < 1 or p_count > 64 then
    raise exception 'seed_count_out_of_range';
  end if;

  for i in 1..p_count loop
    insert into local_orders_test.chaos_job_queue (job_kind, priority, sort_key)
    values (
      'chaos_probe',
      (floor(random() * 100000))::int,
      (floor(random() * 100000))::int
    );
  end loop;

  return p_count;
end;
$$;

-- 권한: service_role 만 (anon/authenticated 직접 호출 불가)
revoke all on function public.chaos_monkey_insert_qr_chunk(text, int, int) from public;
revoke all on function public.chaos_monkey_pg_sleep_half_second() from public;
revoke all on function public.chaos_monkey_notify_pgrst_reload_schema() from public;
revoke all on function public.chaos_monkey_renormalize_queue() from public;
revoke all on function public.chaos_monkey_prune_batch(text) from public;
revoke all on function public.chaos_monkey_seed_queue_jobs(int) from public;

grant execute on function public.chaos_monkey_insert_qr_chunk(text, int, int) to service_role;
grant execute on function public.chaos_monkey_pg_sleep_half_second() to service_role;
grant execute on function public.chaos_monkey_notify_pgrst_reload_schema() to service_role;
grant execute on function public.chaos_monkey_renormalize_queue() to service_role;
grant execute on function public.chaos_monkey_prune_batch(text) to service_role;
grant execute on function public.chaos_monkey_seed_queue_jobs(int) to service_role;

notify pgrst, 'reload_schema';
