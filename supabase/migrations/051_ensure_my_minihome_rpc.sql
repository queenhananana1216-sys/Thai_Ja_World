-- =============================================================================
-- 051_ensure_my_minihome_rpc.sql
-- 가입 트리거에서 미니홈 INSERT가 실패했거나, 구 계정에 행이 없을 때
-- 로그인한 본인이 /minihome 에 들어오면 한 번에 행을 만들 수 있게 함.
-- =============================================================================

create extension if not exists pgcrypto;

create or replace function public.ensure_my_minihome()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  dn text;
  candidate text;
  tries int := 0;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.user_minihomes m where m.owner_id = uid) then
    return;
  end if;

  select p.display_name into dn from public.profiles p where p.id = uid;
  if dn is null or trim(dn) = '' then
    dn := 'user';
  end if;

  loop
    candidate := substring(encode(gen_random_bytes(9), 'hex') from 1 for 12);
    begin
      insert into public.user_minihomes (owner_id, public_slug, title)
      values (uid, candidate, coalesce(dn, '미니홈') || '님의 공간');
      return;
    exception
      when unique_violation then
        tries := tries + 1;
        if tries > 8 then
          raise;
        end if;
    end;
  end loop;
end;
$$;

comment on function public.ensure_my_minihome() is
  '로그인 사용자 본인에게 user_minihomes 행이 없으면 생성. 이미 있으면 no-op.';

alter function public.ensure_my_minihome() owner to postgres;

revoke all on function public.ensure_my_minihome() from public;
grant execute on function public.ensure_my_minihome() to authenticated;
