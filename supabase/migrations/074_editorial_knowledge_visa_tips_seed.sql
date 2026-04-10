-- =============================================================================
-- 074_editorial_knowledge_visa_tips_seed.sql
-- 편집 샘플: 비자·체류·TM30/90일 등 «실제로 쓸 만한» 한·태 요약 → 홈·/tips 허브 노출
-- 조건: public.profiles 행이 1명 이상 있어야 함(첫 프로필을 작성자로 사용)
-- idempotent: 동일 editorial URL 의 raw_knowledge 가 이미 있으면 해당 건은 건너뜀
-- =============================================================================

create or replace function public.migration_074_seed_one_editorial_tip(
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
    (
      v_pk,
      trim(both from concat_ws(E'\n\n', p_clean #>> '{ko,summary}', nullif(p_clean #>> '{ko,editorial_note}', ''))),
      'ko'
    ),
    (
      v_pk,
      trim(both from concat_ws(E'\n\n', p_clean #>> '{th,summary}', nullif(p_clean #>> '{th,editorial_note}', ''))),
      'th'
    );
end;
$fn$;

do $seed$
declare
  v_author uuid;
  v_clean jsonb;
  v_content text;
  v_excerpt text;
begin
  select p.id
  into v_author
  from public.profiles p
  order by p.created_at asc
  limit 1;

  if v_author is null then
    raise notice '074 editorial knowledge seed skipped: no row in public.profiles';
    return;
  end if;

  -- ① 장기체류·비자 연장 전 체크리스트
  v_clean := jsonb_build_object(
    'board_target', 'tips_board',
    'editorial_meta', jsonb_build_object(
      'novelty_score', 74,
      'usefulness_score', 90,
      'confidence_level', 'medium',
      'reasons', jsonb_build_array('태자 편집', '공개 운영 정보 위주', '개인 사정별 차이 큼')
    ),
    'ko', jsonb_build_object(
      'title', '장기체류·비자 연장 전 서류·일정 체크리스트 (편집)',
      'summary',
      $k1$
장기체류나 비자 종류 변경을 준비할 때는 여권·사진·재정·거주 증빙처럼 자주 요구되는 항목을 한곳에 모아두면 창구에서 덜 헤매요.

민원 일정은 이민국·대사관마다 다르니 온라인 예약·현장 대기·수수료 결제 방식(현금만 등)을 미리 확인하세요.

개인 상황(가족 동반, 고용·학적)에 따라 추가 서류가 생길 수 있어요. 아래 목록은 출발점일 뿐이며, 최종 판단은 항상 공식 기관 안내를 따릅니다.
$k1$,
      'checklist', jsonb_build_array(
        '여권 원본·사본, 잔여 유효기간(통상 6개월 이상 여유 권장)',
        '증명사진 규격·촬영 시점(예: 6개월 이내) 확인',
        '거주·주소 관련 증빙(해당 시 TM30 등)',
        '은행잔고·재정 증빙(비자 유형별로 상이)',
        '기존 비자·입출국 스탬프 사진 백업(여권 분실 대비)'
      ),
      'cautions', jsonb_build_array(
        '법률 자문이 아닙니다. 비자·체류 절차는 반드시 이민국·대사관·공식 사이트에서 최종 확인하세요.',
        '규정·수수료·서류 목록은 통보 없이 바뀔 수 있습니다.'
      ),
      'tags', jsonb_build_array('비자', '연장', '이민국', '체류', '서류', '태국')
    ),
    'th', jsonb_build_object(
      'title', 'เช็กลิสต์เอกสาร·นัดหมายก่อนต่อวีซ่า/พำนักยาว (บรรณาธิการ)',
      'summary',
      $t1$
ก่อนยื่นต่อวีซ่าหรือเปลี่ยนประเภทการพำนัก ควรเตรียมหนังสือเดินทาง รูปถ่าย หลักฐานการเงิน และที่อยู่ให้พร้อมในที่เดียว เพื่อลดความสับสนที่เคาน์เตอร์

แต่ละสถานที่มีระบบนัดหมาย/คิวไม่เหมือนกัน โปรดตรวจค่าธรรมเนียมและวิธีชำระล่วงหน้า

รายการด้านล่างเป็นเพียงจุดเริ่มต้น กรณีของแต่ละบุคคลอาจต้องใช้เอกสารเพิ่มเติม โปรดยึดประกาศทางการเป็นหลัก
$t1$,
      'checklist', jsonb_build_array(
        'หนังสือเดินทางตัวจริง/สำเนา และความครบถ้วนของอายุ',
        'รูปถ่ายตามสเปกที่กำหนด',
        'หลักฐานที่อยู่ (ถ้าจำเป็น)',
        'หลักฐานการเงินตามประเภทวีซ่า',
        'สำรองรูปประทับตราขาเข้า-ออก'
      ),
      'cautions', jsonb_build_array(
        'นี่ไม่ใช่คำแนะนำทางกฎหมาย โปรดตรวจสอบกับสถานทูต/ตม.เสมอ',
        'กฎและค่าธรรมเนียมอาจเปลี่ยนได้โดยไม่แจ้งล่วงหน้า'
      ),
      'tags', jsonb_build_array('วีซ่า', 'ต่ออายุ', 'ตม.', 'เอกสาร', 'ไทย')
    ),
    'board_copy', jsonb_build_object(
      'category_badge_text', '살이 꿀팁',
      'category_description', '태국 생활에 바로 쓰는 짧은 정리 — 공식 확인은 필수'
    ),
    'sources', jsonb_build_array(
      jsonb_build_object(
        'external_url', 'https://www.thaijaworld.com/editorial/knowledge/2026-04-visa-long-stay-checklist',
        'source_name', 'Thai Ja World Editorial',
        'retrieved_at', '2026-04-10T00:00:00Z'
      )
    )
  );

  v_excerpt :=
    '장기체류나 비자 종류 변경을 준비할 때는 여권·사진·재정·거주 증빙처럼 자주 요구되는 항목을 한곳에 모아두면 창구에서 덜 헤매요.';

  v_content := concat_ws(
    E'\n',
    '요약',
    v_clean #>> '{ko,summary}',
    '',
    '체크리스트',
    '- 여권 원본·사본, 잔여 유효기간(통상 6개월 이상 여유 권장)',
    '- 증명사진 규격·촬영 시점(예: 6개월 이내) 확인',
    '- 거주·주소 관련 증빙(해당 시 TM30 등)',
    '- 은행잔고·재정 증빙(비자 유형별로 상이)',
    '- 기존 비자·입출국 스탬프 사진 백업(여권 분실 대비)',
    '',
    '주의사항',
    '- 법률 자문이 아닙니다. 비자·체류 절차는 반드시 이민국·대사관·공식 사이트에서 최종 확인하세요.',
    '- 규정·수수료·서류 목록은 통보 없이 바뀔 수 있습니다.',
    '',
    '태그',
    '#비자 #연장 #이민국 #체류 #서류 #태국',
    '',
    '출처',
    '- https://www.thaijaworld.com/editorial/knowledge/2026-04-visa-long-stay-checklist',
    '',
    '---',
    'ไทย 요약',
    v_clean #>> '{th,summary}',
    '',
    'เช็กลิสต์',
    '- หนังสือเดินทางตัวจริง/สำเนา และความครบถ้วนของอายุ',
    '- รูปถ่ายตามสเปกที่กำหนด',
    '- หลักฐานที่อยู่ (ถ้าจำเป็น)',
    '- หลักฐานการเงินตามประเภทวีซ่า',
    '- สำรองรูปประทับตราขาเข้า-ออก',
    '',
    'ข้อควรระวัง',
    '- นี่ไม่ใช่คำแนะนำทางกฎหมาย โปรดตรวจสอบกับสถานทูต/ตม.เสมอ',
    '- กฎและค่าธรรมเนียมอาจเปลี่ยนได้โดยไม่แจ้งล่วงหน้า',
    '',
    'แท็ก',
    '#วีซ่า #ต่ออายุ #ตม. #เอกสาร #ไทย'
  );

  perform public.migration_074_seed_one_editorial_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/knowledge/2026-04-visa-long-stay-checklist',
    '장기체류·비자 연장 전 서류·일정 체크리스트 (편집)',
    v_clean,
    '장기체류·비자 연장 전 서류·일정 체크리스트 (편집)',
    v_content,
    v_excerpt
  );

  -- ② TM30 vs 90일 리포트 개요
  v_clean := jsonb_build_object(
    'board_target', 'tips_board',
    'editorial_meta', jsonb_build_object(
      'novelty_score', 70,
      'usefulness_score', 86,
      'confidence_level', 'medium',
      'reasons', jsonb_build_array('용어 혼동 줄이기', '공식 절차는 지역·사안별 상이')
    ),
    'ko', jsonb_build_object(
      'title', 'TM30(주소 신고)와 90일 리포트(TM47) — 기본만 짚기 (편집)',
      'summary',
      $k2$
현장에서 자주 헷갈리는 **주소 신고(TM30 계열)**와 **장기 체류자의 90일 방문 신고(TM47 계열)**는 목적·대상·제출 창구가 다를 수 있어요. 이름만 비슷해 보여도 «내게 지금 무엇이 필요한지»는 체류 자격·거주 형태에 따라 달라집니다.

위반 시 불이익 사례가 보고되기도 하니, **거주지 변경·숙소 유형이 바뀌었는지**부터 점검해 보세요. 숙소·임대인 측에서 신고를 대신 처리해 주는 경우도 있어요.

아래 설명은 일반 소개이며, 적용 여부는 개인별로 다릅니다.
$k2$,
      'checklist', jsonb_build_array(
        '최근 거주지·숙박 유형(단기/월세/가족 주소) 정리',
        '여권 스탬프·허가 기간과 메모 대조',
        '가까운 이민국/지정 창구·온라인 가능 여부 확인(지역별 상이)',
        '접수 증빙(접수 번호·영수증) 스캔 저장'
      ),
      'cautions', jsonb_build_array(
        '절차명·양식은 변경될 수 있습니다. 반드시 이민국·공식 FAQ로 확인하세요.',
        '법률 자문이 아닙니다. 복잡한 경우 전문가 상담을 고려하세요.'
      ),
      'tags', jsonb_build_array('TM30', '90일', '리포트', '이민국', '체류')
    ),
    'th', jsonb_build_object(
      'title', 'TM30 กับ รายงาน 90 วัน — แยกให้เข้าใจเบื้องต้น (บรรณาธิการ)',
      'summary',
      $t2$
การแจ้งที่อยู่/ที่พัก และการรายงานตัวตามรอบ 90 วันสำหรับผู้พำนักระยะยาว มีคนละเงื่อนไขและช่องทาง ไม่ควรสรุปว่าเหมือนกันเพราะชื่อคล้ายกัน

หากที่พักหรือรูปแบบการอยู่อาศัยเปลี่ยน ควรตรวจว่ามีขั้นตอนใดที่ต้องทำเพิ่ม บางที่พักช่วยแจ้งแทนได้

นี่คือภาพรวมเบื้องต้นเท่านั้น กรณีจริงขึ้นกับสถานะแต่ละบุคคล
$t2$,
      'checklist', jsonb_build_array(
        'สรุปที่อยู่ปัจจุบันและประเภทที่พัก',
        'เทียบประทับตรา/วันครบกำหนดกับบันทึกของคุณ',
        'ตรวจช่องทางในพื้นที่ของคุณ (ออนไลน์/หน้างาน)',
        'เก็บหลักฐานการยื่นเป็นดิจิทัล'
      ),
      'cautions', jsonb_build_array(
        'ระเบียบและแบบฟอร์มอาจเปลี่ยน โปรดยึดประกาศ ตม. เป็นหลัก',
        'ไม่ใช่คำแนะนำทางกฎหมาย'
      ),
      'tags', jsonb_build_array('TM30', '90วัน', 'ตม.', 'รายงาน', 'ที่อยู่')
    ),
    'board_copy', jsonb_build_object(
      'category_badge_text', '살이 꿀팁',
      'category_description', '용어·절차 기본 — 공식 확인 필수'
    ),
    'sources', jsonb_build_array(
      jsonb_build_object(
        'external_url', 'https://www.thaijaworld.com/editorial/knowledge/2026-04-tm30-vs-90day-report',
        'source_name', 'Thai Ja World Editorial',
        'retrieved_at', '2026-04-10T00:00:00Z'
      )
    )
  );

  v_excerpt :=
    '주소 신고와 90일 방문 신고는 목적·대상이 다를 수 있어요. 체류 자격·거주 형태에 따라 필요한 절차를 공식 안내로 확인하세요.';

  v_content := concat_ws(
    E'\n',
    '요약',
    v_clean #>> '{ko,summary}',
    '',
    '체크리스트',
    '- 최근 거주지·숙박 유형(단기/월세/가족 주소) 정리',
    '- 여권 스탬프·허가 기간과 메모 대조',
    '- 가까운 이민국/지정 창구·온라인 가능 여부 확인(지역별 상이)',
    '- 접수 증빙(접수 번호·영수증) 스캔 저장',
    '',
    '주의사항',
    '- 절차명·양식은 변경될 수 있습니다. 반드시 이민국·공식 FAQ로 확인하세요.',
    '- 법률 자문이 아닙니다. 복잡한 경우 전문가 상담을 고려하세요.',
    '',
    '태그',
    '#TM30 #90일 #리포트 #이민국 #체류',
    '',
    '출처',
    '- https://www.thaijaworld.com/editorial/knowledge/2026-04-tm30-vs-90day-report',
    '',
    '---',
    'ไทย 요약',
    v_clean #>> '{th,summary}',
    '',
    'เช็กลิสต์',
    '- สรุปที่อยู่ปัจจุบันและประเภทที่พัก',
    '- เทียบประทับตรา/วันครบกำหนดกับบันทึกของคุณ',
    '- ตรวจช่องทางในพื้นที่ของคุณ (ออนไลน์/หน้างาน)',
    '- เก็บหลักฐานการยื่นเป็นดิจิทัล',
    '',
    'ข้อควรระวัง',
    '- ระเบียบและแบบฟอร์มอาจเปลี่ยน โปรดยึดประกาศ ตม. เป็นหลัก',
    '- ไม่ใช่คำแนะนำทางกฎหมาย',
    '',
    'แท็ก',
    '#TM30 #90วัน #ตม. #รายงาน #ที่อยู่'
  );

  perform public.migration_074_seed_one_editorial_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/knowledge/2026-04-tm30-vs-90day-report',
    'TM30(주소 신고)와 90일 리포트(TM47) — 기본만 짚기 (편집)',
    v_clean,
    'TM30(주소 신고)와 90일 리포트(TM47) — 기본만 짚기 (편집)',
    v_content,
    v_excerpt
  );

  -- ③ 입국 스탬프·체류 기간 확인
  v_clean := jsonb_build_object(
    'board_target', 'tips_board',
    'editorial_meta', jsonb_build_object(
      'novelty_score', 78,
      'usefulness_score', 88,
      'confidence_level', 'medium',
      'reasons', jsonb_build_array('분실·오인 방지', '현장 질문 대비')
    ),
    'ko', jsonb_build_object(
      'title', '입국 스탬프·허가된 체류, 여권에서 확인하는 습관 (편집)',
      'summary',
      $k3$
입국 후에는 여권의 **입국 도장(날짜·체류 조건 표기)**를 바로 사진으로 남겨 두면, 은행·통신·임대 등 현지 절차에서 «언제 들어왔는지»를 설명하기 쉬워요.

허가된 체류 기간을 넘기면 불이익이 커질 수 있으니, **출국 일정·연장 필요 여부**를 달력에 같이 적어 두세요. 항공편 지연 등으로 날짜가 바뀌면 우선순위를 다시 점검하는 것이 안전합니다.

스탬프가 흐릿하거나 잘못 찍힌 것 같으면, 가능한 빨리 현장 데스크에 문의하는 편이 좋아요.
$k3$,
      'checklist', jsonb_build_array(
        '입국 직후 여권 스탬프 페이지 사진 백업(클라우드+로컬)',
        '허가 기간·다음 출국/연장 마감일을 달력에 기록',
        'e-Visa/사전 승인을 쓴 경우 종이 출력본·참조 번호도 함께 보관',
        '여권 분실 시 대사관·신고 절차 카드 링크 저장'
      ),
      'cautions', jsonb_build_array(
        '체류 요건은 입국 목적·비자 유형에 따라 다릅니다. 잘못된 이해로 만료일을 넘기지 않도록 공지를 확인하세요.',
        '법률 자문이 아닙니다.'
      ),
      'tags', jsonb_build_array('입국', '스탬프', '체류기간', '여권', '태국')
    ),
    'th', jsonb_build_object(
      'title', 'ตราประทับขาเข้า·ระยะเวลาพำนัก — สรวจพาสปอร์ตให้เป็นนิสัย (บรรณาธิการ)',
      'summary',
      $t3$
หลังเข้าประเทศ ควรถ่ายรูปหน้าประทับคู่หนังสือเดินทางทันที และจดวันครบกำหนดให้ชัดเจน เพื่อใช้อ้างอิงเมื่อทำธุรกรรมในประเทศ

หากสงสัยว่าประทับไม่ชัดหรือผิดพลาด ควรสอบถามเจ้าหน้าที่โดยเร็ว

การคำนวณวันพำนักต้องยึดตามเงื่อนไขของประเภทการเข้าประเทศของคุณ
$t3$,
      'checklist', jsonb_build_array(
        'สำรองรูปประทับทันที',
        'จดวันต้องออก/ต่ออายุบนปฏิทิน',
        'เก็บหมายเลขอ้างอิงวีซ่าอิเล็กทรอนิกส์',
        'เตรียมลิงก์ขั้นตอนกรณีหนังสือเดินทางสูญหาย'
      ),
      'cautions', jsonb_build_array(
        'เงื่อนไขการพำนักขึ้นกับประเภทการเข้าประเทศ โปรดตรวจประกาศทางการ',
        'ไม่ใช่คำแนะนำทางกฎหมาย'
      ),
      'tags', jsonb_build_array('ตราประทับ', 'พำนัก', 'หนังสือเดินทาง', 'ไทย')
    ),
    'board_copy', jsonb_build_object(
      'category_badge_text', '살이 꿀팁',
      'category_description', '여권 습관 — 분쟁·실수 예방'
    ),
    'sources', jsonb_build_array(
      jsonb_build_object(
        'external_url', 'https://www.thaijaworld.com/editorial/knowledge/2026-04-entry-stamp-stay',
        'source_name', 'Thai Ja World Editorial',
        'retrieved_at', '2026-04-10T00:00:00Z'
      )
    )
  );

  v_excerpt :=
    '입국 후 여권 입국 도장을 바로 사진으로 남기고, 허가된 체류 기간·출국/연장 일정을 달력에 적어 두면 현지 절차가 훨씬 수월해요.';

  v_content := concat_ws(
    E'\n',
    '요약',
    v_clean #>> '{ko,summary}',
    '',
    '체크리스트',
    '- 입국 직후 여권 스탬프 페이지 사진 백업(클라우드+로컬)',
    '- 허가 기간·다음 출국/연장 마감일을 달력에 기록',
    '- e-Visa/사전 승인을 쓴 경우 종이 출력본·참조 번호도 함께 보관',
    '- 여권 분실 시 대사관·신고 절차 카드 링크 저장',
    '',
    '주의사항',
    '- 체류 요건은 입국 목적·비자 유형에 따라 다릅니다. 잘못된 이해로 만료일을 넘기지 않도록 공지를 확인하세요.',
    '- 법률 자문이 아닙니다.',
    '',
    '태그',
    '#입국 #스탬프 #체류기간 #여권 #태국',
    '',
    '출처',
    '- https://www.thaijaworld.com/editorial/knowledge/2026-04-entry-stamp-stay',
    '',
    '---',
    'ไทย 요약',
    v_clean #>> '{th,summary}',
    '',
    'เช็กลิสต์',
    '- สำรองรูปประทับทันที',
    '- จดวันต้องออก/ต่ออายุบนปฏิทิน',
    '- เก็บหมายเลขอ้างอิงวีซ่าอิเล็กทรอนิกส์',
    '- เตรียมลิงก์ขั้นตอนกรณีหนังสือเดินทางสูญหาย',
    '',
    'ข้อควรระวัง',
    '- เงื่อนไขการพำนักขึ้นกับประเภทการเข้าประเทศ โปรดตรวจประกาศทางการ',
    '- ไม่ใช่คำแนะนำทางกฎหมาย',
    '',
    'แท็ก',
    '#ตราประทับ #พำนัก #หนังสือเดินทาง #ไทย'
  );

  perform public.migration_074_seed_one_editorial_tip(
    v_author,
    'https://www.thaijaworld.com/editorial/knowledge/2026-04-entry-stamp-stay',
    '입국 스탬프·허가된 체류, 여권에서 확인하는 습관 (편집)',
    v_clean,
    '입국 스탬프·허가된 체류, 여권에서 확인하는 습관 (편집)',
    v_content,
    v_excerpt
  );
end;
$seed$;

drop function if exists public.migration_074_seed_one_editorial_tip(
  uuid,
  text,
  text,
  jsonb,
  text,
  text,
  text
);
