-- 프로필 벤·스트라이크, 게시글 INSERT는 service_role 전용(API 라우트), 댓글은 벤 사용자 차단

alter table public.profiles
  add column if not exists banned_until timestamptz,
  add column if not exists ban_reason text,
  add column if not exists moderation_strikes integer not null default 0;

create index if not exists idx_profiles_banned_until on public.profiles (banned_until)
  where banned_until is not null;

-- 일반 사용자는 banned_until / ban_reason / moderation_strikes 를 직접 바꿀 수 없음 (service_role 만)
create or replace function public.protect_profile_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  -- service_role 등 시스템 요청은 uid 없음 → 벤/스트라이크 갱신 허용
  if auth.uid() is null then
    return new;
  end if;
  if new.banned_until is distinct from old.banned_until
     or new.ban_reason is distinct from old.ban_reason
     or new.moderation_strikes is distinct from old.moderation_strikes then
    raise exception 'moderation fields are system-managed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_moderation on public.profiles;
create trigger trg_profiles_protect_moderation
  before update on public.profiles
  for each row execute function public.protect_profile_moderation_fields();

-- 클라이언트 직접 INSERT 막음 → POST /api/community/posts (service role) 만 생성
drop policy if exists posts_insert_authenticated on public.posts;

-- 벤된 사용자는 댓글 불가
drop policy if exists comments_insert_authenticated on public.comments;
create policy comments_insert_authenticated on public.comments
  for insert with check (
    auth.uid() = author_id
    and not exists (
      select 1 from public.profiles p
      where p.id = author_id
        and p.banned_until is not null
        and p.banned_until > now()
    )
  );
