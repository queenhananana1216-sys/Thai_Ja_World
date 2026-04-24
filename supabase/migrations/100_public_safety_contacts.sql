-- 100_public_safety_contacts.sql
-- 태자월드: 공개 긴급·유용 연락처 (Philgo "긴급 연락처" 대응, 태국 기준)
-- RLS: 공개 is_active= true 만 읽기, service_role 전 권한

create table if not exists public.community_safety_contacts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'embassy',
    'police',
    'medical',
    'tourist_police',
    'korean_24h',
    'report',
    'other'
  )),
  label_ko text not null,
  label_th text not null,
  value text not null,
  value_kind text not null default 'phone' check (value_kind in ('phone', 'url', 'text')),
  source_url text,
  source_note text,
  href text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.community_safety_contacts is
  '랜딩/안내에 노출하는 긴급·공식 연락(태국). 번호·시간은 공식 사이트에서 수시 확인 후 관리자가 수정.';

create index if not exists idx_community_safety_contacts_list
  on public.community_safety_contacts (is_active, display_order, kind);

drop trigger if exists trg_community_safety_contacts_updated_at on public.community_safety_contacts;
create trigger trg_community_safety_contacts_updated_at
  before update on public.community_safety_contacts
  for each row execute function public.set_updated_at();

alter table public.community_safety_contacts enable row level security;

drop policy if exists community_safety_contacts_select_public on public.community_safety_contacts;
create policy community_safety_contacts_select_public
  on public.community_safety_contacts
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists community_safety_contacts_all_service on public.community_safety_contacts;
create policy community_safety_contacts_all_service
  on public.community_safety_contacts
  to service_role
  using (true)
  with check (true);

-- 초기 시드 (운영에서 반드시 재검토 — 외교부/0404/태국 응급은 변경 가능)
-- 중복 시드 방지: 테이블 비어 있을 때만
insert into public.community_safety_contacts
  (kind, label_ko, label_th, value, value_kind, source_url, source_note, href, display_order)
select * from (values
  (
    'embassy'::text,
    '주태국 대한민국 대사관 (서울 외교부 해외공관 안내)'::text,
    'สถานเอกอัครราชทูต ณ กรุงเทพฯ (ตรวจเวลาทำการ/หมายเลข ที่เว็บ ส.ส.)'::text,
    '+66-2-247-2114'::text,
    'phone'::text,
    'https://overseas.mofa.go.kr/th-ko/index.do'::text,
    '업무시간·팩스·비상 연락: 외교부 사이트 최신본 기준. 긴급: 영사콜센터 +82-2-2100-0404(한국) 안내.'::text,
    'https://overseas.mofa.go.kr/th-ko/index.do'::text,
    10
  ),
  (
    'police',
    '경찰 (범죄·응급, 일반)',
    'ตำรวจ (อาชญากรรม, ฉุกเฉิน, ทั่วไป)',
    '191',
    'phone',
    null,
    '191(경찰) 등. 상황에 따라 199(소방·응급) 안내. 번호·절차는 지역·관할에 따라 다를 수 있어 공관·호텔·현지 안내에 따를 것.',
    null,
    20
  ),
  (
    'medical',
    '의료·구급(일반)',
    'การแพทย์ฉุกเฉิน / รถพยาบาล',
    '1669 / 199',
    'text',
    null,
    '1669는 구급(일부 안내) / 199는 소방·응급(일부 안내). 휴대폰 112도 병기되는 경우 있음. 반드시 현지에서 재확인.',
    null,
    25
  ),
  (
    'tourist_police',
    '관광 경찰(도움) — 지역·시간 확인',
    'ตำรวจท่องเที่ยว (ตรวจคู่ 1155/พื้นที่)',
    '1155',
    'phone',
    null,
    '24시·전 지역이 아닐 수 있음. 191(경찰) 병행, 공항/관광지 현장 안내받기.',
    null,
    40
  ),
  (
    'korean_24h',
    '해외·영사콜센터 24h (한국에서 발신 권장)',
    'สายด่วน กงสล โทรกลับเกาหลี 24 ชม.',
    '+82-2-2100-0404',
    'phone',
    'https://www.0404.go.kr',
    '해외 위기·사망·연행 등 영사. 요금/무료 콜백 0800-010-2000(일부) 등은 0404 사이트 최신 확인.',
    'https://www.0404.go.kr',
    50
  ),
  (
    'report',
    '「제보/실종·위기」광장·운영(태자월드는 경찰 대체 아님)',
    'รายงาน/ค้นหา — กระดาน + ติดต่อ (ไม่ใช่ ตำรวจ)',
    'boards + contact',
    'text',
    null,
    '1) 112(경찰)·191을 먼저. 2) 비공개·개인정보 쓰지 말것. 3) /community/boards?cat=info 4) /contact',
    '/help/emergency',
    80
  )
) as v(kind, label_ko, label_th, value, value_kind, source_url, source_note, href, display_order)
where not exists (select 1 from public.community_safety_contacts limit 1);
