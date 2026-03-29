-- ============================================================
-- 040_knowledge_taejaworld_curated.sql
-- 태자월드(한·태 체류·비자·입국)에 맞는 공식 기관 URL + 검증된 BP RSS 추가
-- url_list 는 한글 label 에 관련 키워드(태국·비자 등)를 넣어 수집기 관련성 필터를 통과시킴
-- ============================================================

-- BP Business/Opinion 은 정치·거시 비중이 커서 넣지 않음 (041 에서 기존 행 비활성화)

insert into public.knowledge_sources (name, kind, url_list_json, is_active)
select
  '태자월드 — 태·한 공식 (입국·비자·체류)'::text,
  'url_list'::text,
  jsonb_build_array(
    jsonb_build_object(
      'url', 'https://www.immigration.go.th/en/',
      'label', '태국 출입국관리청 공식(영문) — 비자·체류·입국 안내'
    ),
    jsonb_build_object(
      'url', 'https://tdac.immigration.go.th/arrival-card/',
      'label', '태국 디지털 도착신고 TDAC 공식 — 입국 서류'
    ),
    jsonb_build_object(
      'url', 'https://seoul.thaiembassy.org/',
      'label', '주한 태국대사관 공식 — 비자·영사·태국 교민'
    ),
    jsonb_build_object(
      'url', 'https://www.hikorea.go.kr/',
      'label', 'HiKorea 공식 — 한국 외국인 장기체류·체류지 통보'
    ),
    jsonb_build_object(
      'url', 'https://www.mofa.go.kr/www/nation/m_3458/list.do',
      'label', '외교부 해외안전여행 — 태국 여행·안전·비자 참고'
    ),
    jsonb_build_object(
      'url', 'https://www.0404.go.kr/',
      'label', '외국인 전자민원 1345 — 체류·입국 상담(한국)'
    ),
    jsonb_build_object(
      'url', 'https://www.overseas.go.kr/',
      'label', '재외동포 포털 — 해외 거주·여행 정보(한국 교민)'
    )
  ),
  true
where not exists (
  select 1
  from public.knowledge_sources k
  where k.kind = 'url_list' and k.name = '태자월드 — 태·한 공식 (입국·비자·체류)'
);
