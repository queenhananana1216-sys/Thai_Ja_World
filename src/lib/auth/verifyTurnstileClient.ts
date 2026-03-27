/**
 * 로그인/가입 폼에서 Turnstile 토큰 존재 여부만 확인한다.
 *
 * Cloudflare Turnstile 토큰은 보통 **1회만** siteverify 가능하다.
 * 여기서 /api/auth/verify-turnstile 로 먼저 검증한 뒤 같은 토큰을 Supabase
 * `captchaToken` 으로 넘기면, Supabase 쪽 두 번째 검증이 실패해
 * "captcha verification process failed" 가 난다.
 * 따라서 Supabase Auth CAPTCHA 를 쓰는 흐름에서는 **원격 사전 검증을 하지 않는다.**
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
  return { ok: true };
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
