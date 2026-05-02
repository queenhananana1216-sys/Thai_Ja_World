-- =============================================================================
-- 132_visa_tips_init.sql
-- 비자·생활 꿀팁 초기 데이터 (재실행 안전 / 프로필 1명 필요)
--
-- /tips 허브는 get_tips_public → posts(category=info, is_knowledge_tip, moderation safe)
-- + processed_knowledge(published, board_target=tips_board) 조건입니다.
-- board_posts 스키마는 board_type이 free|info만 허용되므로,
-- 통합 게시판에는 동 tema 요약을 info 글로 추가합니다.
-- =============================================================================

create or replace function public.migration_132_seed_one_visa_tip(
  p_author uuid,
  p_url text,
  p_raw_title text,
  p_clean jsonb,
  p_post_title text,
  p_post_content text,
  p_post_excerpt text
) returns void
language plpgsql
set search_path = public
as $fn$
declare
  v_raw uuid;
  v_pk uuid;
  v_post uuid;
begin
  if exists (select 1 from public.raw_knowledge rk where rk.external_url = p_url) then
    return;
  end if;

  insert into public.raw_knowledge (external_url, title_original, fetched_at)
  values (p_url, p_raw_title, now())
  returning id into v_raw;

  insert into public.processed_knowledge (
    raw_knowledge_id,
    clean_body,
    language_default,
    board_target,
    published
  )
  values (v_raw, p_clean, 'ko', 'tips_board', true)
  returning id into v_pk;

  insert into public.posts (
    author_id,
    plaza_id,
    category,
    title,
    content,
    image_urls,
    is_anonymous,
    moderation_status,
    excerpt,
    is_knowledge_tip
  )
  values (
    p_author,
    null,
    'info',
    left(p_post_title, 200),
    p_post_content,
    '{}'::text[],
    false,
    'safe',
    left(nullif(trim(p_post_excerpt), ''), 500),
    true
  )
  returning id into v_post;

  update public.processed_knowledge
  set post_id = v_post
  where id = v_pk;

  insert into public.knowledge_summaries (processed_knowledge_id, summary_text, model)
  values
    (v_pk, left(coalesce(p_clean #>> '{ko,summary}', p_post_excerpt), 2000), 'ko'),
    (v_pk, left(coalesce(p_clean #>> '{th,summary}', p_post_excerpt), 2000), 'th');
end;
$fn$;

do $seed$
declare
  v_author uuid;
  j jsonb;
  ex text;
  body text;
begin
  select p.id
  into v_author
  from public.profiles p
  order by p.created_at asc
  limit 1;

  if v_author is null then
    raise notice '132 visa tips seed skipped: no row in public.profiles';
    return;
  end if;

  -- ① TM47 / 90일 신고
  j := jsonb_build_object(
    'board_target', 'tips_board',
    'ko', jsonb_build_object(
      'title', '태국 90일 거주 신고(TM47) 실무 총정리',
      'summary',
      '장기 체류 중에는 이민국이 정한 주기에 맞춰 방문 신고가 필요할 수 있습니다. 마감일은 여권 스탬프·허가와 함께 달력에 박아 두고, 창구는 지역·예약제 여부가 다릅니다. 벌금·불이익 사례가 있으니 공식 안내를 최우선으로 확인하세요.'
    ),
    'th', jsonb_build_object(
      'title', 'รายงาน 90 วัน (แนวทางเบื้องต้น)',
      'summary',
      'ผู้พำนักระยะยาวอาจต้องรายงานตัวตามรอบที่กำหนด โปรดเทียบประทับในพาสปอร์ตและประกาศ ตม. ในพื้นที่ของคุณ — นี่ไม่ใช่คำแนะนำทางกฎหมาย'
    )
  );
  ex := 'TM47(90일) 주기·마감일은 스탬프 기준으로 다릅니다. 창구·예약은 지역별 상이 — 이민국 공지를 확인하세요.';
  body := concat_ws(E'\n', '요약', j #>> '{ko,summary}', '', '주의', '법률 자문이 아닙니다. 절차·서류는 반드시 공식 기관에서 확인하세요.', '', 'ไทย', j #>> '{th,summary}');
  perform public.migration_132_seed_one_visa_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/seed/132-01-tm47-90day',
    '132 seed: TM47 90-day reporting',
    j,
    '태국 90일 거주 신고(TM47) 실무 총정리',
    body,
    ex
  );

  -- ② 은퇴 비자
  j := jsonb_build_object(
    'board_target', 'tips_board',
    'ko', jsonb_build_object(
      'title', '은퇴(O-A 등) 비자 갱신·조건 오해 풀기',
      'summary',
      '은퇴·장기 체류 계열 비자는 재정 증빙·보험·체류 기록 등 요건이 유형별로 다릅니다. «주변 후기»만으로 판단하면 위험합니다. 갱신 전 여권 유효기간·입출국 기록을 정리하고 대사관·이민국 최신 공지를 대조하세요.'
    ),
    'th', jsonb_build_object(
      'title', 'วีซ่าเกษียณ — ข้อควรรู้เบื้องต้น',
      'summary',
      'เงื่อนไขการต่ออายุขึ้นกับประเภทวีซ่าและหลักฐานการเงิน โปรดตรวจประกาศทางการ — ไม่ใช่คำแนะนำทางกฎหมาย'
    )
  );
  ex := '은퇴·장기 체류 비자 요건은 변경될 수 있습니다. 재정·보험·서류는 공식 기준으로만 확인하세요.';
  body := concat_ws(E'\n', '요약', j #>> '{ko,summary}', '', '주의', '법률 자문이 아닙니다.', '', 'ไทย', j #>> '{th,summary}');
  perform public.migration_132_seed_one_visa_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/seed/132-02-retirement-visa',
    '132 seed: retirement visa renewal',
    j,
    '은퇴(O-A) 비자 갱신·조건 오해 풀기',
    body,
    ex
  );

  -- ③ Grab / Bolt
  j := jsonb_build_object(
    'board_target', 'tips_board',
    'ko', jsonb_build_object(
      'title', 'Grab·Bolt 방콕 이용 꿀팁 — 요금·안전·피크타임',
      'summary',
      '목적지 입력 후 예상 요금·동선을 확인하고, 피크타임에는 배차 지연을 감안하세요. 현금 결제 시 거스름 동전을 준비하고, 차량 번호·운전자 이름을 앱과 대조합니다. 야간에는 위치 공유를 켜 두면 안전에 도움이 됩니다.'
    ),
    'th', jsonb_build_object(
      'title', 'Grab/Bolt ในกรุงเทพฯ — เคล็ดลับใช้งาน',
      'summary',
      'ตรวจค่าโดยสารและข้อมูลคนขับก่อนขึ้นรถ เผื่อเวลาช่วงชั่วโมงเร่งด่วน และใช้ฟังก์ชันแชร์ตำแหน่งเมื่อจำเป็น'
    )
  );
  ex := '피크타임 요금·대기 시간 변동이 큽니다. 차량·운전자 정보를 반드시 대조하세요.';
  body := concat_ws(E'\n', '요약', j #>> '{ko,summary}', '', 'ไทย', j #>> '{th,summary}');
  perform public.migration_132_seed_one_visa_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/seed/132-03-grab-bolt-bkk',
    '132 seed: Grab Bolt Bangkok',
    j,
    'Grab·Bolt 방콕 이용 꿀팁 (요금·안전)',
    body,
    ex
  );

  -- ④ 방콕 병원 ER
  j := jsonb_build_object(
    'board_target', 'tips_board',
    'ko', jsonb_build_object(
      'title', '방콕 병원 응급실(ER) 이용 전 체크리스트',
      'summary',
      '여권·보험 증권 번호·현금·카드를 함께 지참하고, 증상을 간단한 영어 키워드로 메모해 두면 접수가 빨라질 수 있습니다. 영수증·진단서는 보험 청구용으로 스캔 보관하세요. 비응급은 클리닉·예약 진료가 대기 시간 면에서 유리한 경우가 많습니다.'
    ),
    'th', jsonb_build_object(
      'title', 'ห้องฉุกเฉิน โรงพยาบาลกรุงเทพฯ — เตรียมตัวเบื้องต้น',
      'summary',
      'นำพาสปอร์ต กรมธรรม์ประกัน และบัตร/เงินสด — เก็บใบเสร็จและเอกสารการรักษาสำหรับเคลม'
    )
  );
  ex := '응급실 대기는 병원·시간대별로 크게 다릅니다. 보험 청구에는 영문 진단서 필요 여부를 미리 확인하세요.';
  body := concat_ws(E'\n', '요약', j #>> '{ko,summary}', '', 'ไทย', j #>> '{th,summary}');
  perform public.migration_132_seed_one_visa_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/seed/132-04-bkk-hospital-er',
    '132 seed: Bangkok hospital ER',
    j,
    '방콕 병원 응급실(ER) 이용 전 체크리스트',
    body,
    ex
  );

  -- ⑤ TM30 숙소
  j := jsonb_build_object(
    'board_target', 'tips_board',
    'ko', jsonb_build_object(
      'title', 'TM30 숙소 신고 — 게스트하우스·월세에서 놓치기 쉬운 점',
      'summary',
      '숙소 유형에 따라 신고 주체가 호스트인 경우가 많습니다. 이사·숙소 변경 시 이전·이후 주소와 신고 접수 여부를 확인하세요. 규정 위반 시 불이익이 보고된 바 있어, 거주 형태가 바뀌면 공식 FAQ를 다시 읽는 것이 안전합니다.'
    ),
    'th', jsonb_build_object(
      'title', 'แจ้งที่อยู่พักอาศัย (ภาพรวม)',
      'summary',
      'บางประเภทที่พักเจ้าของที่พักเป็นผู้แจ้ง — เมื่อย้ายที่อยู่ควรตรวจสถานะการแจ้งและข้อกำหนดจาก ตม.'
    )
  );
  ex := 'TM30 요건은 체류 자격·숙소 유형에 따라 다릅니다. 반드시 공식 설명을 확인하세요.';
  body := concat_ws(E'\n', '요약', j #>> '{ko,summary}', '', '주의', '법률 자문이 아닙니다.', '', 'ไทย', j #>> '{th,summary}');
  perform public.migration_132_seed_one_visa_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/seed/132-05-tm30-hostel',
    '132 seed: TM30 lodging',
    j,
    'TM30 숙소 신고 — 게스트하우스·월세 실무',
    body,
    ex
  );

  -- ⑥ 은행 계좌
  j := jsonb_build_object(
    'board_target', 'tips_board',
    'ko', jsonb_build_object(
      'title', '장기체류자 태국 은행 계좌 개설 — 서류 개략',
      'summary',
      '은행·지점마다 요구 서류(여권, 비자, 주소 증빙, 현지 연락처 등)가 다릅니다. 방문 전 영업점에 전화로 최신 목록을 확인하고, 가능하면 통역 가능한 지인 동행을 검토하세요.'
    ),
    'th', jsonb_build_object(
      'title', 'เปิดบัญชีธนาคารในฐานะผู้พำนัก — เอกสารโดยสังเขป',
      'summary',
      'แต่ละสาขาอาจขอเอกสารไม่เหมือนกัน โปรดโทรสอบถามล่วงหน้า'
    )
  );
  ex := '계좌 개설 가능 여부는 비자 종류·은행 정책에 따라 다릅니다. 지점별로 확인하세요.';
  body := concat_ws(E'\n', '요약', j #>> '{ko,summary}', '', 'ไทย', j #>> '{th,summary}');
  perform public.migration_132_seed_one_visa_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/seed/132-06-bank-account',
    '132 seed: Thai bank account',
    j,
    '장기체류자 은행 계좌 개설 서류 개략',
    body,
    ex
  );

  -- ⑦ SIM / 데이터
  j := jsonb_build_object(
    'board_target', 'tips_board',
    'ko', jsonb_build_object(
      'title', '태국 선불 SIM·데이터 요금제 고르기',
      'summary',
      '단기 체류는 공항·편의점 유심으로 빠르게 개통하고, 장기는 월 정액·통화 포함 패키지를 비교하세요. 여권 등록 절차가 필요할 수 있으니 카운터 안내를 따릅니다.'
    ),
    'th', jsonb_build_object(
      'title', 'ซิมเติมเงินและแพ็กเกจเน็ตในไทย',
      'summary',
      'เปรียบเทียบแพ็กเกจรายเดือนกับแบบเติมเงิน และเตรียมเอกสารประจำตัวตามที่ผู้ให้บริการร้องขอ'
    )
  );
  ex := '요금제·실명 등록 규정은 통신사마다 다릅니다. 매장 안내를 기준으로 하세요.';
  body := concat_ws(E'\n', '요약', j #>> '{ko,summary}', '', 'ไทย', j #>> '{th,summary}');
  perform public.migration_132_seed_one_visa_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/seed/132-07-prepaid-sim',
    '132 seed: prepaid SIM Thailand',
    j,
    '태국 선불 SIM·데이터 요금제 고르기',
    body,
    ex
  );

  -- ⑧ 콘도 임대
  j := jsonb_build_object(
    'board_target', 'tips_board',
    'ko', jsonb_build_object(
      'title', '콘도 임대 보증금·계약서 체크 포인트',
      'summary',
      '보증금 회수 조건·계약 해지 통지 기간·수도·관리비 부담 주체를 계약서에 명시했는지 확인하세요. 사진·영상으로 입주 전 상태를 기록해 두면 퇴거 분쟁 시 도움이 됩니다.'
    ),
    'th', jsonb_build_object(
      'title', 'เช่าคอนโด — เงินประกันและสัญญา',
      'summary',
      'ตรวจเงื่อนไขคืนประกัน ระยะแจ้งเลิกสัญญา และค่าส่วนกลางว่าฝ่ายใดรับผิดชอบ'
    )
  );
  ex := '임대 계약은 사안별로 다릅니다. 중요 조항은 통역·전문가 검토를 권장합니다.';
  body := concat_ws(E'\n', '요약', j #>> '{ko,summary}', '', 'ไทย', j #>> '{th,summary}');
  perform public.migration_132_seed_one_visa_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/seed/132-08-condo-lease',
    '132 seed: condo lease deposit',
    j,
    '콘도 임대 보증금·계약서 체크 포인트',
    body,
    ex
  );

  -- 통합 게시판 board_posts (마이그레이션 118+ 적용 프로젝트만)
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'board_posts'
  ) then
    insert into public.board_posts (user_id, board_type, title, content)
    select v_author, 'info', '[비자·꿀팁] 태국 90일 거주 신고(TM47) 한눈에', '요약: 장기 체류 시 주기적 방문 신고가 필요할 수 있습니다. 마감일·창구는 지역별 상이합니다. 자세한 본문은 /tips 허브를 참고하세요. (법률 자문 아님)'
    where not exists (
      select 1 from public.board_posts b where b.title = '[비자·꿀팁] 태국 90일 거주 신고(TM47) 한눈에'
    );

    insert into public.board_posts (user_id, board_type, title, content)
    select v_author, 'info', '[비자·꿀팁] 은퇴 비자 갱신 전에 확인할 것', '요약: 재정·보험·여권 유효기간 등 요건은 비자 유형별로 다릅니다. 공식 기관 안내를 확인하세요. /tips 참고.'
    where not exists (
      select 1 from public.board_posts b where b.title = '[비자·꿀팁] 은퇴 비자 갱신 전에 확인할 것'
    );

    insert into public.board_posts (user_id, board_type, title, content)
    select v_author, 'info', '[생활] Grab·Bolt 방콕 — 요금·안전 팁', '요약: 피크타임 배차·요금 변동, 운전자·차량 정보 대조, 위치 공유 활용. /tips 참고.'
    where not exists (
      select 1 from public.board_posts b where b.title = '[생활] Grab·Bolt 방콕 — 요금·안전 팁'
    );

    insert into public.board_posts (user_id, board_type, title, content)
    select v_author, 'info', '[생활] 방콕 병원 응급실 이용 체크리스트', '요약: 여권·보험·영수증 보관, 비응급은 클리닉 검토. /tips 참고.'
    where not exists (
      select 1 from public.board_posts b where b.title = '[생활] 방콕 병원 응급실 이용 체크리스트'
    );

    insert into public.board_posts (user_id, board_type, title, content)
    select v_author, 'info', '[비자·꿀팁] TM30 숙소 신고 기본', '요약: 숙소 유형에 따라 신고 주체가 다를 수 있습니다. 주소 변경 시 절차를 공식 안내로 확인하세요. /tips 참고.'
    where not exists (
      select 1 from public.board_posts b where b.title = '[비자·꿀팁] TM30 숙소 신고 기본'
    );
  end if;
end;
$seed$;

drop function if exists public.migration_132_seed_one_visa_tip(
  uuid,
  text,
  text,
  jsonb,
  text,
  text,
  text
);
