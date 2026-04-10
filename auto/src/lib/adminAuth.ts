import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'auto_admin';
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function getAdminSecret(): string | null {
  return process.env.AUTO_ADMIN_SECRET?.trim() || null;
}

export function createAdminCookieValue(secret: string): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const body = `${exp}`;
  const sig = sign(body, secret);
  return `${body}.${sig}`;
}

export function verifyAdminCookieValue(raw: string | null, secret: string): boolean {
  if (!raw?.includes('.')) return false;
  const [body, sig] = raw.split('.');
  if (!body || !sig) return false;
  const expected = sign(body, secret);
  try {
    if (sig.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function isAdminCookieValid(raw: string | null | undefined): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  if (!verifyAdminCookieValue(raw ?? null, secret)) return false;
  const exp = Number(raw?.split('.')[0]);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  return true;
}

export { COOKIE as ADMIN_COOKIE_NAME, MAX_AGE_SEC as ADMIN_COOKIE_MAX_AGE_SEC };
