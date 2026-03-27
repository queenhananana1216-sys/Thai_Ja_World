/**
 * 로그인/가입 폼에서 Turnstile 토큰을 서버에 맡겨 검증할 때 사용.
 */
export type VerifyTurnstileClientResult =
  | { ok: true }
  | { ok: false; reason: 'missing_token' | 'verify_failed'; codes?: string[] };

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

    // /api/auth/verify-turnstile 가 반환하는 error-codes 를 프론트에 그대로 전달한다.
    // (reason 은 고정으로 두고, codes 로 원인을 더 정확히 파악한다.)
    try {
      const json = (await res.json()) as { error?: string; codes?: string[] };
      if (json.error === 'missing_token') return { ok: false, reason: 'missing_token' };
      return { ok: false, reason: 'verify_failed', codes: json.codes ?? [] };
    } catch {
      return { ok: false, reason: 'verify_failed' };
    }
  } catch {
    return { ok: false, reason: 'verify_failed' };
  }
}

/**
 * Supabase 대시보드에서 Auth CAPTCHA(Turnstile)를 켠 경우 signUp / signInWithPassword /
 * signInWithOtp 의 options 에 이 객체를 펼쳐 넣어야 한다. (안 넣으면 "captcha verification" 실패)
 */
export function supabaseAuthCaptchaOptions(
  hasTurnstileUi: boolean,
  token: string | null,
): { captchaToken: string } | undefined {
  const t = token?.trim();
  if (!hasTurnstileUi || !t) return undefined;
  return { captchaToken: t };
}
