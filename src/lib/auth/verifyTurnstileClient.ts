/**
 * 로그인/가입 폼에서 Turnstile 토큰을 서버에 맡겨 검증할 때 사용.
 */
export type VerifyTurnstileClientResult =
  | { ok: true }
  | { ok: false; reason: 'missing_token' | 'verify_failed' };

export async function verifyTurnstileOnSubmit(
  hasTurnstileUi: boolean,
  token: string | null,
): Promise<VerifyTurnstileClientResult> {
  if (!hasTurnstileUi) return { ok: true };
  if (!token?.trim()) return { ok: false, reason: 'missing_token' };
  try {
    const res = await fetch('/api/auth/verify-turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, reason: 'verify_failed' };
  } catch {
    return { ok: false, reason: 'verify_failed' };
  }
}
