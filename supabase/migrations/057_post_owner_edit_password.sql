-- 게시글 선택적 «글 비밀번호»: 수정·삭제(및 비공개 전환) 시 추가 확인
-- 해시는 post_edit_secrets 에만 두어 posts SELECT 로 클라이언트에 노출되지 않게 함.

alter table public.posts
  add column if not exists owner_edit_password_set boolean not null default false;

comment on column public.posts.owner_edit_password_set is
  'true면 post_edit_secrets 행이 있음 — UI에서 삭제·수정·비공개 전환 시 비밀번호 입력 요청.';

create table if not exists public.post_edit_secrets (
  post_id uuid primary key references public.posts (id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

comment on table public.post_edit_secrets is
  '게시글 수정·삭제용 비밀번호 해시. RLS 정책 없음 → anon/authenticated는 접근 불가, service_role만 API에서 사용.';

alter table public.post_edit_secrets enable row level security;

-- 정책을 추가하지 않음: 일반 JWT로는 행을 읽거나 쓸 수 없음 (RLS 기본 거부)

revoke all on table public.post_edit_secrets from anon;
revoke all on table public.post_edit_secrets from authenticated;
grant select, insert, update, delete on table public.post_edit_secrets to service_role;
