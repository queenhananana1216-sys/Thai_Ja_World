/** 전화가 비었거나 XX 마스킹 등으로 실연락 불가로 보이는 경우 */
export function isMaskedOrPlaceholderPhone(phone: string | null | undefined): boolean {
  const p = String(phone ?? '').trim();
  if (!p) return true;
  if (/XX/i.test(p)) return true;
  if (/ＸＸ/.test(p)) return true;
  if (/미공개|비공개|없음|unknown|n\/a/i.test(p)) return true;
  return false;
}

/** E.164 등에서 숫자만 추출해 wa.me 링크 생성 (태국 +66 가정) */
export function buildWhatsAppUrlFromPhone(phone: string | null | undefined): string | null {
  if (isMaskedOrPlaceholderPhone(phone)) return null;
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
  return s;
}
