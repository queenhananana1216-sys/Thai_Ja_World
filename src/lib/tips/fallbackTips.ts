import type { Locale } from '@/i18n/types';

type LocalizedText = { ko: string; th: string };

type FallbackTipSeed = {
  id: string;
  title: LocalizedText;
  excerpt: LocalizedText;
  created_at: string;
  body: LocalizedText;
  checklist: { ko: string[]; th: string[] };
  cautions: { ko: string[]; th: string[] };
  sourceUrl?: string;
};

export type FallbackTipItem = {
  id: string;
  title: string;
  excerpt: string;
  created_at: string;
  body: string;
  checklist: string[];
  cautions: string[];
  sourceUrl?: string;
};

const FALLBACK_TIPS: FallbackTipSeed[] = [
  {
    id: 'editorial-visa-long-stay-checklist',
    title: {
      ko: '장기체류·비자 연장 전 서류·일정 체크리스트',
      th: 'เช็กลิสต์เอกสารและแผนเวลาก่อนต่อวีซ่าระยะยาว',
    },
    excerpt: {
      ko: '여권·증명사진·재정·거주 증빙을 미리 한 세트로 준비하고, 수수료/예약 방식은 관할 기관 최신 안내로 다시 확인하세요.',
      th: 'เตรียมพาสปอร์ต รูปถ่าย หลักฐานการเงิน และที่อยู่ให้ครบเป็นชุดเดียว แล้วตรวจค่าธรรมเนียม/ระบบนัดล่าสุดกับหน่วยงานที่ดูแลอีกครั้ง',
    },
    created_at: '2026-04-10T00:00:00.000Z',
    body: {
      ko: '장기체류나 비자 연장을 준비할 때는 서류 누락으로 재방문하는 일이 가장 많습니다. 기본 서류를 먼저 묶어 두고, 방문 전날에는 관할 창구 기준으로 다시 점검하세요.',
      th: 'ตอนเตรียมต่อวีซ่าหรือพำนักระยะยาว ปัญหาที่เจอบ่อยที่สุดคือเอกสารตกหล่นจนต้องกลับไปใหม่ ควรรวมเอกสารพื้นฐานไว้ก่อน และตรวจทวนอีกครั้งตามเกณฑ์ของสำนักงานที่คุณจะไปก่อนวันยื่นจริง',
    },
    checklist: {
      ko: [
        '여권 원본/사본과 잔여 유효기간 확인',
        '증명사진 규격과 촬영 시점 확인',
        'TM30 등 거주지 증빙 준비',
        '비자 유형별 재정 증빙 재확인',
        '입출국 스탬프 사본/사진 백업',
      ],
      th: [
        'ตรวจพาสปอร์ตตัวจริง/สำเนา และวันหมดอายุคงเหลือ',
        'ตรวจสเปกรูปถ่ายและช่วงเวลาที่ถ่าย',
        'เตรียมหลักฐานที่อยู่ เช่น TM30',
        'ทวนหลักฐานการเงินตามประเภทวีซ่า',
        'สำรองสำเนา/รูปตราประทับเข้า-ออกประเทศ',
      ],
    },
    cautions: {
      ko: [
        '절차와 수수료는 수시로 변경될 수 있어 반드시 공식 채널로 최종 확인해야 합니다.',
        '본 내용은 일반 안내이며 법률 자문이 아닙니다.',
      ],
      th: [
        'ขั้นตอนและค่าธรรมเนียมมีโอกาสเปลี่ยนได้เสมอ ควรยืนยันกับช่องทางทางการก่อนทุกครั้ง',
        'เนื้อหานี้เป็นข้อมูลทั่วไป ไม่ใช่คำแนะนำทางกฎหมาย',
      ],
    },
    sourceUrl: 'https://www.thaijaworld.com/editorial/knowledge/2026-04-visa-long-stay-checklist',
  },
  {
    id: 'editorial-tm30-vs-90day-report',
    title: {
      ko: 'TM30(주소 신고)와 90일 리포트 기본 구분',
      th: 'แยกให้ชัด: TM30 (แจ้งที่อยู่) กับรายงานตัว 90 วัน',
    },
    excerpt: {
      ko: '이름이 비슷해도 목적과 대상이 다를 수 있어요. 내 체류 자격/거주 형태 기준으로 무엇을 해야 하는지 먼저 분리해 보세요.',
      th: 'ชื่อคล้ายกันแต่เป้าหมายและผู้รับผิดชอบอาจต่างกัน เริ่มจากแยกให้ชัดว่าตามสถานะพำนักและรูปแบบที่อยู่ของคุณต้องทำขั้นตอนไหน',
    },
    created_at: '2026-04-10T00:00:00.000Z',
    body: {
      ko: '현장에서 가장 많이 헷갈리는 것이 TM30 계열 신고와 90일 리포트입니다. 둘 다 "체류 관련" 절차지만 요건과 주체가 다를 수 있으니, 본인 상황(숙소, 체류 목적, 체류 자격)을 먼저 정리하는 게 핵심입니다.',
      th: 'เรื่องที่สับสนบ่อยที่สุดคือ TM30 กับรายงานตัว 90 วัน แม้จะเกี่ยวกับการพำนักเหมือนกัน แต่เงื่อนไขและผู้รับผิดชอบอาจไม่เหมือนกัน ดังนั้นควรสรุปสถานการณ์ของตัวเอง (ที่พัก วัตถุประสงค์การพำนัก สถานะวีซ่า) ให้ชัดก่อน',
    },
    checklist: {
      ko: [
        '현재 거주 형태(호텔/임대/가족 거주) 정리',
        '여권 스탬프와 체류 만료일 달력 등록',
        '관할 창구/온라인 접수 가능 여부 확인',
        '접수 번호/영수증 스캔 보관',
      ],
      th: [
        'สรุปรูปแบบที่พักปัจจุบัน (โรงแรม/เช่า/อยู่กับครอบครัว)',
        'บันทึกตราประทับและวันครบกำหนดพำนักในปฏิทิน',
        'ตรวจว่าพื้นที่ของคุณยื่นออนไลน์ได้หรือไม่',
        'เก็บเลขรับเรื่อง/ใบเสร็จไว้เป็นหลักฐาน',
      ],
    },
    cautions: {
      ko: [
        '절차명/양식/예외 조건은 지역별로 다를 수 있습니다.',
        '최종 판단은 이민국 및 공식 안내를 우선하세요.',
      ],
      th: [
        'ชื่อขั้นตอน แบบฟอร์ม และข้อยกเว้นอาจต่างกันตามพื้นที่',
        'การตัดสินใจสุดท้ายควรอ้างอิงประกาศจากตม.และหน่วยงานทางการ',
      ],
    },
    sourceUrl: 'https://www.thaijaworld.com/editorial/knowledge/2026-04-tm30-vs-90day-report',
  },
  {
    id: 'editorial-entry-stamp-stay-check',
    title: {
      ko: '입국 스탬프·체류기간 확인 습관 만들기',
      th: 'เช็กตราประทับเข้าเมืองและวันพำนักให้เป็นนิสัย',
    },
    excerpt: {
      ko: '입국 직후 스탬프를 사진으로 백업하고, 출국/연장 기준일을 캘린더에 기록해두면 실수와 과태료 리스크를 줄일 수 있어요.',
      th: 'ถ่ายสำรองตราประทับทันทีหลังเข้าประเทศ และจดวันออก/วันต้องต่ออายุไว้ในปฏิทิน จะช่วยลดความผิดพลาดและความเสี่ยงเรื่องค่าปรับ',
    },
    created_at: '2026-04-10T00:00:00.000Z',
    body: {
      ko: '태국 입국 후 바로 해야 할 기본 습관은 입국 스탬프 백업입니다. 이후 은행, 통신, 임대 등에서 체류 정보 확인이 필요할 때 훨씬 빠르게 대응할 수 있습니다.',
      th: 'นิสัยพื้นฐานที่ควรทำทันทีหลังเข้าประเทศคือสำรองรูปตราประทับเข้าเมือง เมื่อมีธุรกรรมที่ต้องยืนยันสถานะพำนัก เช่น ธนาคาร ซิม หรือสัญญาเช่า คุณจะจัดการได้เร็วขึ้นมาก',
    },
    checklist: {
      ko: [
        '입국 직후 여권 스탬프 페이지 사진 백업',
        '체류 만료일/출국 예정일 캘린더 기록',
        'e-Visa/사전 승인번호 별도 저장',
        '여권 분실 시 대응 링크/연락처 메모',
      ],
      th: [
        'ถ่ายสำรองหน้าตราประทับทันทีหลังผ่าน ตม.',
        'จดวันหมดกำหนดพำนัก/วันออกประเทศไว้ในปฏิทิน',
        'เก็บเลขอ้างอิง e-Visa หรือเอกสารอนุมัติล่วงหน้า',
        'จดลิงก์/เบอร์ติดต่อกรณีพาสปอร์ตสูญหาย',
      ],
    },
    cautions: {
      ko: [
        '비자 유형별 체류 규정은 다르므로 공지 변경 여부를 자주 확인하세요.',
        '불명확한 경우 출국일 직전에 확인하지 말고 미리 문의하세요.',
      ],
      th: [
        'กติกาการพำนักต่างกันตามประเภทวีซ่า ควรเช็กประกาศล่าสุดเป็นระยะ',
        'ถ้าไม่แน่ใจ อย่ารอจนใกล้วันเดินทาง ควรถามหน่วยงานที่เกี่ยวข้องล่วงหน้า',
      ],
    },
    sourceUrl: 'https://www.thaijaworld.com/editorial/knowledge/2026-04-entry-stamp-stay',
  },
];

export type FallbackTipSummary = Pick<FallbackTipItem, 'id' | 'title' | 'excerpt' | 'created_at'>;

function resolveLocale(locale: Locale): 'ko' | 'th' {
  return locale === 'th' ? 'th' : 'ko';
}

export function getFallbackTips(locale: Locale, limit = FALLBACK_TIPS.length): FallbackTipSummary[] {
  const current = resolveLocale(locale);
  return FALLBACK_TIPS.slice(0, Math.max(1, limit)).map((tip) => ({
    id: tip.id,
    title: tip.title[current],
    excerpt: tip.excerpt[current],
    created_at: tip.created_at,
  }));
}

export function getFallbackTipById(id: string, locale: Locale): FallbackTipItem | null {
  const current = resolveLocale(locale);
  const tip = FALLBACK_TIPS.find((item) => item.id === id);
  if (!tip) return null;
  return {
    id: tip.id,
    title: tip.title[current],
    excerpt: tip.excerpt[current],
    created_at: tip.created_at,
    body: tip.body[current],
    checklist: tip.checklist[current],
    cautions: tip.cautions[current],
    sourceUrl: tip.sourceUrl,
  };
}
