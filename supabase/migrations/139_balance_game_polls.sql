-- 홈 밸런스 게임(양자택일) 투표 — 일 1개(active_on, Asia/Seoul)

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  option_a_label text not null,
  option_b_label text not null,
  active_on date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  source text not null default 'auto_cron',
  constraint polls_question_len check (char_length(question) between 1 and 500),
  constraint polls_opt_a_len check (char_length(option_a_label) between 1 and 200),
  constraint polls_opt_b_len check (char_length(option_b_label) between 1 and 200)
);

comment on table public.polls is '메인 밸런스 게임 투표(하루 1문항, active_on 기준)';

create unique index if not exists idx_polls_one_per_active_day on public.polls (active_on);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  voter_key text not null,
  choice text not null check (choice in ('a', 'b')),
  created_at timestamptz not null default now(),
  unique (poll_id, voter_key),
  constraint poll_votes_voter_key_fmt check (voter_key ~ '^(user|anon):[0-9a-f-]{36}$')
);

create index if not exists idx_poll_votes_poll_id on public.poll_votes (poll_id);

alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

drop policy if exists polls_select_public on public.polls;
create policy polls_select_public on public.polls
  for select
  to anon, authenticated
  using (true);

-- 클라이언트 직접 INSERT 금지 — Next API(service role)만 투표 기록

revoke insert, update, delete on public.poll_votes from anon;
revoke insert, update, delete on public.poll_votes from authenticated;
revoke insert, update, delete on public.polls from anon;
revoke insert, update, delete on public.polls from authenticated;

grant select on public.polls to anon, authenticated;

-- 공개 집계(투표 행은 RLS로 비공개 — definer만 집계 노출)
create or replace function public.get_public_poll_totals(p_poll_id uuid)
returns table (votes_a bigint, votes_b bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(count(*) filter (where choice = 'a'), 0)::bigint,
    coalesce(count(*) filter (where choice = 'b'), 0)::bigint
  from public.poll_votes
  where poll_id = p_poll_id;
$$;

grant execute on function public.get_public_poll_totals(uuid) to anon, authenticated;

-- 첫 배포일 시드(해당 일에 행이 없을 때만)
insert into public.polls (question, option_a_label, option_b_label, active_on, source)
select
  '태국 첫 여행, 무조건 여기다!',
  '방콕의 화려한 밤',
  '푸켓의 에메랄드 바다',
  (now() at time zone 'Asia/Seoul')::date,
  'seed'
where not exists (
  select 1 from public.polls p where p.active_on = (now() at time zone 'Asia/Seoul')::date
);
