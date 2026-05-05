/**
 * 한인 생활망 연락처 — **저장·표시용으로 전화번호를 XX 등으로 바꾸지 않는다.**
 * 구글 Places 등 원본은 그대로 두고, UI/채팅 링크는 신뢰도에 따라 숨기거나 비활성화한다.
 */

/** 전화가 비었거나 XX·비공개 등으로 즉시 통화·wa.me 생성이 부적절한 경우 */
export function isMaskedOrPlaceholderPhone(phone: string | null | undefined): boolean {
  const p = String(phone ?? '').trim();
  if (!p) return true;
  if (/XX/i.test(p)) return true;
  if (/ＸＸ/.test(p)) return true;
  if (/미공개|비공개|없음|unknown|n\/a/i.test(p)) return true;
  return false;
}

/** 숫자만 (국번 포함) */
function digitsOnly(phone: string | null | undefined): string {
  return String(phone ?? '').replace(/\D/g, '');
}

/**
 * 사이트 자가치유·시드·테스트용으로 쓰인 **가짜/연속 번호** 패턴.
 * (실제 업체와 혼동되면 안 되는 구간 — UI에서 전화·자동 wa.me 비표시)
 */
export function isLikelySyntheticOrDemoPhone(phone: string | null | undefined): boolean {
  if (isMaskedOrPlaceholderPhone(phone)) return true;
  const d = digitsOnly(phone);
  if (d.length < 9 || d.length > 15) return true;
  if (/0{4,}/.test(d)) return true;
  if (/^(\d)\1{8,}$/.test(d)) return true;
  if (/^668100010\d{2}$/.test(d)) return true;
  if (/^668200020\d{2}$/.test(d)) return true;
  // 081-000-1234 / 02-000-0000 식 — 중간에 `000` 블록이 끼인 데모·더미
  if (/\d000\d{4}/.test(d)) return true;
  if (/000\d{4}$/.test(d)) return true;
  return false;
}

/** DB 시드·자가치유용 `google_place_id` — 실연락처로 취급하지 않음 */
export function isDemoKoreanBizPlaceId(googlePlaceId: string | null | undefined): boolean {
  const s = String(googlePlaceId ?? '').trim();
  return /^taeja_(seed|sh)_/i.test(s);
}

/** 시드용 LINE·웹 채널 URL(실제 업체 아님) */
export function isPlaceholderKoreanBizChatUrl(url: string | null | undefined): boolean {
  const u = String(url ?? '').trim().toLowerCase();
  if (!u) return false;
  return (
    u.includes('taeja_seed') ||
    u.includes('taeja-sh') ||
    u.includes('@taeja_seed') ||
    u.includes('@taeja_sh')
  );
}

/** wa.me / send?phone= 경로의 번호가 시드·가짜 패턴이면 true */
export function isLikelySyntheticWhatsappHref(url: string | null | undefined): boolean {
  const s = String(url ?? '').trim();
  const wa = s.match(/wa\.me\/\+?(\d{8,15})/i);
  if (wa?.[1]) return isLikelySyntheticOrDemoPhone(wa[1]);
  const send = s.match(/phone=\+?(\d{8,15})/i);
  if (send?.[1]) return isLikelySyntheticOrDemoPhone(send[1]);
  return false;
}

/**
 * Places 등에서 온 문자열을 **마스킹 없이** 저장용으로 정리한다 (공백만 정규화).
 */
export function preservePhoneFromPlaces(raw: string | null | undefined): string | null {
  const t = String(raw ?? '').replace(/\s+/g, ' ').trim();
  return t.length ? t : null;
}

/** E.164 등에서 숫자만 추출해 wa.me 링크 생성 — **가짜·시드 번호면 null** */
export function buildWhatsAppUrlFromPhone(phone: string | null | undefined): string | null {
  if (isLikelySyntheticOrDemoPhone(phone)) return null;
  const digits = String(phone).replace(/[^\d]/g, '');
  if (digits.length < 8) return null;
  let n = digits;
  if (n.startsWith('0')) n = `66${n.slice(1)}`;
  if (!n.startsWith('66')) n = `66${n}`;
  return `https://wa.me/${n}`;
}

export function normalizeExternalChatUrl(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return null;
  if (isPlaceholderKoreanBizChatUrl(s)) return null;
  if (/wa\.me|whatsapp\.com/i.test(s) && isLikelySyntheticWhatsappHref(s)) return null;
  return s;
}
