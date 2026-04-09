-- =============================================================================
-- 태자월드 편집 샘플 뉴스 (홈 핫 스트립 · /news/[id] 노출)
-- 실행: Supabase Dashboard → SQL Editor → Postgres(또는 service_role)로 실행
-- 주의: raw_news.external_url 은 UNIQUE — 이미 있으면 해당 행만 삭제 후 재실행하거나 URL 변경
-- =============================================================================

begin;

do $$
declare
  r_id uuid;
  p_id uuid;
  body jsonb;
begin
  -- ① 방콕·수도권 이동
  insert into public.raw_news (external_url, title, raw_body, published_at)
  values (
    'https://www.thaijaworld.com/editorial/seed/2026-04-bangkok-transit-basics',
    '방콕·태국 수도권 이동 — 교통카드·앱 기본 (편집)',
    null,
    now() - interval '18 hours'
  )
  returning id into r_id;

  body := jsonb_build_object(
    'ko', jsonb_build_object(
      'title', '방콕·태국 수도권 이동 — 교통카드·앱 기본 (편집)',
      'summary',
      'BTS·MRT·공항 레일 등 노선이 많아 처음엔 헷갈릴 수 있어요. 역무실·키오스크에서 일회권을 살 수도 있지만, 라빗·모바일 토큰 등 **현지 교통 카드**를 하나 정해두면 환승·잔액 관리가 편합니다. 피크 시간대(출근·퇴근)에는 혼잡하니 짐이 많을 땐 시간대를 조금 피하는 것도 방법이에요.',
      'blurb', '처음 방콕에서 지하철·스카이트레인 탈 때 꼭 챙길 것만 정리했어요.',
      'editor_note', '요금·노선은 수시로 바뀔 수 있어요. 현장 안내·공식 앱을 함께 확인해 주세요.'
    ),
    'source_url', 'https://www.thaijaworld.com/editorial/seed/2026-04-bangkok-transit-basics'
  );

  insert into public.processed_news (raw_news_id, clean_body, language, published)
  values (r_id, body::text, 'ko', true)
  returning id into p_id;

  insert into public.summaries (processed_news_id, summary_text, model)
  values (
    p_id,
    'BTS·MRT·공항 연결 노선을 쓸 때는 교통 카드·모바일 앱을 미리 준비하고, 피크 시간 혼잡을 피하는 편이 여유로워요.',
    'ko'
  );

  -- ② 체류·서류 점검
  insert into public.raw_news (external_url, title, raw_body, published_at)
  values (
    'https://www.thaijaworld.com/editorial/seed/2026-04-stay-documents-checklist',
    '태국 체류 전 서류·일정 체크리스트 (편집)',
    null,
    now() - interval '40 hours'
  )
  returning id into r_id;

  body := jsonb_build_object(
    'ko', jsonb_build_object(
      'title', '태국 체류 전 서류·일정 체크리스트 (편집)',
      'summary',
      '비자·체류 자격은 **입국 목적·기간**에 따라 달라요. 여권 잔여 기간, 입·출국 스탬프, 다음 이동 일정을 메모해 두면 세관·호텔 체크인 때도 수월합니다. 장기 체류를 검토 중이면 공식 안내와 신체·보험 조건을 주기적으로 다시 확인하는 습관이 필요해요.',
      'blurb', '출발 전에 한 번씩만 점검해 두면 현지에서 덜 헤매요.',
      'editor_note', '비자·입국 규정은 변경될 수 있습니다. 반드시 외교·이민 공식 공지를 확인하세요.'
    ),
    'source_url', 'https://www.thaijaworld.com/editorial/seed/2026-04-stay-documents-checklist'
  );

  insert into public.processed_news (raw_news_id, clean_body, language, published)
  values (r_id, body::text, 'ko', true)
  returning id into p_id;

  insert into public.summaries (processed_news_id, summary_text, model)
  values (
    p_id,
    '여권·체류 목적·다음 일정을 정리해 두고, 비자·입국 규정은 공식 출처로 재확인하는 것이 안전합니다.',
    'ko'
  );

  -- ③ 지역·날씨·여행
  insert into public.raw_news (external_url, title, raw_body, published_at)
  values (
    'https://www.thaijaworld.com/editorial/seed/2026-04-north-thailand-travel-note',
    '북부·치앙마이 여행 시 알아두면 좋은 것들 (편집)',
    null,
    now() - interval '3 days'
  )
  returning id into r_id;

  body := jsonb_build_object(
    'ko', jsonb_build_object(
      'title', '북부·치앙마이 여행 시 알아두면 좋은 것들 (편집)',
      'summary',
      '고원 지역은 계절에 따라 **아침·저녁 기온 차**가 큽니다. 가벼운 겉옷, 신발 선택(돌길·사원 방문)을 미리 생각해 두면 좋아요. 현지 이벤트·공휴일에는 숙소·이동 수요가 몰릴 수 있으니 예약·이동 시간에 여유를 두는 편이 안전합니다.',
      'blurb', '치앙마이·북부 여행 때 기온 차와 일정 여유만 챙겨도 체감이 달라져요.',
      'editor_note', '날씨·행사 일정은 시기마다 다릅니다. 출발 전 현지 예보를 확인하세요.'
    ),
    'source_url', 'https://www.thaijaworld.com/editorial/seed/2026-04-north-thailand-travel-note'
  );

  insert into public.processed_news (raw_news_id, clean_body, language, published)
  values (r_id, body::text, 'ko', true)
  returning id into p_id;

  insert into public.summaries (processed_news_id, summary_text, model)
  values (
    p_id,
    '고원 지역은 일교차가 있어 겉옷을 챙기고, 사원·야외 일정에는 신발과 일정 여유를 준비하는 것이 좋습니다.',
    'ko'
  );
end $$;

commit;
