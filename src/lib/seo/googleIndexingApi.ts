import 'server-only';

import { createSign } from 'node:crypto';
import { recordPipelineErrorEvent } from '@/lib/pipeline/pipelineErrorLearning';

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

/** 서비스 계정 JSON 원문 — `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON` 우선, 구 오명 `GOOGLE_INDEXING_API_KEY` 폴백(값은 JSON). */
export function readGoogleIndexingServiceAccountJson(): string {
  return (
    process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_INDEXING_API_KEY?.trim() ||
    ''
  );
}

export type ParsedGoogleIndexingServiceAccount = {
  client_email: string;
  /** PEM — JWT 서명 시 `\\n` → 줄바꿈으로 치환 */
  private_key: string;
};

function stripBomMarkdownFences(input: string): string {
  let s = input.trim();
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1).trim();
  if (/^```/u.test(s)) {
    s = s.replace(/^```(?:json)?\s*/iu, '').replace(/\s*```\s*$/u, '').trim();
  }
  return s;
}

/**
 * Vercel 한 줄·여러 줄·코드펜스·이중 JSON 문자열 등 흔한 붙여넣기 변형을 흡수한다.
 * (비밀 값은 로그하지 말 것.)
 */
export function parseGoogleIndexingServiceAccount(raw: string): ParsedGoogleIndexingServiceAccount | null {
  let s = stripBomMarkdownFences(raw);
  if (!s) return null;

  const tryParse = (txt: string): unknown => {
    try {
      return JSON.parse(txt) as unknown;
    } catch {
      return null;
    }
  };

  let obj: unknown = tryParse(s);
  if (typeof obj === 'string') {
    obj = tryParse(String(obj).trim());
  }
  if (!obj || typeof obj !== 'object') return null;

  const rec = obj as Record<string, unknown>;
  const client_email = typeof rec.client_email === 'string' ? rec.client_email.trim() : '';
  const pkRaw = typeof rec.private_key === 'string' ? String(rec.private_key) : '';
  if (!client_email || !pkRaw) return null;

  const normalized = pkRaw.replace(/\\n/g, '\n');
  if (!normalized.includes('BEGIN') || normalized.length < 120) return null;

  return { client_email, private_key: pkRaw };
}

export function isGoogleIndexingConfigured(): boolean {
  const raw = readGoogleIndexingServiceAccountJson();
  if (!raw) return false;
  return parseGoogleIndexingServiceAccount(raw) != null;
}

async function getGoogleIndexingAccessToken(): Promise<{ token: string } | { error: string }> {
  const raw = readGoogleIndexingServiceAccountJson();
  if (!raw) return { error: 'missing_config' };

  const sa = parseGoogleIndexingServiceAccount(raw);
  if (!sa) return { error: 'invalid_json' };
  const email = sa.client_email;
  const pkRaw = sa.private_key;

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
    return { error: `token_${tokenRes.status}:${t.slice(0, 240)}` };
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) return { error: 'no_access_token' };
  return { token: tokenJson.access_token };
}

function coerceIndexingMeta(
  meta?: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  if (!meta) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else if (v !== undefined) {
      out[k] = String(v);
    }
  }
  return out;
}

async function recordIndexingFailure(reasonCode: string, excerpt: string, meta?: Record<string, unknown>): Promise<void> {
  if (reasonCode === 'missing_config') return;
  await recordPipelineErrorEvent({
    scope: 'seo.google_indexing',
    reasonCode,
    messageExcerpt: excerpt.slice(0, 500),
    meta: coerceIndexingMeta(meta),
  });
}

/**
 * Google Indexing API (`URL_UPDATED`).
 * 환경 변수 `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON`(또는 구명 `GOOGLE_INDEXING_API_KEY`)에 서비스 계정 JSON 한 줄.
 */
export async function publishGoogleIndexingUrlUpdate(
  pageUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const tokenRes = await getGoogleIndexingAccessToken();
  if ('error' in tokenRes) {
    void recordIndexingFailure(String(tokenRes.error), pageUrl, { url: pageUrl });
    return { ok: false, error: tokenRes.error };
  }

  const pubRes = await fetch(PUBLISH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenRes.token}`,
    },
    body: JSON.stringify({ url: pageUrl, type: 'URL_UPDATED' }),
  });
  if (!pubRes.ok) {
    const t = await pubRes.text();
    const err = `publish_${pubRes.status}:${t.slice(0, 240)}`;
    void recordIndexingFailure(`HTTP_${pubRes.status}`, `${pageUrl} ${err}`, { url: pageUrl });
    return { ok: false, error: err };
  }
  return { ok: true };
}

/** 배치 URL 알림 — 일일 쿼터(기본 200) 내에서 `maxUrls` 까지 순차 전송. */
export async function batchPublishGoogleIndexingUrlUpdates(
  urls: string[],
  opts?: { maxUrls?: number; delayMs?: number },
): Promise<{ submitted: number; failed: number; errors: string[] }> {
  const maxUrls = Math.min(opts?.maxUrls ?? 45, 90);
  const delayMs = opts?.delayMs ?? 160;
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))].slice(0, maxUrls);

  const tokenRes = await getGoogleIndexingAccessToken();
  if ('error' in tokenRes) {
    return { submitted: 0, failed: unique.length, errors: [tokenRes.error] };
  }

  let submitted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const pageUrl of unique) {
    const pubRes = await fetch(PUBLISH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRes.token}`,
      },
      body: JSON.stringify({ url: pageUrl, type: 'URL_UPDATED' }),
    });
    if (!pubRes.ok) {
      const t = await pubRes.text();
      const err = `publish_${pubRes.status}:${t.slice(0, 120)}`;
      failed += 1;
      errors.push(`${pageUrl}: ${err}`);
    } else {
      submitted += 1;
    }
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  if (failed > 0) {
    await recordPipelineErrorEvent({
      scope: 'seo.google_indexing',
      reasonCode: submitted === 0 ? 'BATCH_ALL_FAILED' : 'BATCH_PARTIAL',
      messageExcerpt: errors.slice(0, 4).join(' | ').slice(0, 480),
      meta: { failed, submitted, total: unique.length },
    });
  }

  return { submitted, failed, errors };
}

export function logGoogleIndexingDevFailure(pageUrl: string, err: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  if (err === 'missing_config') return;
  console.warn('[google indexing]', pageUrl, err);
}
