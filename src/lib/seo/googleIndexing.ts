try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional in non-Next runtimes
  require('server-only');
} catch {
  // no-op: tsx / plain Node
}

import crypto from 'node:crypto';

import { getSiteBaseUrl } from '@/lib/seo/site';

type ServiceAccountJson = {
  client_email: string;
  private_key: string;
};

function parseServiceAccount(): ServiceAccountJson | null {
  const raw = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as ServiceAccountJson;
    if (!o?.client_email || !o?.private_key) return null;
    return o;
  } catch {
    return null;
  }
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf;
  return b
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signServiceAccountJwt(sa: ServiceAccountJson): string {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const body = `${header}.${payload}`;
  const key = sa.private_key.replace(/\\n/g, '\n');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(body);
  const sigB64 = sign.sign(key, 'base64url');
  return `${body}.${sigB64}`;
}

async function fetchAccessToken(sa: ServiceAccountJson): Promise<string | null> {
  const assertion = signServiceAccountJwt(sa);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    console.warn('[googleIndexing] token', res.status, (await res.text()).slice(0, 200));
    return null;
  }
  const j = (await res.json()) as { access_token?: string };
  return j.access_token ?? null;
}

export async function requestGoogleIndexing(absolutePageUrl: string): Promise<void> {
  const sa = parseServiceAccount();
  if (!sa) return;

  const base = getSiteBaseUrl();
  let u: URL;
  try {
    u = new URL(absolutePageUrl);
  } catch {
    console.warn('[googleIndexing] invalid url', absolutePageUrl);
    return;
  }
  if (u.origin !== new URL(base).origin) {
    console.warn('[googleIndexing] skip foreign origin', absolutePageUrl);
    return;
  }

  const token = await fetchAccessToken(sa);
  if (!token) return;

  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: absolutePageUrl,
      type: 'URL_UPDATED',
    }),
  });
  if (!res.ok) {
    console.warn('[googleIndexing] publish', res.status, (await res.text()).slice(0, 280));
  }
}
