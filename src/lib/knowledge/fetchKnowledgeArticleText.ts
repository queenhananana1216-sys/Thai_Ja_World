/**
 * 지식 가공 단계용 — RSS 등으로 raw_body 가 비었을 때 출처 URL에서 본문 추출.
 * SSRF 방지: 사설 IP·localhost·메타데이터 주소 차단.
 */

const DEFAULT_FETCH_TIMEOUT_MS = 22_000;
const MAX_RESPONSE_BYTES = 1_500_000;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = raw ? Number.parseInt(raw.trim(), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function knowledgeFetchBodyMinChars(): number {
  return parsePositiveInt(process.env.KNOWLEDGE_FETCH_BODY_MIN_CHARS, 80);
}

export function knowledgeLlmInputMaxChars(): number {
  return Math.min(100_000, parsePositiveInt(process.env.KNOWLEDGE_LLM_INPUT_MAX_CHARS, 14_000));
}

export function knowledgeMaxRawBodyLenForDb(): number {
  return Math.min(500_000, parsePositiveInt(process.env.KNOWLEDGE_MAX_RAW_BODY_LEN, 2000));
}

/** 서버에서 사용자 제공 URL로 fetch 해도 되는지 (SSRF 완화) */
export function isSafeUrlForServerFetch(urlStr: string): boolean {
  let u: URL;
  try {
    u = new URL(urlStr.trim());
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) return false;
  if (host === '0.0.0.0' || host === '[::1]') return false;
  if (host === '169.254.169.254' || host.endsWith('.internal')) return false;
  if (host.startsWith('192.168.') || host.startsWith('10.')) return false;
  const m172 = /^172\.(\d+)\./.exec(host);
  if (m172) {
    const n = Number(m172[1]);
    if (n >= 16 && n <= 31) return false;
  }
  return true;
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * HTML → 플레인텍스트 (뉴스 기사 본문용 휴리스틱, 의존성 없음)
 */
export function htmlToArticlePlainText(html: string): string {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const articleM = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(h);
  if (articleM?.[1]) {
    h = articleM[1];
  } else {
    const mainM = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
    if (mainM?.[1]) h = mainM[1];
  }

  h = h
    .replace(/<\/(p|div|section|article|h[1-6]|li|tr|br)\b[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  const text = decodeBasicEntities(h)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return text;
}

function knowledgeFetchUserAgent(): string {
  const custom = process.env.KNOWLEDGE_FETCH_USER_AGENT?.trim();
  if (custom) return custom;
  // หลายสำนักข่าวบล็อกชื่อ bot ชัดเจน — ใช้ UA แบบเบราว์เซอร์เพื่อดึงบทความสาธารณะ (อ่านอย่างเดียว)
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
}

export async function fetchKnowledgeArticlePlainText(urlStr: string): Promise<string | null> {
  if (!isSafeUrlForServerFetch(urlStr)) return null;

  const timeoutMs = parsePositiveInt(process.env.KNOWLEDGE_PROCESS_FETCH_TIMEOUT_MS, DEFAULT_FETCH_TIMEOUT_MS);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(urlStr.trim(), {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': knowledgeFetchUserAgent(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'th-TH,th;q=0.95,ko-KR,ko;q=0.9,en-US,en;q=0.85',
      },
    });
    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_RESPONSE_BYTES) return null;

    const html = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    const plain = htmlToArticlePlainText(html);
    return plain.length > 0 ? plain : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export type ResolvedKnowledgeBody = {
  /** LLM·스텁에 넘길 본문 (짧으면 null) */
  llmText: string | null;
  /** raw_knowledge.raw_body 에 저장할 값 — 기존보다 길어졌을 때만 */
  updatedRawBodyForDb: string | null;
};

/**
 * 기존 raw_body가 짧으면 URL에서 본문을 가져와 LLM 입력·DB 저장용으로 맞춤.
 */
export async function resolveKnowledgeRawBodyForProcessing(
  externalUrl: string,
  existingRawBody: string | null | undefined,
): Promise<ResolvedKnowledgeBody> {
  const minChars = knowledgeFetchBodyMinChars();
  const llmMax = knowledgeLlmInputMaxChars();
  const dbMax = knowledgeMaxRawBodyLenForDb();

  const existing = (existingRawBody ?? '').trim();
  if (existing.length >= minChars) {
    const slice = existing.length > llmMax ? existing.slice(0, llmMax) : existing;
    return { llmText: slice || null, updatedRawBodyForDb: null };
  }

  const url = externalUrl.trim();
  if (!url || !isSafeUrlForServerFetch(url)) {
    return { llmText: existing || null, updatedRawBodyForDb: null };
  }

  const fetched = await fetchKnowledgeArticlePlainText(url);
  const t = fetched?.trim() ?? '';
  if (!t) {
    return { llmText: existing || null, updatedRawBodyForDb: null };
  }

  const forDb = t.length > dbMax ? t.slice(0, dbMax) : t;
  const forLlm = t.length > llmMax ? t.slice(0, llmMax) : t;
  const shouldUpdateDb = forDb.length > existing.length;

  return {
    llmText: forLlm || null,
    updatedRawBodyForDb: shouldUpdateDb ? forDb : null,
  };
}
