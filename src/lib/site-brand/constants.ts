/** DB·환경 변수가 비었을 때만 쓰는 기본 표시명 (레거시 카피 치환 기준 문자열과 동일 계열) */
export const DEFAULT_SITE_DISPLAY_NAME = '태국에, 살자';

/**
 * site_settings·환경 변수에 옛 브랜드가 남아 있어도 공개 UI·메타에는 현재 표시명만 쓰도록 정규화합니다.
 */
export function normalizeSiteDisplayNameForUi(raw: string): string {
  const t = raw.trim().slice(0, 120);
  if (!t) return DEFAULT_SITE_DISPLAY_NAME;
  const collapsed = t.replace(/\s+/g, ' ');
  const lower = collapsed.toLowerCase();
  if (lower.includes('taeja') || lower.includes('thaija')) return DEFAULT_SITE_DISPLAY_NAME;
  if (collapsed.includes('태자')) return DEFAULT_SITE_DISPLAY_NAME;
  if (collapsed === '태국에 살자') return DEFAULT_SITE_DISPLAY_NAME;
  return collapsed;
}

/** 사전·메타 등에서 치환할 레거시 표기 (긴 구문을 앞에 둠). UI 카피에 넣지 말 것 — 탐지·치환 전용. */
export const LEGACY_SITE_BRAND_PHRASES = [
  'Taeja World',
  'ThaiJa World',
  '태자월드',
  '태자 월드',
  '태국에 살자',
  '태국에, 살자',
] as const;

/** «리포터 정리 중» 유령 UX 대체 — 뉴스·404·레이더 공통 */
export const BRAND_PIPELINE_GATHERING_KO =
  '태국 현장 20년 차 베테랑 데스크가 오늘의 정보를 수집·정리하고 있어요. 잠시 후 새로고침하시면 한 줄 요약과 대비책이 붙은 글로 다시 만나실 수 있습니다.';

export const BRAND_PIPELINE_PARTIAL_LOAD_KO =
  '일부 카드는 아직 따라오는 중이에요. 베테랑 데스크가 데이터를 붙이면 곧 채워집니다. 새로고침 한 번 부탁드려요.';

export const BRAND_HOME_LIVE_FEED_EMPTY_KO =
  '아직 오늘자 라이브 글이 비어 있어요. 커뮤니티에 첫 이야기를 남기거나, 뉴스·꿀팁에서 최신 정보를 둘러보세요.';

export const BRAND_PIPELINE_GATHERING_TH =
  'ทีมงานที่คุ้นเคยชีวิตในไทยกำลังรวบรวมและเรียบเรียงข้อมูลวันนี้ — รีเฟรชอีกครั้งแล้วจะได้อ่านฉบับเต็มพร้อมแนวรับมือ';
