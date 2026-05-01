/**
 * summarizeAndPersistNews.ts — raw_news → LLM 한국어·태국어 제목·요약 → processed_news / summaries
 *
 * 환경 변수:
 * - NEWS_SUMMARY_PROVIDER: openai | gemini | local | auto (기본 auto)
 * - OpenAI: OPENAI_API_KEY, OPENAI_MODEL (기본 gpt-4o-mini)
 * - Gemini(OpenAI 호환 엔드포인트): GEMINI_API_KEY, GEMINI_MODEL (기본 gemini-2.0-flash), GEMINI_OPENAI_BASE_URL (선택)
 * - 로컬(OpenAI 호환): LOCAL_LLM_BASE_URL (예: http://127.0.0.1:11434/v1), LOCAL_LLM_MODEL (기본 llama3.2), LOCAL_LLM_API_KEY (선택)
 * - auto: OpenAI 키 있으면 우선, 429/쿼터류 실패 시 GEMINI_API_KEY → 있으면 Gemini, 다음으로 LOCAL_LLM_BASE_URL 로컬 폴백
 * - NEWS_LLM_FETCH_RETRIES: LLM POST fetch 재시도 횟수(기본 3). "fetch failed" 류 일시 오류 완화
 * - NEWS_SUMMARY_FALLBACK_STUB: LLM 없음/호출 실패 시 원문 메타만으로 초안(processed_news) 생성 여부.
 *   1|true|yes|on = 항상 허용, 0|false|no|off = 끔. 미설정 시 NEWS_PUBLISH_MODE 가 auto 가 아니면(manual·미설정) 켜짐.
 *
 * processed_news.clean_body: { ko: {title,summary,blurb,editor_note}, th: {...}, source_url }
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';
import { passesKoPublicGate } from '@/lib/news/processedNewsDisplay';
import { newsInsertAsPublished } from '@/lib/news/newsPublishMode';
import {
  sanitizeAiKoreanPhrases,
  sanitizeAiThaiPhrases,
  sanitizeKoreanCommunityText,
} from '@/lib/text/normalizeDisplayText';

export type NewsSummaryProvider = 'openai' | 'gemini' | 'local' | 'auto';

export interface SummarizeRowResult {
  raw_news_id: string;
  ok: boolean;
  error?: string;
}

/** Slack 등으로 보낼 한국어 요약 한 건 */
export interface NewsSlackDigestItem {
  ko_title: string;
  ko_summary: string;
  source_url: string;
}

export interface SummarizeBatchResult {
  results: SummarizeRowResult[];
  /** 요약 실행 가능 여부 (OpenAI 키 또는 로컬 베이스 URL 등) */
  llmConfigured: boolean;
  /**
   * @deprecated llmConfigured 와 동일 (하위 호환)
   */
  openaiConfigured: boolean;
  /** processed_news / raw_news 조회 실패 등 */
  dbError?: string;
  /** 성공 처리된 기사의 한국어 제목·요약 (Slack 알림용) */
  slackDigest?: NewsSlackDigestItem[];
}

class HttpCompletionError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpCompletionError';
    this.status = status;
  }
}

const LLM_TIMEOUT_MS = (() => {
  const raw = process.env.NEWS_LLM_TIMEOUT_MS?.trim();
  const n = raw ? Number(raw) : NaN;
  // 기본: 2분. LLM이 느리면 env로 늘릴 수 있게 함
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 120_000;
})();

function normalizeNewsSummaryProvider(): NewsSummaryProvider {
  const v = (process.env.NEWS_SUMMARY_PROVIDER || 'auto').trim().toLowerCase();
  if (v === 'openai' || v === 'gemini' || v === 'local' || v === 'auto') return v;
  return 'auto';
}

/** process-news / 배치가 돌아갈 수 있는지 (키 또는 로컬 URL). Vercel에서는 localhost LLM URL 제외 */
export function isNewsSummaryLlmConfigured(): boolean {
  const p = normalizeNewsSummaryProvider();
  const localOk = Boolean(resolveLocalLlmBaseUrlForRuntime(process.env.LOCAL_LLM_BASE_URL));
  if (p === 'openai') return Boolean(process.env.OPENAI_API_KEY?.trim());
  if (p === 'gemini') return Boolean(process.env.GEMINI_API_KEY?.trim());
  if (p === 'local') return localOk;
  return (
    Boolean(process.env.OPENAI_API_KEY?.trim()) ||
    Boolean(process.env.GEMINI_API_KEY?.trim()) ||
    localOk
  );
}

/**
 * LLM 미동작·오류 시에도 관리자 큐에 초안을 쌓을지.
 * 기본: true. 자동 게시 모드라도 스텁은 published=false 로 강등해 큐에서 검수합니다.
 */
export function stubOnLlmFailure(): boolean {
  const raw = process.env.NEWS_SUMMARY_FALLBACK_STUB?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  return true;
}

function batchNotReady(dbError?: string): SummarizeBatchResult {
  return {
    results: [],
    llmConfigured: false,
    openaiConfigured: false,
    ...(dbError ? { dbError } : {}),
  };
}

function batchReadyPartial(dbError: string): SummarizeBatchResult {
  return {
    results: [],
    llmConfigured: true,
    openaiConfigured: true,
    dbError,
  };
}

interface LlmBilingualPayload {
  title_kr: string;
  content_kr: string;
  ko_blurb: string;
  /** 편집실 톤 한마디(팩트 반복 금지). 비어 있으면 UI에 안 씀 */
  ko_editor_note: string;
  title_th: string;
  content_th: string;
  th_blurb: string;
  th_editor_note: string;
  /** 구글 검색 유입용 키워드(중복 제거·순서 유지, 최대 8개까지 저장) */
  seo_keywords: string[];
}

function normalizeSeoKeywords(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const t = raw.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}

function parseSeoKeywordsField(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return normalizeSeoKeywords(raw.map((x) => String(x)));
  }
  if (typeof raw === 'string') {
    return normalizeSeoKeywords(raw.split(/[,，]/).map((s) => s.trim()));
  }
  return [];
}

function stubSeoKeywordsFromTitle(title: string): string[] {
  const head = title.trim() || '태국 뉴스';
  const parts = head
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 5);
  const base = parts.length > 0 ? parts : ['태국', '뉴스', '방콕', '태자월드', '교민'];
  return normalizeSeoKeywords(base);
}

function sanitizeNewsPayloadTone(payload: LlmBilingualPayload): LlmBilingualPayload {
  const sanitizeThai = (input: string, max: number) => {
    const noAi = sanitizeAiThaiPhrases(input);
    const t = noAi.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1).trim()}…`;
  };

  const sanitizeKorean = (input: string, max: number) =>
    sanitizeKoreanCommunityText(sanitizeAiKoreanPhrases(input), max);

  return {
    ...payload,
    title_kr: sanitizeKorean(payload.title_kr, 110),
    content_kr: sanitizeKorean(payload.content_kr, 600),
    ko_blurb: sanitizeKorean(payload.ko_blurb, 130),
    ko_editor_note: sanitizeKorean(payload.ko_editor_note, 260),
    title_th: sanitizeThai(payload.title_th, 110),
    content_th: sanitizeThai(payload.content_th, 620),
    th_blurb: sanitizeThai(payload.th_blurb, 130),
    th_editor_note: sanitizeThai(payload.th_editor_note, 260),
    seo_keywords: normalizeSeoKeywords(payload.seo_keywords ?? []),
  };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function parseLlmPayload(raw: unknown): LlmBilingualPayload | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const titleKr = isNonEmptyString(o.title_kr) ? o.title_kr : o.ko_title;
  const contentKr = isNonEmptyString(o.content_kr) ? o.content_kr : o.ko_summary;
  const titleTh = isNonEmptyString(o.title_th) ? o.title_th : o.th_title;
  const contentTh = isNonEmptyString(o.content_th) ? o.content_th : o.th_summary;
  if (
    !isNonEmptyString(titleKr) ||
    !isNonEmptyString(contentKr) ||
    !isNonEmptyString(o.ko_blurb) ||
    !isNonEmptyString(titleTh) ||
    !isNonEmptyString(contentTh) ||
    !isNonEmptyString(o.th_blurb)
  ) {
    return null;
  }
  const clamp = (s: string, max: number) => {
    const t = s.trim();
    return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t;
  };
  const editorClamp = 300;
  const koEd = isNonEmptyString(o.ko_editor_note) ? clamp(String(o.ko_editor_note), editorClamp) : '';
  const thEd = isNonEmptyString(o.th_editor_note) ? clamp(String(o.th_editor_note), editorClamp) : '';
  const seo_keywords = parseSeoKeywordsField(o.seo_keywords);
  return {
    title_kr: titleKr.trim(),
    content_kr: contentKr.trim(),
    ko_blurb: clamp(String(o.ko_blurb), 160),
    ko_editor_note: koEd,
    title_th: titleTh.trim(),
    content_th: contentTh.trim(),
    th_blurb: clamp(String(o.th_blurb), 160),
    th_editor_note: thEd,
    seo_keywords,
  };
}

function clampPlainText(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** LLM 없이 관리자 승인 큐용 최소 초안 (한·태 블록 형식은 동일) */
function buildStubBilingualPayload(
  title: string,
  rawBody: string | null,
  sourceUrl: string,
  llmErrorHint?: string,
): LlmBilingualPayload {
  const head = title.trim() || '(제목 없음)';
  const body = rawBody?.trim() ?? '';
  const excerpt = body.length > 0 ? clampPlainText(body, 1400) : '';
  const ko_summary = excerpt
    ? `${excerpt}\n\n—\n(자동 초안: 원문 발췌. LLM 요약 전이거나 실패했습니다. 승인 전에 다듬어 주세요.)`
    : `원문 본문이 비어 있거나 매우 짧습니다. 아래 출처를 확인한 뒤 제목·요약을 작성해 주세요.\n${sourceUrl}`;
  const errTail = llmErrorHint ? ` (${clampPlainText(llmErrorHint, 140)})` : '';
  return {
    title_kr: clampPlainText(head, 200),
    content_kr: ko_summary,
    ko_blurb: clampPlainText(head, 100),
    ko_editor_note: `LLM 없음·오류로 원문 제목·발췌만으로 초안을 만들었어요.${errTail}`,
    title_th: clampPlainText(head, 200),
    content_th:
      excerpt.length > 0
        ? '(อัตโนมัติ) มีข้อความต้นฉบับบางส่วนในสรุปภาษาเกาหลี — โปรดเขียนสรุปภาษาไทยก่อนเผยแพร่'
        : '(อัตโนมัติ) ยังไม่มีเนื้อหาเพียงพอ — โปรดแก้ไขก่อนเผยแพร่',
    th_blurb: clampPlainText(head, 100),
    th_editor_note: 'ร่างอัตโนมัติ — แก้ภาษาไทยก่อนเผยแพร่',
    seo_keywords: stubSeoKeywordsFromTitle(head),
  };
}

const BILINGUAL_SYSTEM_PROMPT =
  'You are a bilingual newsroom editor for "Thai Ja World" autonomous pipeline. Output valid JSON only.\n\nReturn exactly these 9 keys: title_kr, content_kr, ko_blurb, ko_editor_note, title_th, content_th, th_blurb, th_editor_note, seo_keywords.\n\nCritical style rules:\n- title_kr/content_kr: polished native Korean for overseas-Korean readers, concise and practical.\n- title_th/content_th: natural Thai for local Thai readers, not literal machine translation.\n- Do NOT invent facts. Use only supplied title/body/source_url.\n- Remove robotic filler like "결론적으로", "이 글에서는", "กล่าวโดยสรุป", "บทความนี้".\n- ko_blurb/th_blurb: one-line hook, short and punchy, but no misinformation or hate/political agitation.\n- ko_editor_note/th_editor_note: warm desk-note tone, 1~3 short sentences, no hard-sell CTA, no fact repetition.\n- seo_keywords: one string containing exactly five comma-separated phrases (no numbering, no quotes inside) that people might type into Google about this story — high-intent search queries in Korean and/or Thai as appropriate.\n\nOutput only one JSON object with these fields.';

function buildBilingualUserBlock(title: string, body: string | null, sourceUrl: string): string {
  const sanitizedTitle = sanitizeAiKoreanPhrases(title);
  const sanitizedBody = sanitizeAiKoreanPhrases(body);
  return [
    `원문 제목: ${sanitizedTitle || title}`,
    `원문 본문(없으면 빈 값): ${sanitizedBody?.trim() || '(없음)'}`,
    `출처 URL: ${sourceUrl}`,
    '',
    '아래는 태국·동남아 지역과 관련된 원문 제목·본문 발췌·출처입니다. 사람이 읽기 좋은 헤드라인과 요약으로 다듬어 주세요.',
    '원문 언어와 관계없이 아래 아홉 필드를 모두 채우세요. title_kr/title_th에는 "메타데이터" 같은 내부 용어를 넣지 마세요.',
    '반드시 아래 키만 가진 JSON 객체 한 개만 출력하세요 (다른 텍스트 금지):',
    '{"title_kr":"","content_kr":"","ko_blurb":"","ko_editor_note":"","title_th":"","content_th":"","th_blurb":"","th_editor_note":"","seo_keywords":""}',
    '- title_kr: 한국어 한 줄 헤드라인(팩트 기반, 제공된 제목/본문/출처 범위 내에서만). 영어 원문 제목을 그대로 복사하지 말고 한국어로 재작성.',
    '- content_kr: 한국어 2~4문장 요약. 반드시 첫 문장부터 “클릭을 부르는 훅”이 되게 작성하되, 검증되지 않은 내용(예: 확정된 범죄 여부, 특정 개인 신상, 확실하지 않은 수사 결과)은 절대 단정하지 말 것. 원문에 근거가 없으면 “보도에 따르면/관계자는/현지 매체는” 같은 완충 표현을 사용.',
    '- ko_blurb: 피드 카드에 쓰는 1문장(짧은 첫줄) 훅. 40~90자 내외. 자극적이어도 되지만 과장/허위/명예훼손/혐오/정치 선동 금지. “보도에 따르면” 같은 근거 표현을 우선.',
    '- ko_editor_note: 위 요약과 별개로, 운영 편집실이 남기는 짧은 한마디. 뉴스 팩트를 다시 말하지 말 것. 부담 없이 감상·댓글을 권하는 느낌 + 가벼운 위트(“생각 쓰면 서로 시간 뺏는 거 아시죠” 같은 톤도 OK). 홍보·가입 독려·무거운 설교 금지.',
    '- title_th, content_th: 자연스러운 태국어(공손한 뉴스 톤).',
    '- th_blurb: 태국어로 같은 뉘앙스의 짧은 한마디(길이는 한국어 blurb 와 비슷하게).',
    '- th_editor_note: 태국어로 ko_editor_note 와 같은 역할·톤. 요약(content_th) 내용을 반복하지 말 것.',
    '- seo_keywords: 이 기사와 관련하여 사람들이 구글에 가장 많이 검색할 만한 높은 트래픽의 SEO 키워드 5개를 **쉼표로만 구분**한 한 줄 문자열로 넣으세요 (따옴표·번호 없이). 예: 방콕 교통, 태국 비자, 한국인 거주, 스쿨버스, 최신 뉴스',
  ].join('\n');
}

function chatCompletionsUrlFromBase(baseUrl: string): string {
  const b = baseUrl.trim().replace(/\/+$/, '');
  if (b.endsWith('/v1/chat/completions')) return b;
  if (b.endsWith('/chat/completions')) return b;
  // Gemini OpenAI 호환: …/v1beta/openai + /chat/completions (중간에 /v1 없음)
  if (/\/openai$/i.test(b)) return `${b}/chat/completions`;
  if (b.endsWith('/v1')) return `${b}/chat/completions`;
  return `${b}/v1/chat/completions`;
}

function stripMarkdownJsonFence(content: string): string {
  const t = content.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (m?.[1]) return m[1].trim();
  return t;
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** undici/node fetch 가 "fetch failed" 만 줄 때 원인(cause)까지 이어서 표시 */
function errorChainMessage(e: unknown): string {
  const parts: string[] = [];
  let cur: unknown = e;
  for (let depth = 0; depth < 6 && cur; depth++) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = (cur as Error & { cause?: unknown }).cause;
    } else if (cur && typeof cur === 'object' && 'message' in cur) {
      parts.push(String((cur as { message: unknown }).message));
      cur = (cur as { cause?: unknown }).cause;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.filter(Boolean).join(' → ');
}

function llmFetchRetryCount(): number {
  const raw = process.env.NEWS_LLM_FETCH_RETRIES?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 1) return Math.min(8, Math.floor(n));
  return 3;
}

function safeUrlHost(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return '(invalid-url)';
  }
}

function llmTimeoutMsForUrl(url: string): number {
  const localRaw = process.env.LOCAL_LLM_TIMEOUT_MS?.trim();
  const localParsed = localRaw ? Number(localRaw) : NaN;
  const localTimeout =
    Number.isFinite(localParsed) && localParsed > 0 ? Math.floor(localParsed) : 20_000;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return Math.min(LLM_TIMEOUT_MS, localTimeout);
    }
  } catch {}
  return LLM_TIMEOUT_MS;
}

async function callOpenAiCompatibleChatCompletion(params: {
  baseUrl: string;
  model: string;
  apiKey: string | undefined;
  messages: Array<{ role: string; content: string }>;
  jsonObjectMode: boolean;
  /** 기본 2800. 편집실 백필 등 짧은 응답은 900 정도로 낮춤 */
  maxTokens?: number;
}): Promise<string> {
  const url = chatCompletionsUrlFromBase(params.baseUrl);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = params.apiKey?.trim();
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  } else {
    // Ollama(OpenAI 호환 API)는 보통 Authorization 을 요구하지 않습니다.
    // 잘못된 헤더로 인해 실패할 수 있으니 키가 없으면 생략합니다.
  }

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    // JSON만 반환해야 하므로 로컬/클라우드 공통으로 최대한 결정적으로
    temperature: (() => {
      const raw = process.env.NEWS_LLM_TEMPERATURE?.trim();
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n)) return n;
      return 0;
    })(),
    max_tokens: params.maxTokens ?? 2800,
  };
  if (params.jsonObjectMode) {
    body.response_format = { type: 'json_object' };
  }

  const host = safeUrlHost(url);
  const timeoutMs = llmTimeoutMsForUrl(url);
  const maxAttempts = llmFetchRetryCount();
  let res: Response | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      break;
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('aborted')) {
        throw new Error(`${timeoutMs}ms 후 LLM 요청 타임아웃 (${host})`);
      }
      const chain = errorChainMessage(e);
      if (attempt >= maxAttempts) {
        throw new Error(
          `LLM fetch 실패 (${host}), ${maxAttempts}회 시도: ${chain || msg}. VPN·방화벽·프록시·DNS 확인. 필요 시 NEWS_LLM_FETCH_RETRIES=5`,
        );
      }
      const backoff = 700 * attempt;
      console.warn(
        `[NewsLLM] fetch 재시도 ${attempt + 1}/${maxAttempts} (${host}) ${backoff}ms 후: ${(chain || msg).slice(0, 160)}`,
      );
      await sleepMs(backoff);
    }
  }

  if (!res) {
    throw new Error(`LLM fetch 실패 (${host}): 응답 없음`);
  }

  if (!res.ok) {
    const t = await res.text();
    throw new HttpCompletionError(res.status, `LLM HTTP ${res.status}: ${t.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error('LLM 응답 본문이 비어 있습니다.');
  }
  return content;
}

function parseBilingualPayloadFromContent(content: string, label: string): LlmBilingualPayload {
  const raw = stripMarkdownJsonFence(content);

  const truncateForError = (s: string) =>
    s.length > 500 ? `${s.slice(0, 500)}…(truncated)` : s;

  const repairJson = (s: string): string => {
    let out = s.trim();
    // 흔한 JSON 파손 패턴 완화(트레일링 콤마 등)
    out = out.replace(/,\s*([}\]])/g, '$1');
    return out;
  };

  // LLM 응답이 JSON 외 텍스트를 섞는 경우가 있어,
  // 첫 번째 JSON 객체({ ... })만 찾아서 파싱하도록 완충 처리합니다.
  try {
    const parsed = JSON.parse(raw) as unknown;
    const payload = parseLlmPayload(parsed);
    if (!payload) {
      throw new Error(`${label} JSON 스키마 불일치 (ko_/th_ 제목·요약·블러브 필수, editor_note·seo_keywords는 선택)`);
    }
    return payload;
  } catch {
    // 1) JSON 블록이 코드펜스 밖에 섞여 있는 경우
    // non-greedy로 첫 JSON 객체만 잡는다(평평한 flat object만 기대).
    const m = raw.match(/\{[\s\S]*?\}/m);

    // 2) 혹시 non-greedy가 너무 일찍 끝났거나 trailing/leading 문자가 섞인 경우 대비:
    // raw 중 첫 '{'부터 마지막 '}'까지를 통째로 한 번 더 시도.
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');

    const candidates: string[] = [];
    if (m?.[0]) candidates.push(m[0]);
    if (first >= 0 && last > first) candidates.push(raw.slice(first, last + 1));

    let parsed: unknown | null = null;
    for (const c of candidates) {
      try {
        parsed = JSON.parse(c) as unknown;
        break;
      } catch {
        try {
          parsed = JSON.parse(repairJson(c)) as unknown;
          break;
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed) {
      throw new Error(`${label} JSON 파싱 실패: ${truncateForError(raw)}`);
    }

    const payload = parseLlmPayload(parsed);
    if (!payload) {
      throw new Error(`${label} JSON 스키마 불일치 (ko_/th_ 제목·요약·블러브 필수, editor_note·seo_keywords는 선택)`);
    }
    return payload;
  }
}

/** OpenAI 429·쿼터 한도 시 다른 프로바이더(Gemini·로컬)로 넘길지 */
function shouldFallbackFromOpenAi(err: unknown): boolean {
  if (err instanceof HttpCompletionError) {
    if (err.status === 429) return true;
    const low = err.message.toLowerCase();
    if (low.includes('insufficient_quota')) return true;
    if (low.includes('rate_limit')) return true;
    return false;
  }
  const msg = err instanceof Error ? err.message : String(err);
  const low = msg.toLowerCase();
  return low.includes('429') && (low.includes('quota') || low.includes('rate'));
}

/**
 * OpenAI가 네트워크만 깨져도(fetch failed 등) Gemini로 넘기기.
 * (기존에는 429만 폴백해서 Vercel에서 OpenAI 일시 실패 시 전부 실패했음)
 */
function shouldFallbackToAlternateLlm(err: unknown): boolean {
  if (shouldFallbackFromOpenAi(err)) return true;
  const chain = errorChainMessage(err).toLowerCase();
  const head = (err instanceof Error ? err.message : String(err)).toLowerCase();
  const low = `${chain} ${head}`;
  if (low.includes('fetch failed')) return true;
  if (low.includes('econnreset')) return true;
  if (low.includes('etimedout')) return true;
  if (low.includes('enotfound')) return true;
  if (low.includes('econnrefused')) return true;
  if (low.includes('socket')) return true;
  if (low.includes('network')) return true;
  if (low.includes('llm fetch 실패')) return true;
  if (low.includes('타임아웃')) return true;
  if (low.includes('certificate') || low.includes('ssl') || low.includes('tls')) return true;
  return false;
}

/** Vercel 등 배포 환경에서 localhost Ollama URL은 쓸 수 없음 → 폴백 혼선 방지용 제거 */
function resolveLocalLlmBaseUrlForRuntime(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  if (!process.env.VERCEL) return t;
  try {
    const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `http://${t}`;
    const u = new URL(normalized);
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0') {
      console.warn(
        '[NewsLLM] Vercel: LOCAL_LLM_BASE_URL 이 로컬호스트라 무시합니다. Production에 OPENAI_API_KEY 또는 GEMINI_API_KEY 를 넣으세요.',
      );
      return undefined;
    }
  } catch {
    return t;
  }
  return t;
}

const localLlmReachability = new Map<string, boolean>();

function localLlmModelsUrl(baseUrl: string): string {
  const b = baseUrl.trim().replace(/\/+$/, '');
  if (b.endsWith('/v1/models')) return b;
  if (b.endsWith('/v1')) return `${b}/models`;
  return `${b}/v1/models`;
}

async function ensureLocalLlmReachable(baseUrl: string): Promise<void> {
  const cached = localLlmReachability.get(baseUrl);
  if (cached === true) return;

  const url = localLlmModelsUrl(baseUrl);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 1500);
  try {
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal });
    // 401/404 도 "접속은 됨" 으로 간주 (게이트웨이/프록시 구성에 따라 발생 가능).
    if (!res.ok && res.status >= 500) {
      throw new Error(`HTTP ${res.status}`);
    }
    localLlmReachability.set(baseUrl, true);
  } catch (e) {
    const msg = errorChainMessage(e) || (e instanceof Error ? e.message : String(e));
    localLlmReachability.set(baseUrl, false);
    throw new Error(`로컬 LLM 접속 불가 (${safeUrlHost(url)}): ${msg.slice(0, 180)}`);
  } finally {
    clearTimeout(timer);
  }
}

async function runNewsSummaryProviders<T>(
  messages: Array<{ role: string; content: string }>,
  parseFromContent: (content: string, label: string) => T,
  maxTokens: number,
): Promise<T> {
  const provider = normalizeNewsSummaryProvider();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const openaiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiBase =
    process.env.GEMINI_OPENAI_BASE_URL?.trim() ||
    'https://generativelanguage.googleapis.com/v1beta/openai';
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
  const localBase = resolveLocalLlmBaseUrlForRuntime(process.env.LOCAL_LLM_BASE_URL);
  const localModel = process.env.LOCAL_LLM_MODEL?.trim() || 'llama3.2';
  const localKey = process.env.LOCAL_LLM_API_KEY?.trim();

  const runLocal = async () => {
    if (!localBase) {
      throw new Error('LOCAL_LLM_BASE_URL 이 설정되지 않았습니다.');
    }
    await ensureLocalLlmReachable(localBase);
    const content = await callOpenAiCompatibleChatCompletion({
      baseUrl: localBase,
      model: localModel,
      apiKey: localKey,
      messages,
      jsonObjectMode: false,
      maxTokens,
    });
    return parseFromContent(content, '로컬 LLM');
  };

  const runOpenAi = async () => {
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY 가 설정되지 않았습니다.');
    }
    const content = await callOpenAiCompatibleChatCompletion({
      baseUrl: 'https://api.openai.com/v1',
      model: openaiModel,
      apiKey: openaiKey,
      messages,
      jsonObjectMode: true,
      maxTokens,
    });
    return parseFromContent(content, 'OpenAI');
  };

  const runGemini = async () => {
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY 가 설정되지 않았습니다.');
    }
    const content = await callOpenAiCompatibleChatCompletion({
      baseUrl: geminiBase,
      model: geminiModel,
      apiKey: geminiKey,
      messages,
      jsonObjectMode: false,
      maxTokens,
    });
    return parseFromContent(content, 'Gemini');
  };

  if (provider === 'local') {
    return runLocal();
  }
  if (provider === 'gemini') {
    return runGemini();
  }
  if (provider === 'openai') {
    return runOpenAi();
  }

  if (openaiKey) {
    try {
      return await runOpenAi();
    } catch (e) {
      if (shouldFallbackToAlternateLlm(e)) {
        if (geminiKey) {
          try {
            console.warn(
              '[NewsSummary] OpenAI 실패 → Gemini 폴백:',
              e instanceof Error ? e.message.slice(0, 220) : String(e),
            );
            return await runGemini();
          } catch (e2) {
            if (shouldFallbackToAlternateLlm(e2) && localBase) {
              console.warn(
                '[NewsSummary] Gemini 실패 → 로컬 LLM 폴백:',
                e2 instanceof Error ? e2.message.slice(0, 220) : String(e2),
              );
              return runLocal();
            }
            throw e2;
          }
        }
        if (localBase) {
          console.warn(
            '[NewsSummary] OpenAI 실패 → 로컬 LLM 폴백:',
            e instanceof Error ? e.message.slice(0, 220) : String(e),
          );
          return runLocal();
        }
        throw new Error(
          `OpenAI 연결 실패: ${errorChainMessage(e).slice(0, 280)}. Vercel Production에 GEMINI_API_KEY 를 추가하거나 OPENAI 쪽 네트워크를 확인하세요. .env 의 LOCAL_LLM_BASE_URL(127.0.0.1 등)은 배포 서버에서 동작하지 않습니다.`,
        );
      }
      throw e;
    }
  }

  if (geminiKey) {
    return runGemini();
  }

  if (localBase) {
    return runLocal();
  }

  throw new Error(
    'NEWS_SUMMARY_PROVIDER=auto 일 때 OPENAI_API_KEY, GEMINI_API_KEY, LOCAL_LLM_BASE_URL 중 하나 이상이 필요합니다.',
  );
}

async function callBilingualSummary(
  title: string,
  body: string | null,
  sourceUrl: string,
): Promise<LlmBilingualPayload> {
  const userBlock = buildBilingualUserBlock(title, body, sourceUrl);
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: BILINGUAL_SYSTEM_PROMPT },
    { role: 'user', content: userBlock },
  ];
  return runNewsSummaryProviders(messages, parseBilingualPayloadFromContent, 3100);
}

const EDITOR_NOTES_ONLY_SYSTEM_PROMPT =
  'You are the desk voice for "Thai Ja World", a Thailand–Korea community news site. Output valid JSON only with keys ko_editor_note and th_editor_note (strings only).\n\nRules:\n- Do NOT repeat or summarize the article facts again. No new factual claims.\n- ko_editor_note: natural Korean. th_editor_note: natural Thai. Same emotional vibe in both.\n- 1~3 short sentences. Self-deprecating wit is OK (e.g. commenting takes a minute of everyone\'s time—only if you want).\n- Gently invite a reaction or conversation; no hard sell, no signup/subscribe/click-begging, no ads, no political rallying.\n- Warm, human, slightly witty; not corporate marketing.';

interface EditorNotesLlmInput {
  ko_title: string;
  ko_summary: string;
  ko_blurb: string;
  th_title: string;
  th_summary: string;
  th_blurb: string;
  source_url: string;
}

function buildEditorNotesUserBlock(input: EditorNotesLlmInput): string {
  return [
    '아래는 이미 편집된 기사 초안(요약·한 줄 훅)입니다. 팩트를 다시 쓰지 말고, 편집실 한마디만 새로 쓰세요.',
    `출처 URL: ${input.source_url || '(없음)'}`,
    '',
    '[한국어]',
    `제목: ${input.ko_title}`,
    `요약: ${input.ko_summary}`,
    `한 줄: ${input.ko_blurb}`,
    '',
    '[태국어]',
    `หัวข้อ: ${input.th_title}`,
    `สรุป: ${input.th_summary}`,
    `บรรทัดแรก: ${input.th_blurb}`,
    '',
    '반드시 이 JSON 한 개만 출력:',
    '{"ko_editor_note":"","th_editor_note":""}',
  ].join('\n');
}

function parseEditorNotesPayload(raw: unknown): { ko_editor_note: string; th_editor_note: string } | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const clamp = (s: string, max: number) => {
    const t = s.trim();
    return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t;
  };
  const maxLen = 300;
  if (typeof o.ko_editor_note !== 'string' || typeof o.th_editor_note !== 'string') return null;
  const ko = clamp(o.ko_editor_note, maxLen);
  const th = clamp(o.th_editor_note, maxLen);
  if (!ko.trim() || !th.trim()) return null;
  return { ko_editor_note: ko, th_editor_note: th };
}

function parseEditorNotesPayloadFromContent(content: string, label: string): {
  ko_editor_note: string;
  th_editor_note: string;
} {
  const raw = stripMarkdownJsonFence(content);
  const truncateForError = (s: string) =>
    s.length > 500 ? `${s.slice(0, 500)}…(truncated)` : s;
  const repairJson = (s: string): string => s.trim().replace(/,\s*([}\]])/g, '$1');

  try {
    const parsed = JSON.parse(raw) as unknown;
    const payload = parseEditorNotesPayload(parsed);
    if (!payload) {
      throw new Error(`${label} JSON 스키마 불일치 (ko_editor_note·th_editor_note 비어 있지 않은 문자열)`);
    }
    return payload;
  } catch {
    const m = raw.match(/\{[\s\S]*?\}/m);
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    const candidates: string[] = [];
    if (m?.[0]) candidates.push(m[0]);
    if (first >= 0 && last > first) candidates.push(raw.slice(first, last + 1));

    let parsed: unknown | null = null;
    for (const c of candidates) {
      try {
        parsed = JSON.parse(c) as unknown;
        break;
      } catch {
        try {
          parsed = JSON.parse(repairJson(c)) as unknown;
          break;
        } catch {
          parsed = null;
        }
      }
    }
    if (!parsed) {
      throw new Error(`${label} JSON 파싱 실패: ${truncateForError(raw)}`);
    }
    const payload = parseEditorNotesPayload(parsed);
    if (!payload) {
      throw new Error(`${label} JSON 스키마 불일치 (ko_editor_note·th_editor_note 비어 있지 않은 문자열)`);
    }
    return payload;
  }
}

async function callBilingualEditorNotesOnly(input: EditorNotesLlmInput): Promise<{
  ko_editor_note: string;
  th_editor_note: string;
}> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: EDITOR_NOTES_ONLY_SYSTEM_PROMPT },
    { role: 'user', content: buildEditorNotesUserBlock(input) },
  ];
  return runNewsSummaryProviders(messages, parseEditorNotesPayloadFromContent, 900);
}

function mergeEditorNotesIntoCleanBody(
  existingJson: string,
  koNote: string,
  thNote: string,
): string {
  const parsed = JSON.parse(existingJson) as Record<string, unknown>;
  const ko = {
    ...(typeof parsed.ko === 'object' && parsed.ko !== null ? (parsed.ko as object) : {}),
  } as Record<string, unknown>;
  const th = {
    ...(typeof parsed.th === 'object' && parsed.th !== null ? (parsed.th as object) : {}),
  } as Record<string, unknown>;
  ko.editor_note = koNote;
  th.editor_note = thNote;
  return JSON.stringify({ ...parsed, ko, th });
}

/** clean_body 에 ko/th editor_note 가 하나라도 비어 있으면 true (백필 후보) */
export function processedNewsNeedsEditorNoteBackfill(cleanBody: string | null | undefined): boolean {
  if (!cleanBody?.trim()) return false;
  try {
    const o = JSON.parse(cleanBody) as {
      ko?: { editor_note?: string };
      th?: { editor_note?: string };
    };
    const ko = o.ko?.editor_note?.trim();
    const th = o.th?.editor_note?.trim();
    return !ko || !th;
  } catch {
    return false;
  }
}

export type BackfillEditorNotesResult = {
  llmConfigured: boolean;
  days: number;
  limit: number;
  scanned: number;
  eligible: number;
  updated: number;
  errors: { id: string; message: string }[];
};

/**
 * 최근 `days`일 안에 생성된 processed_news 중 editor_note 가 비어 있는 행에 LLM으로 편집실 한마디를 채웁니다.
 * 한 번에 최대 `limit`건(기본 상한 60).
 */
export async function backfillProcessedNewsEditorNotes(
  days: number,
  limit: number,
): Promise<BackfillEditorNotesResult> {
  const d = Math.min(Math.max(Math.floor(days), 1), 30);
  const maxLimit = Math.min(Math.max(Math.floor(limit), 1), 60);

  if (!isNewsSummaryLlmConfigured()) {
    return {
      llmConfigured: false,
      days: d,
      limit: maxLimit,
      scanned: 0,
      eligible: 0,
      updated: 0,
      errors: [],
    };
  }

  const client = getServerSupabaseClient();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - d);
  const iso = cutoff.toISOString();

  const { data: rows, error } = await client
    .from('processed_news')
    .select('id, clean_body')
    .gte('created_at', iso)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return {
      llmConfigured: true,
      days: d,
      limit: maxLimit,
      scanned: 0,
      eligible: 0,
      updated: 0,
      errors: [{ id: '-', message: `[processed_news] ${error.message}` }],
    };
  }

  const scanned = rows?.length ?? 0;
  const candidates = (rows ?? []).filter((r) =>
    processedNewsNeedsEditorNoteBackfill(r.clean_body as string | null),
  );
  const eligible = candidates.length;
  const todo = candidates.slice(0, maxLimit);
  const errors: { id: string; message: string }[] = [];
  let updated = 0;

  for (const row of todo) {
    const id = row.id as string;
    const json = row.clean_body as string;
    try {
      const parsed = JSON.parse(json) as {
        ko?: { title?: string; summary?: string; blurb?: string };
        th?: { title?: string; summary?: string; blurb?: string };
        source_url?: string;
      };
      const k = parsed.ko;
      const t = parsed.th;
      if (!k?.summary?.trim() || !t?.summary?.trim()) {
        errors.push({ id, message: 'ko/th 요약 없음 — 스킵' });
        continue;
      }
      const notes = await callBilingualEditorNotesOnly({
        ko_title: k.title ?? '',
        ko_summary: k.summary,
        ko_blurb: k.blurb ?? '',
        th_title: t.title ?? '',
        th_summary: t.summary,
        th_blurb: t.blurb ?? '',
        source_url: typeof parsed.source_url === 'string' ? parsed.source_url : '',
      });
      const nextJson = mergeEditorNotesIntoCleanBody(json, notes.ko_editor_note, notes.th_editor_note);
      const { error: upErr } = await client.from('processed_news').update({ clean_body: nextJson }).eq('id', id);
      if (upErr) {
        errors.push({ id, message: upErr.message });
        continue;
      }
      updated += 1;
      console.log(`[backfillEditorNotes] ✓ ${id}`);
    } catch (e) {
      errors.push({ id, message: e instanceof Error ? e.message : String(e) });
    }
  }

  return { llmConfigured: true, days: d, limit: maxLimit, scanned, eligible, updated, errors };
}

type RawNewsTodoRow = {
  id: string;
  title: string | null;
  raw_body: string | null;
  external_url: string | null;
};

async function persistBilingualProcessedNews(
  client: ReturnType<typeof getServerSupabaseClient>,
  row: RawNewsTodoRow,
  llm: LlmBilingualPayload,
  /** false 를 넣으면 항상 미게시 초안(관리자 «승인 큐에 올리기»용) */
  publishedOverride?: boolean,
): Promise<SummarizeRowResult> {
  const url = row.external_url ?? '';
  const sanitized = sanitizeNewsPayloadTone(llm);
  const cleanBody = JSON.stringify({
    ko: {
      title: sanitized.title_kr,
      summary: sanitized.content_kr,
      blurb: sanitized.ko_blurb,
      ...(sanitized.ko_editor_note ? { editor_note: sanitized.ko_editor_note } : {}),
    },
    th: {
      title: sanitized.title_th,
      summary: sanitized.content_th,
      blurb: sanitized.th_blurb,
      ...(sanitized.th_editor_note ? { editor_note: sanitized.th_editor_note } : {}),
    },
    source_url: url,
  });

  const publishedFlag =
    publishedOverride !== undefined ? publishedOverride : newsInsertAsPublished();

  const { data: proc, error: insP } = await client
    .from('processed_news')
    .insert({
      raw_news_id: row.id,
      clean_body: cleanBody,
      language: 'ko',
      published: publishedFlag,
      title_kr: sanitized.title_kr,
      content_kr: sanitized.content_kr,
      title_th: sanitized.title_th,
      content_th: sanitized.content_th,
      seo_keywords: sanitized.seo_keywords.length > 0 ? sanitized.seo_keywords : stubSeoKeywordsFromTitle(sanitized.title_kr),
    })
    .select('id')
    .single();

  if (insP || !proc?.id) {
    return {
      raw_news_id: row.id,
      ok: false,
      error: insP?.message ?? 'processed_news insert 실패',
    };
  }

  const pid = proc.id as string;

  const { error: sKo } = await client.from('summaries').insert({
    processed_news_id: pid,
    summary_text: sanitized.content_kr,
    model: 'ko',
  });

  if (sKo) {
    return { raw_news_id: row.id, ok: false, error: sKo.message };
  }

  const { error: sTh } = await client.from('summaries').insert({
    processed_news_id: pid,
    summary_text: sanitized.content_th,
    model: 'th',
  });

  if (sTh) {
    return { raw_news_id: row.id, ok: false, error: sTh.message };
  }

  const { error: tipUpsertError } = await client.from('tips_articles').upsert(
    {
      source_url: url || null,
      title: sanitized.title_kr,
      excerpt: sanitized.ko_blurb,
      body_preview: sanitized.content_kr.slice(0, 900),
      title_kr: sanitized.title_kr,
      content_kr: sanitized.content_kr,
      title_th: sanitized.title_th,
      content_th: sanitized.content_th,
      status: 'draft',
    },
    { onConflict: 'source_url' },
  );
  if (tipUpsertError) {
    return { raw_news_id: row.id, ok: false, error: tipUpsertError.message };
  }

  return { raw_news_id: row.id, ok: true };
}

/**
 * 기존 `processed_news` 행에 이중 요약을 다시 써 넣습니다(id·발행 상태 유지).
 */
async function updateBilingualProcessedNews(
  client: ReturnType<typeof getServerSupabaseClient>,
  processedNewsId: string,
  row: RawNewsTodoRow,
  llm: LlmBilingualPayload,
): Promise<SummarizeRowResult> {
  const url = row.external_url ?? '';
  const sanitized = sanitizeNewsPayloadTone(llm);
  const cleanBody = JSON.stringify({
    ko: {
      title: sanitized.title_kr,
      summary: sanitized.content_kr,
      blurb: sanitized.ko_blurb,
      ...(sanitized.ko_editor_note ? { editor_note: sanitized.ko_editor_note } : {}),
    },
    th: {
      title: sanitized.title_th,
      summary: sanitized.content_th,
      blurb: sanitized.th_blurb,
      ...(sanitized.th_editor_note ? { editor_note: sanitized.th_editor_note } : {}),
    },
    source_url: url,
  });

  const { error: upErr } = await client
    .from('processed_news')
    .update({
      clean_body: cleanBody,
      language: 'ko',
      title_kr: sanitized.title_kr,
      content_kr: sanitized.content_kr,
      title_th: sanitized.title_th,
      content_th: sanitized.content_th,
      seo_keywords:
        sanitized.seo_keywords.length > 0
          ? sanitized.seo_keywords
          : stubSeoKeywordsFromTitle(sanitized.title_kr),
    })
    .eq('id', processedNewsId);

  if (upErr) {
    return { raw_news_id: row.id, ok: false, error: upErr.message };
  }

  const { error: delS } = await client.from('summaries').delete().eq('processed_news_id', processedNewsId);
  if (delS) {
    return { raw_news_id: row.id, ok: false, error: delS.message };
  }

  const { error: sKo } = await client.from('summaries').insert({
    processed_news_id: processedNewsId,
    summary_text: sanitized.content_kr,
    model: 'ko',
  });
  if (sKo) {
    return { raw_news_id: row.id, ok: false, error: sKo.message };
  }

  const { error: sTh } = await client.from('summaries').insert({
    processed_news_id: processedNewsId,
    summary_text: sanitized.content_th,
    model: 'th',
  });
  if (sTh) {
    return { raw_news_id: row.id, ok: false, error: sTh.message };
  }

  const { error: tipUpsertError } = await client.from('tips_articles').upsert(
    {
      source_url: url || null,
      title: sanitized.title_kr,
      excerpt: sanitized.ko_blurb,
      body_preview: sanitized.content_kr.slice(0, 900),
      title_kr: sanitized.title_kr,
      content_kr: sanitized.content_kr,
      title_th: sanitized.title_th,
      content_th: sanitized.content_th,
      status: 'draft',
    },
    { onConflict: 'source_url' },
  );
  if (tipUpsertError) {
    return { raw_news_id: row.id, ok: false, error: tipUpsertError.message };
  }

  return { raw_news_id: row.id, ok: true };
}

/**
 * `passesKoPublicGate` 를 통과하지 못한 `processed_news` 를 `raw_news` 원문으로 LLM 재가공합니다.
 */
export async function forceTranslateIncompleteProcessedNews(maxRows: number): Promise<{
  scanned: number;
  eligible: number;
  ok: number;
  failed: { id: string; error: string }[];
  llmConfigured: boolean;
}> {
  if (!isNewsSummaryLlmConfigured()) {
    return { scanned: 0, eligible: 0, ok: 0, failed: [], llmConfigured: false };
  }

  const client = getServerSupabaseClient();
  const cap = Math.min(Math.max(maxRows, 1), 80);

  const { data: rows, error } = await client
    .from('processed_news')
    .select('id, language, clean_body, raw_news_id, summaries(summary_text, model)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return {
      scanned: 0,
      eligible: 0,
      ok: 0,
      failed: [{ id: '-', error: error.message }],
      llmConfigured: true,
    };
  }

  const todo = (rows ?? []).filter(
    (r) =>
      !passesKoPublicGate(
        r.language as string | null,
        (r.clean_body as string | null) ?? null,
        r.summaries as { summary_text: string; model: string | null }[] | null,
      ),
  );

  const slice = todo.slice(0, cap);
  const failed: { id: string; error: string }[] = [];
  let ok = 0;

  for (const pn of slice) {
    const pid = String(pn.id);
    const rawNewsId = String(pn.raw_news_id);
    const { data: raw, error: rawErr } = await client
      .from('raw_news')
      .select('id, title, raw_body, external_url')
      .eq('id', rawNewsId)
      .maybeSingle();

    if (rawErr || !raw) {
      failed.push({ id: pid, error: rawErr?.message ?? 'raw_news 없음' });
      continue;
    }

    const rowTodo = raw as RawNewsTodoRow;
    let llm: LlmBilingualPayload;
    try {
      llm = await callBilingualSummary(
        rowTodo.title?.trim() || '(제목 없음)',
        rowTodo.raw_body,
        rowTodo.external_url ?? '',
      );
    } catch (e) {
      failed.push({
        id: pid,
        error: e instanceof Error ? e.message.slice(0, 500) : String(e),
      });
      continue;
    }

    const ur = await updateBilingualProcessedNews(client, pid, rowTodo, llm);
    if (ur.ok) ok += 1;
    else failed.push({ id: pid, error: ur.error ?? '갱신 실패' });
  }

  return {
    scanned: rows?.length ?? 0,
    eligible: todo.length,
    ok,
    failed,
    llmConfigured: true,
  };
}

export type EnsureNewsDraftResult = {
  ok: boolean;
  raw_news_id: string;
  processed_news_id?: string;
  error?: string;
  already_existed?: boolean;
};

/**
 * `processed_news` 가 없는 `raw_news` 에 LLM 없이 스텁 초안을 넣습니다. 항상 `published=false`.
 * 관리자 «승인 큐에 올리기» 전용.
 */
export async function ensureNewsDraftFromRawNewsId(
  rawNewsId: string,
): Promise<EnsureNewsDraftResult> {
  const id = rawNewsId.trim();
  if (!id) {
    return { ok: false, raw_news_id: id, error: 'raw_news_id 가 비었습니다.' };
  }
  const client = getServerSupabaseClient();

  const { data: existing, error: exErr } = await client
    .from('processed_news')
    .select('id')
    .eq('raw_news_id', id)
    .maybeSingle();
  if (exErr) {
    return { ok: false, raw_news_id: id, error: exErr.message };
  }
  if (existing?.id) {
    return {
      ok: true,
      raw_news_id: id,
      processed_news_id: String(existing.id),
      already_existed: true,
    };
  }

  const { data: raw, error: re } = await client
    .from('raw_news')
    .select('id,title,raw_body,external_url')
    .eq('id', id)
    .maybeSingle();
  if (re) {
    return { ok: false, raw_news_id: id, error: re.message };
  }
  if (!raw) {
    return { ok: false, raw_news_id: id, error: 'raw_news 를 찾을 수 없습니다.' };
  }

  const title = raw.title?.trim() || '(제목 없음)';
  const url = raw.external_url ?? '';
  const llm = buildStubBilingualPayload(title, raw.raw_body, url);
  const rowResult = await persistBilingualProcessedNews(
    client,
    raw as RawNewsTodoRow,
    llm,
    false,
  );
  if (!rowResult.ok) {
    return { ok: false, raw_news_id: id, error: rowResult.error };
  }

  const { data: proc } = await client
    .from('processed_news')
    .select('id')
    .eq('raw_news_id', id)
    .maybeSingle();
  return {
    ok: true,
    raw_news_id: id,
    ...(proc?.id ? { processed_news_id: String(proc.id) } : {}),
  };
}

/**
 * 아직 processed_news 가 없는 raw_news 최대 `limit`건에 대해 한국어·태국어 요약 후 저장합니다.
 * 수동 게시 모드에서는 LLM 미설정·오류 시에도 원문 메타 스텁으로 초안을 넣어 승인 큐가 비지 않게 합니다.
 */
export async function summarizeAndPersistNewsBatch(
  limit: number,
): Promise<SummarizeBatchResult> {
  const allowStub = stubOnLlmFailure();
  const llmReady = isNewsSummaryLlmConfigured();

  if (!llmReady && !allowStub) {
    return batchNotReady();
  }

  const client = getServerSupabaseClient();
  const cap = Math.min(Math.max(limit, 1), 30);

  const { data: processedRows, error: pe } = await client
    .from('processed_news')
    .select('raw_news_id');

  if (pe) {
    return batchReadyPartial(`[processed_news select] ${pe.message}`);
  }

  const done = new Set(
    (processedRows ?? []).map((r) => r.raw_news_id as string),
  );

  const { data: rawRows, error: re } = await client
    .from('raw_news')
    .select('id,title,raw_body,external_url')
    .order('fetched_at', { ascending: false })
    .limit(200);

  if (re) {
    return batchReadyPartial(`[raw_news select] ${re.message}`);
  }

  const effectiveLlmFlag = llmReady || allowStub;

  if (!rawRows?.length) {
    return { results: [], llmConfigured: effectiveLlmFlag, openaiConfigured: effectiveLlmFlag };
  }

  const todo = rawRows.filter((r) => !done.has(r.id)).slice(0, cap);
  const results: SummarizeRowResult[] = [];
  const slackDigest: NewsSlackDigestItem[] = [];

  for (const row of todo) {
    const title = row.title?.trim() || '(제목 없음)';
    const url = row.external_url ?? '';

    let llm: LlmBilingualPayload;
    let usedStub = false;

    if (!llmReady) {
      llm = buildStubBilingualPayload(title, row.raw_body, url);
      usedStub = true;
      console.warn(`[NewsSummarize] LLM 미설정 — 스텁 초안만 저장 raw_news_id=${row.id}`);
    } else {
      try {
        llm = await callBilingualSummary(title, row.raw_body, url);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!allowStub) {
          results.push({ raw_news_id: row.id, ok: false, error: msg });
          continue;
        }
        console.warn(
          `[NewsSummarize] LLM 실패 → 스텁 초안 raw_news_id=${row.id}: ${msg.slice(0, 280)}`,
        );
        llm = buildStubBilingualPayload(title, row.raw_body, url, msg);
        usedStub = true;
      }
    }

    const rowResult = await persistBilingualProcessedNews(
      client,
      row as RawNewsTodoRow,
      llm,
      usedStub ? false : undefined,
    );
    results.push(rowResult);
    if (rowResult.ok && !usedStub) {
      slackDigest.push({
        ko_title: llm.title_kr,
        ko_summary: llm.content_kr,
        source_url: url,
      });
    }
  }

  return {
    results,
    llmConfigured: effectiveLlmFlag,
    openaiConfigured: effectiveLlmFlag,
    ...(slackDigest.length > 0 ? { slackDigest } : {}),
  };
}
