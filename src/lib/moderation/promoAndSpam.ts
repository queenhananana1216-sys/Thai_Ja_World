import type { PostCategorySlug } from '@/lib/community/postCategories';

const COMMERCIAL_OK: PostCategorySlug[] = ['flea', 'job'];

function isCommercialOk(cat: PostCategorySlug): boolean {
  return COMMERCIAL_OK.includes(cat);
}

/** 사기·불법 금융 유도 — 어떤 말머리든 즉시 벤 후보 */
const SCAM_FINANCE = [
  /\busdt\b/i,
  /\bUSDT\b/,
  /테더/,
  /무통장\s*입금.*환전|환전.*무통장/,
  /(?:보장|확정)\s*수익/,
  /월\s*\d{2,4}\s*만/,
  /(?:비자|계좌)\s*팝니다|계좌\s*대여/,
  /ส่งเงิน|โอนเงิน.*รับ.*กำไร/i,
];

/** 홍보·외부 유입 집중 (한줄 장터/구인 외 말머리에서 금지) */
const PROMO_CHANNELS = [
  /t\.me\/[\w+/]+/i,
  /telegram\.(me|dog)\//i,
  /오픈(?:카톡|톡|채팅)/,
  /카톡\s*방|카카오\s*오픈채팅/,
  /line\.me\/ti\/g\//i,
  /open\.kakao\.com/i,
  /discord\.(gg|com\/invite)/i,
  /wa\.me\/\d/i,
  /bit\.ly\/[\w-]+/i,
];

const URL_PATTERN = /https?:\/\/[^\s]+/gi;

export type LocalModerationResult =
  | { kind: 'ok' }
  | { kind: 'reject_promo'; messageKey: 'promo' }
  | { kind: 'reject_spam'; messageKey: 'promo' }
  | { kind: 'ban_scam'; messageKey: 'scam' };

function countMatches(text: string, patterns: RegExp[]): number {
  let n = 0;
  for (const re of patterns) {
    re.lastIndex = 0;
    const m = text.match(re);
    if (m) n += m.length;
  }
  return n;
}

/**
 * 휴리스틱 홍보·사기 탐지. LLM 전에 저비용 1차 필터.
 */
export function runLocalPostChecks(
  title: string,
  content: string,
  category: PostCategorySlug,
): LocalModerationResult {
  const text = `${title}\n${content}`.toLowerCase();

  for (const re of SCAM_FINANCE) {
    re.lastIndex = 0;
    if (re.test(`${title}\n${content}`)) {
      return { kind: 'ban_scam', messageKey: 'scam' };
    }
  }

  const urlCount = (`${title} ${content}`).match(URL_PATTERN)?.length ?? 0;
  const channelHits = countMatches(`${title}\n${content}`, PROMO_CHANNELS);

  if (!isCommercialOk(category)) {
    if (channelHits >= 1 && urlCount >= 2) {
      return { kind: 'reject_spam', messageKey: 'promo' };
    }
    if (channelHits >= 2) {
      return { kind: 'reject_spam', messageKey: 'promo' };
    }
    if (urlCount >= 4) {
      return { kind: 'reject_promo', messageKey: 'promo' };
    }
  }

  return { kind: 'ok' };
}

export function isPostImageUrlAllowedForUser(
  imageUrl: string,
  userId: string,
): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!base) return false;
  const encoded = `${base}/storage/v1/object/public/post-images/${userId}/`;
  return imageUrl.startsWith(encoded);
}
