-- 일촌(친구) 신청 · 수락 시 쌍방 ilchon_links + 서로 부르는 일촌명
-- 클라이언트 INSERT/UPDATE on ilchon_requests 금지 — RPC만 사용

create table if not exists public.ilchon_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  message text,
  proposed_nickname_for_peer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ilchon_requests_no_self check (from_user_id <> to_user_id),
  constraint ilchon_requests_msg_len check (message is null or char_length(message) <= 500),
  constraint ilchon_requests_proposed_len check (
    proposed_nickname_for_peer is null
    or (char_length(trim(proposed_nickname_for_peer)) between 1 and 40)
  )
);

create unique index if not exists ilchon_requests_one_pending_outgoing
  on public.ilchon_requests (from_user_id, to_user_id)
  where status = 'pending';

create index if not exists ilchon_requests_to_pending
  on public.ilchon_requests (to_user_id, created_at desc)
  where status = 'pending';

create index if not exists ilchon_requests_from_user
  on public.ilchon_requests (from_user_id, created_at desc);

create table if not exists public.ilchon_links (
  user_id uuid not null references public.profiles (id) on delete cascade,
  peer_id uuid not null references public.profiles (id) on delete cascade,
  my_nickname_for_peer text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, peer_id),
  constraint ilchon_links_no_self check (user_id <> peer_id),
  constraint ilchon_links_nick_len check (char_length(trim(my_nickname_for_peer)) between 1 and 40)
);

create index if not exists ilchon_links_peer on public.ilchon_links (peer_id);

comment on table public.ilchon_requests is '일촌 신청. 수락/거절/취소는 RPC만.';
comment on table public.ilchon_links is '일촌 관계(방향별 1행). my_nickname_for_peer = 내가 상대를 부르는 일촌명.';

drop trigger if exists trg_ilchon_requests_updated_at on public.ilchon_requests;
create trigger trg_ilchon_requests_updated_at
  before update on public.ilchon_requests
  for each row execute function public.set_updated_at();

alter table public.ilchon_requests enable row level security;
alter table public.ilchon_links enable row level security;

drop policy if exists ilchon_requests_select on public.ilchon_requests;
create policy ilchon_requests_select on public.ilchon_requests
  for select to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists ilchon_links_select on public.ilchon_links;
create policy ilchon_links_select on public.ilchon_links
  for select to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- RPC (SECURITY DEFINER) — INSERT/UPDATE은 여기서만
-- -----------------------------------------------------------------------------

create or replace function public.ilchon_send_request(
  p_to_user_id uuid,
  p_message text default null,
  p_proposed_nickname text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid := auth.uid();
  v_id uuid;
  v_msg text;
  v_nick text;
begin
  if v_from is null then
    raise exception 'not_authenticated';
  end if;
  if p_to_user_id = v_from then
    raise exception 'cannot_request_self';
  end if;

  v_msg := nullif(trim(coalesce(p_message, '')), '');
  if v_msg is not null and length(v_msg) > 500 then
    raise exception 'message_too_long';
  end if;

  v_nick := nullif(trim(coalesce(p_proposed_nickname, '')), '');
  if v_nick is not null and length(v_nick) > 40 then
    raise exception 'nickname_too_long';
  end if;

  if exists (
    select 1 from public.ilchon_links l
    where l.user_id = v_from and l.peer_id = p_to_user_id
  ) then
    raise exception 'already_ilchon';
  end if;

  if exists (
    select 1 from public.ilchon_requests r
    where r.status = 'pending'
      and (
        (r.from_user_id = v_from and r.to_user_id = p_to_user_id)
        or (r.from_user_id = p_to_user_id and r.to_user_id = v_from)
      )
  ) then
    raise exception 'pending_request_exists';
  end if;

  insert into public.ilchon_requests (from_user_id, to_user_id, message, proposed_nickname_for_peer, status)
  values (v_from, p_to_user_id, v_msg, v_nick, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.ilchon_accept_request(
  p_request_id uuid,
  p_acceptor_calls_requester text,
  p_requester_calls_acceptor text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_acc text;
  v_req text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_acc := nullif(trim(coalesce(p_acceptor_calls_requester, '')), '');
  v_req := nullif(trim(coalesce(p_requester_calls_acceptor, '')), '');
  if v_acc is null or v_req is null then
    raise exception 'nicknames_required';
  end if;
  if length(v_acc) > 40 or length(v_req) > 40 then
    raise exception 'nickname_too_long';
  end if;

  select * into r from public.ilchon_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if r.status <> 'pending' then
    raise exception 'not_pending';
  end if;
  if r.to_user_id <> v_uid then
    raise exception 'not_recipient';
  end if;

  if exists (
    select 1 from public.ilchon_links l
    where (l.user_id = r.from_user_id and l.peer_id = r.to_user_id)
       or (l.user_id = r.to_user_id and l.peer_id = r.from_user_id)
  ) then
    raise exception 'already_ilchon';
  end if;

  update public.ilchon_requests
  set status = 'accepted', updated_at = now()
  where id = p_request_id;

  insert into public.ilchon_links (user_id, peer_id, my_nickname_for_peer) values
    (r.from_user_id, r.to_user_id, v_req),
    (r.to_user_id, r.from_user_id, v_acc);
end;
$$;

create or replace function public.ilchon_reject_request(p_request_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  n int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.ilchon_requests
  set status = 'rejected', updated_at = now()
  where id = p_request_id and to_user_id = v_uid and status = 'pending';

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'reject_failed';
  end if;
end;
$$;

create or replace function public.ilchon_cancel_request(p_request_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  n int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.ilchon_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id and from_user_id = v_uid and status = 'pending';

  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'cancel_failed';
  end if;
end;
$$;

alter function public.ilchon_send_request(uuid, text, text) owner to postgres;
alter function public.ilchon_accept_request(uuid, text, text) owner to postgres;
alter function public.ilchon_reject_request(uuid) owner to postgres;
alter function public.ilchon_cancel_request(uuid) owner to postgres;

revoke all on function public.ilchon_send_request(uuid, text, text) from public;
revoke all on function public.ilchon_accept_request(uuid, text, text) from public;
revoke all on function public.ilchon_reject_request(uuid) from public;
revoke all on function public.ilchon_cancel_request(uuid) from public;

grant execute on function public.ilchon_send_request(uuid, text, text) to authenticated;
grant execute on function public.ilchon_accept_request(uuid, text, text) to authenticated;
grant execute on function public.ilchon_reject_request(uuid) to authenticated;
grant execute on function public.ilchon_cancel_request(uuid) to authenticated;
