/**
 * Supabase Phone Auth용 E.164 정규화 (태국·한국 로컬 형식 지원)
 * 본인인증 아님 — 문자 수신 가능 번호 확인용.
 */

export type NormalizePhoneResult =
  | { ok: true; e164: string }
  | { ok: false; reason: 'empty' | 'invalid' };

/**
 * - 이미 + 로 시작하면 10~15자리 숫자만 허용
 * - 태국: 0812345678 → +66812345678
 * - 한국: 01012345678 → +821012345678
 */
export function normalizePhoneToE164(raw: string): NormalizePhoneResult {
  const s = raw.replace(/[\s-]/g, '');
  if (!s) return { ok: false, reason: 'empty' };

  if (s.startsWith('+')) {
    const digits = s.slice(1);
    if (/^\d{10,15}$/.test(digits)) return { ok: true, e164: `+${digits}` };
    return { ok: false, reason: 'invalid' };
  }

  if (/^0[689]\d{8}$/.test(s)) {
    return { ok: true, e164: `+66${s.slice(1)}` };
  }

  if (/^01[0-9]\d{7,8}$/.test(s)) {
    return { ok: true, e164: `+82${s.slice(1)}` };
  }

  return { ok: false, reason: 'invalid' };
}
