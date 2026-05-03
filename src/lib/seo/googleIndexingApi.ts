import 'server-only';

import { createSign } from 'node:crypto';

const INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

function base64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

function base64urlSignature(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/u, '');
}

/**
 * Google Indexing API (`URL_UPDATED`).
 * 환경 변수 `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON`에 서비스 계정 JSON 전체(한 줄)를 둡니다.
 * Search Console 소유 확인·Indexing API 사용 설정이 되어 있어야 하며,
 * 일반 웹페이지는 정책상 거절될 수 있어 — 실패 시에도 게시 로직은 계속됩니다.
 */
export async function publishGoogleIndexingUrlUpdate(
  pageUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return { ok: false, error: 'missing_config' };

  let sa: { client_email?: string; private_key?: string };
  try {
    sa = JSON.parse(raw) as { client_email?: string; private_key?: string };
  } catch {
    return { ok: false, error: 'invalid_json' };
  }
  const email = typeof sa.client_email === 'string' ? sa.client_email.trim() : '';
  const pkRaw = typeof sa.private_key === 'string' ? sa.private_key : '';
  if (!email || !pkRaw) return { ok: false, error: 'invalid_sa' };

  const privateKey = pkRaw.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = base64urlJson({ alg: 'RS256', typ: 'JWT' });
  const payload = base64urlJson({
    iss: email,
    scope: INDEXING_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  });
  const unsigned = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const signature = base64urlSignature(sign.sign(privateKey));
  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    return { ok: false, error: `token_${tokenRes.status}:${t.slice(0, 240)}` };
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) return { ok: false, error: 'no_access_token' };

  const pubRes = await fetch(PUBLISH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenJson.access_token}`,
    },
    body: JSON.stringify({ url: pageUrl, type: 'URL_UPDATED' }),
  });
  if (!pubRes.ok) {
    const t = await pubRes.text();
    return { ok: false, error: `publish_${pubRes.status}:${t.slice(0, 240)}` };
  }
  return { ok: true };
}

export function logGoogleIndexingDevFailure(pageUrl: string, err: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (err === 'missing_config') return;
  console.warn('[google indexing]', pageUrl, err);
}
