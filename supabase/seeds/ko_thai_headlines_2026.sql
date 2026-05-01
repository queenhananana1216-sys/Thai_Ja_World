-- 한국어 공개 뉴스 시드 (processed_news.language = 'ko', published = true)
-- UI는 clean_body JSON만 사용 — raw_news.title 은 내부용 최소 문자열.
-- Supabase SQL Editor 또는 psql에서 실행.

begin;

insert into public.raw_news (external_url, title, published_at, fetched_at)
values
  (
    'https://www.bangkokpost.com/thailand/taeja-seed-2026-01',
    '태국 뉴스 소스(내부)',
    (now() at time zone 'utc') - interval '10 minutes',
    now() at time zone 'utc'
  ),
  (
    'https://www.nationthailand.com/taeja-seed-2026-02',
    '태국 뉴스 소스(내부)',
    (now() at time zone 'utc') - interval '1 hour',
    now() at time zone 'utc'
  ),
  (
    'https://www.thaipbsworld.com/taeja-seed-2026-03',
    '태국 뉴스 소스(내부)',
    (now() at time zone 'utc') - interval '2 hours',
    now() at time zone 'utc'
  ),
  (
    'https://www.reuters.com/world/asia-pacific/taeja-seed-2026-04',
    '아태 뉴스 소스(내부)',
    (now() at time zone 'utc') - interval '3 hours',
    now() at time zone 'utc'
  ),
  (
    'https://www.bloomberg.com/asia/taeja-seed-2026-05',
    '아태 경제 소스(내부)',
    (now() at time zone 'utc') - interval '4 hours',
    now() at time zone 'utc'
  );

insert into public.processed_news (raw_news_id, clean_body, language, published, seo_keywords)
select id,
  '{"ko":{"title":"태국 관광청, 2026년 상반기 외국인 방문 목표 상향·안전 캠페인 강화","summary":"태국 관광청이 동남아 주요 공항 혼잡 완화와 함께 한국·중국 단기 체류객 유치 프로모션을 확대한다고 밝혔다. 방콕·푸켓 중심으로 안심 여행 배너를 늘리고, 불법 교통·관광 사기 신고 채널을 다국어로 통합했다는 설명이다.","blurb":"현장 안내·환율·교통 팁을 한국어로 제공하는 시범 구역을 넓힌다."},"source_url":"https://www.bangkokpost.com/thailand/"}',
  'ko',
  true,
  array['태국','관광','방콕']::text[]
from public.raw_news
where external_url = 'https://www.bangkokpost.com/thailand/taeja-seed-2026-01'
limit 1;

insert into public.processed_news (raw_news_id, clean_body, language, published, seo_keywords)
select id,
  '{"ko":{"title":"태국 중앙은행, 금리 동결 전망 속 바트 변동성 완화에 총력","summary":"시장은 연내 물가 둔화와 가계 부채 관리에 주목하고 있다. 중앙은행이 외환 시장 안정화를 위해 단기 유동성 도구를 운용할 여지를 남겼다는 분석이 나온다. 수출·관광 회복과 연동된 바트 환율은 단기적으로 박스권 등락을 이어갈 전망이다.","blurb":"교민·현지 사업자는 환리스크 헷지를 점검할 시점으로 보는 분위기다."},"source_url":"https://www.nationthailand.com/"}',
  'ko',
  true,
  array['태국','경제','바트']::text[]
from public.raw_news
where external_url = 'https://www.nationthailand.com/taeja-seed-2026-02'
limit 1;

insert into public.processed_news (raw_news_id, clean_body, language, published, seo_keywords)
select id,
  '{"ko":{"title":"방콕 도시철도망 확장…신규 노선 시운전 구간 연장 논의","summary":"수도권 철도 공사 일정이 일부 조정되며 주요 환승역 혼잡 완화 대책이 거론된다. 통근 시간대 배차 간격 조정과 무선 결제·QR 요금 통합이 순차 도입된다는 현지 보도다. 외곽 신도심과 공항 연결 노선 이용객이 늘면서 안내 표지판 다국어화도 확대된다.","blurb":"출퇴근 러시아워에는 예비 소요 시간을 넉넉히 보는 편이 좋다."},"source_url":"https://www.thaipbsworld.com/"}',
  'ko',
  true,
  array['태국','방콕','교통']::text[]
from public.raw_news
where external_url = 'https://www.thaipbsworld.com/taeja-seed-2026-03'
limit 1;

insert into public.processed_news (raw_news_id, clean_body, language, published, seo_keywords)
select id,
  '{"ko":{"title":"태국·한국, 에너지·식품 공급망 협력 실무회의 재개","summary":"양측은 신재생 도입 일정과 식품 안전 데이터 교환을 매개로 협력 채널을 복원한다는 톤이다. 중소 제조·물류 기업 대상 설명회가 방콕에서 열릴 예정이며, 관세·규격 정보를 사전 공유하는 파일럿이 논의된다. 교민 커뮤니티에는 통관·라벨링 체크리스트가 안내될 예정이다.","blurb":"현지 파트너와 계약 갱신 전 규격 변경 여부를 확인하라는 조언이 나온다."},"source_url":"https://www.reuters.com/world/asia-pacific/"}',
  'ko',
  true,
  array['태국','한국','경제']::text[]
from public.raw_news
where external_url = 'https://www.reuters.com/world/asia-pacific/taeja-seed-2026-04'
limit 1;

insert into public.processed_news (raw_news_id, clean_body, language, published, seo_keywords)
select id,
  '{"ko":{"title":"푸켓·치앙마이, 저탄소 관광 인증 숙소 확대…예약 플랫폼 연동","summary":"지자체는 친환경 청소·폐기물 분리·상수도 절감 지표를 충족한 숙소에 인증 마크를 부여하고 온라인 여행사와 연동한다고 밝혔다. 성수기 물가 상승 속에서도 장기 체류객을 겨냥한 월 단위 요금제가 늘어나는 추세다. 자전거·셔틀 연계 할인도 시범 운영된다.","blurb":"예약 전 인증 배지와 취소 규정을 함께 확인하는 것이 유리하다."},"source_url":"https://www.bloomberg.com/asia"}',
  'ko',
  true,
  array['태국','푸켓','관광']::text[]
from public.raw_news
where external_url = 'https://www.bloomberg.com/asia/taeja-seed-2026-05'
limit 1;

commit;
