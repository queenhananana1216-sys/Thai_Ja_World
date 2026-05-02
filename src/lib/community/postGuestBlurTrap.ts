/**
 * 커뮤니티 게시글(`posts`) — 비회원 CVR용 본문 블러(티저) 대상 판별.
 * HOT·꿀팁·제보 성격 글만 게이트 (무분별한 블러 방지).
 */
export type CommunityPostBlurSignals = {
  title: string;
  category: string;
  view_count: number;
  comment_count: number;
  is_knowledge_tip: boolean;
};

/** 포털 HOT 조회 기준(≈72)과 맞춤 */
const HOT_VIEW_MIN = 72;
const HOT_ENGAGE_COMMENT_MIN = 12;
const HOT_ENGAGE_VIEW_MIN = 35;

export function shouldBlurCommunityPostForGuest(p: CommunityPostBlurSignals): boolean {
  const title = String(p.title ?? '');
  if (p.is_knowledge_tip) return true;
  const cat = String(p.category ?? '');
  if (cat === 'info' || cat === 'restaurant') return true;
  if (/제보|[\[][^\]]*제보|긴급\s*제보/i.test(title)) return true;
  if (/🔥|\bhot\b/i.test(title)) return true;
  const vc = Number(p.view_count ?? 0);
  const cc = Number(p.comment_count ?? 0);
  if (vc >= HOT_VIEW_MIN) return true;
  if (cc >= HOT_ENGAGE_COMMENT_MIN && vc >= HOT_ENGAGE_VIEW_MIN) return true;
  return false;
}

/** 비회원에게 노출할 본문 티저 — 줄바꿈 2줄 우선, 한 덩어리면 문자 단위로 자름 */
export function extractGuestBlurPreview(content: string): string {
  const t = String(content ?? '').trim();
  if (!t) return '';
  const lines = t.split(/\r?\n/);
  if (lines.length >= 2) {
    return `${lines[0]}\n${lines[1]}`.trimEnd();
  }
  const line = lines[0] ?? '';
  if (line.length <= 96) return line;
  return `${line.slice(0, 88).trim()}…`;
}
