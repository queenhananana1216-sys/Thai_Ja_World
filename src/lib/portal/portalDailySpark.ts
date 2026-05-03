/**
 * 포털 홈 — 서울 달력 기준 일일 «운세 한 줄 + 추천 미션» (site_settings `portal.daily_spark_ko`)
 * 크론이 갱신하고, LLM 키가 있으면 OpenAI 우선으로 한국어 전용 카피를 생성합니다.
 */

export const PORTAL_DAILY_SPARK_SETTING_KEY = 'portal.daily_spark_ko' as const;

export type PortalDailySparkPayload = {
  /** Asia/Seoul YYYY-MM-DD */
  spark_date: string;
  fortune_line: string;
  fortune_detail: string;
  mission_title: string;
  mission_body: string;
  mission_cta_href: string;
  /** deterministic | openai | gemini */
  source: 'deterministic' | 'openai' | 'gemini';
};

const FORTUNE_ROTATION: string[] = [
  '방콕 아침 공기가 오늘의 선택을 맑게 해 줄 거예요.',
  '태국 생활 백과처럼, 작은 확인 하나가 하루를 바꿉니다.',
  'BTS·MRT보다 먼저, 오늘은 내 일정부터 정돈해 볼까요?',
  '치앙마이 산바람 느낌으로, 마음만은 가볍게.',
  '파타야의 파도처럼 리듬을 타되, 안전선은 지키는 하루.',
  '푸켓 석양급 여유는 없어도, 10분 산책으로 비슷하게.',
  '아속 맛집 탐험가 모드 — 단, 배부른 뒤 영수증은 꼭 확인.',
];

const FORTUNE_DETAILS: string[] = [
  '교민 커뮤니티에서는 «작은 확인»이 큰 사고를 막는다는 말이 괜히 있는 게 아니에요. 오늘은 비자·TM30·임대 계약 중 하나만 체크해 보세요.',
  '날씨와 환율은 매일 조금씩 달라요. 오늘의 방콕·환율 스트립을 한 번 훑고 시작하면 마음이 덜 조급해집니다.',
  '광장에 올라온 생활 글 하나만 읽어도 오늘의 힌트가 보일 수 있어요. 댓글로 짧게 인사를 남겨 볼까요?',
];

const MISSION_TITLES: string[] = [
  '오늘의 태국 한 스푼',
  '살아가기 미션',
  '교민 데일리 체크',
  '작은 실천 한 가지',
];

const MISSION_BODIES: string[] = [
  '번개장터에서 필요한 물건 검색만 해 보기 — 검색창에 키워드 한 줄이면 충분해요.',
  '미니홈 피드에서 이웃 한 명의 글에 이모지 반응만 남겨 보기.',
  '광장 «생활정보»에서 최신 글 1개 읽고 마음에 드는 문장을 메모에 적어 두기.',
  '오늘 마신 커피값만큼 THAI 저축 루틴 상상해 보기 — 작게라도 시작이 중요해요.',
];

export function seoulYmd(d: Date): string {
  const s = d.toLocaleString('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' });
  return s.slice(0, 10);
}

/** 서버·크론 공통: 오늘(서울) 기본 스파크 (LLM 실패 시 폴백) */
export function buildDeterministicPortalSpark(now = new Date()): PortalDailySparkPayload {
  const spark_date = seoulYmd(now);
  const seed = spark_date.replace(/\D/g, '');
  const n = Number(seed) || 0;
  const i = n % FORTUNE_ROTATION.length;
  const j = (n >> 1) % FORTUNE_DETAILS.length;
  const k = (n >> 2) % MISSION_TITLES.length;
  const m = (n >> 3) % MISSION_BODIES.length;
  return {
    spark_date,
    fortune_line: FORTUNE_ROTATION[i]!,
    fortune_detail: FORTUNE_DETAILS[j]!,
    mission_title: MISSION_TITLES[k]!,
    mission_body: MISSION_BODIES[m]!,
    mission_cta_href: '/community/boards',
    source: 'deterministic',
  };
}
