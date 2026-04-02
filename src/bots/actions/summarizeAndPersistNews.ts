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
import { newsInsertAsPublished } from '@/lib/news/newsPublishMode';

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
 * 기본: 수동 승인 모드에서만 true (키 만료·Vercel 타임아웃으로 사이트가 죽는 것 방지).
 */
export function stubOnLlmFailure(): boolean {
  const raw = process.env.NEWS_SUMMARY_FALLBACK_STUB?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  return !newsInsertAsPublished();
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
  ko_title: string;
  ko_summary: string;
  ko_blurb: string;
  /** 편집실 톤 한마디(팩트 반복 금지). 비어 있으면 UI에 안 씀 */
  ko_editor_note: string;
  th_title: string;
  th_summary: string;
  th_blurb: string;
  th_editor_note: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function parseLlmPayload(raw: unknown): LlmBilingualPayload | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (
    !isNonEmptyString(o.ko_title) ||
    !isNonEmptyString(o.ko_summary) ||
    !isNonEmptyString(o.ko_blurb) ||
    !isNonEmptyString(o.th_title) ||
    !isNonEmptyString(o.th_summary) ||
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
  return {
    ko_title: o.ko_title.trim(),
    ko_summary: o.ko_summary.trim(),
    ko_blurb: clamp(String(o.ko_blurb), 160),
    ko_editor_note: koEd,
    th_title: o.th_title.trim(),
    th_summary: o.th_summary.trim(),
    th_blurb: clamp(String(o.th_blurb), 160),
    th_editor_note: thEd,
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
    ko_title: clampPlainText(head, 200),
    ko_summary,
    ko_blurb: clampPlainText(head, 100),
    ko_editor_note: `LLM 없음·오류로 원문 제목·발췌만으로 초안을 만들었어요.${errTail}`,
    th_title: clampPlainText(head, 200),
    th_summary:
      excerpt.length > 0
        ? '(อัตโนมัติ) มีข้อความต้นฉบับบางส่วนในสรุปภาษาเกาหลี — โปรดเขียนสรุปภาษาไทยก่อนเผยแพร่'
        : '(อัตโนมัติ) ยังไม่มีเนื้อหาเพียงพอ — โปรดแก้ไขก่อนเผยแพร่',
    th_blurb: clampPlainText(head, 100),
    th_editor_note: 'ร่างอัตโนมัติ — แก้ภาษาไทยก่อนเผยแพร่',
  };
}

const BILINGUAL_SYSTEM_PROMPT =
  'You are a news editor for a Thailand–Korea bilingual community site "Thai Ja World". Output valid JSON only.\n\nRequired keys: ko_title, ko_summary, ko_blurb, ko_editor_note, th_title, th_summary, th_blurb, th_editor_note.\n\nRules for title/summary/blurb:\n- Do NOT invent facts. Use only what is present in the provided title/body and keep it consistent with the source URL.\n- Avoid defamation: never state uncertain allegations as confirmed facts.\n- Avoid identifying private individuals; if names are not clearly provided in the input, use neutral wording.\n- Blurbs are click-worthy but responsible: short, attention-grabbing first lines without offensive, hateful, or political persuasion content.\n\nRules for ko_editor_note and th_editor_note (VERY IMPORTANT):\n- Write AFTER the factual work is done: these are informal "desk notes" from the site editor, NOT a second summary.\n- Do NOT repeat or paraphrase ko_summary/th_summary. No new facts; reactions and tone only.\n- Korean note in natural Korean; Thai note in natural Thai (same vibe).\n- 1~3 short sentences (or one wry paragraph). Self-deprecating humor is welcome (e.g. sharing your take costs everyone a minute—only if you feel like it).\n- Gently invite conversation or a reaction; never hard-sell, no "sign up / subscribe / click now", no ads, no political rallying, no guilt-tripping.\n- Warm, human, slightly witty; avoid corporate marketing tone.\n\nOutput only the JSON object with the eight string fields.';

function buildBilingualUserBlock(title: string, body: string | null, sourceUrl: string): string {
  return [
    `원문 제목: ${title}`,
    `원문 본문(없으면 빈 값): ${body?.trim() || '(없음)'}`,
    `출처 URL: ${sourceUrl}`,
    '',
    '아래는 태국·동남아 지역과 관련된 원문 제목·본문 발췌·출처입니다. 사람이 읽기 좋은 헤드라인과 요약으로 다듬어 주세요.',
    '원문 언어와 관계없이 아래 여덟 필드를 모두 채우세요. ko_title에는 "메타데이터" 같은 내부 용어를 넣지 마세요.',
    '반드시 아래 키만 가진 JSON 객체 한 개만 출력하세요 (다른 텍스트 금지):',
    '{"ko_title":"","ko_summary":"","ko_blurb":"","ko_editor_note":"","th_title":"","th_summary":"","th_blurb":"","th_editor_note":""}',
    '- ko_title: 한국어 한 줄 헤드라인(팩트 기반, 제공된 제목/본문/출처 범위 내에서만). 영어 원문 제목을 그대로 복사하지 말고 한국어로 재작성.',
    '- ko_summary: 한국어 2~4문장 요약. 반드시 첫 문장부터 “클릭을 부르는 훅”이 되게 작성하되, 검증되지 않은 내용(예: 확정된 범죄 여부, 특정 개인 신상, 확실하지 않은 수사 결과)은 절대 단정하지 말 것. 원문에 근거가 없으면 “보도에 따르면/관계자는/현지 매체는” 같은 완충 표현을 사용.',
    '- ko_blurb: 피드 카드에 쓰는 1문장(짧은 첫줄) 훅. 40~90자 내외. 자극적이어도 되지만 과장/허위/명예훼손/혐오/정치 선동 금지. “보도에 따르면” 같은 근거 표현을 우선.',
    '- ko_editor_note: 위 요약과 별개로, 운영 편집실이 남기는 짧은 한마디. 뉴스 팩트를 다시 말하지 말 것. 부담 없이 감상·댓글을 권하는 느낌 + 가벼운 위트(“생각 쓰면 서로 시간 뺏는 거 아시죠” 같은 톤도 OK). 홍보·가입 독려·무거운 설교 금지.',
    '- th_title, th_summary: 자연스러운 태국어(공손한 뉴스 톤).',
    '- th_blurb: 태국어로 같은 뉘앙스의 짧은 한마디(길이는 한국어 blurb 와 비슷하게).',
    '- th_editor_note: 태국어로 ko_editor_note 와 같은 역할·톤. 요약(th_summary) 내용을 반복하지 말 것.',
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
  const maxAttempts = llmFetchRetryCount();
  let res: Response | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
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
        throw new Error(`${LLM_TIMEOUT_MS}ms 후 LLM 요청 타임아웃 (${host})`);
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
      throw new Error(`${label} JSON 스키마 불일치 (ko_/th_ 제목·요약·블러브 필수, editor_note는 선택)`);
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
      throw new Error(`${label} JSON 스키마 불일치 (ko_/th_ 제목·요약·블러브 필수, editor_note는 선택)`);
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
  return runNewsSummaryProviders(messages, parseBilingualPayloadFromContent, 2800);
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
  const cleanBody = JSON.stringify({
    ko: {
      title: llm.ko_title,
      summary: llm.ko_summary,
      blurb: llm.ko_blurb,
      ...(llm.ko_editor_note ? { editor_note: llm.ko_editor_note } : {}),
    },
    th: {
      title: llm.th_title,
      summary: llm.th_summary,
      blurb: llm.th_blurb,
      ...(llm.th_editor_note ? { editor_note: llm.th_editor_note } : {}),
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
    summary_text: llm.ko_summary,
    model: 'ko',
  });

  if (sKo) {
    return { raw_news_id: row.id, ok: false, error: sKo.message };
  }

  const { error: sTh } = await client.from('summaries').insert({
    processed_news_id: pid,
    summary_text: llm.th_summary,
    model: 'th',
  });

  if (sTh) {
    return { raw_news_id: row.id, ok: false, error: sTh.message };
  }

  return { raw_news_id: row.id, ok: true };
}

export type EnsureNewsDraftResult = {
  ok: boolean;
  raw_news_id: string;
  processed_news_id?: string;
  error?: string;
  already_existed?: boolean;
};

export type ReprocessNewsStubResult = {
  ok: boolean;
  processed_news_id: string;
  error?: string;
};

/**
 * 미게시 초안(published=false) 단건을 LLM 으로 재가공합니다.
 * clean_body 와 summaries 를 새 LLM 결과로 교체합니다.
 * 이미 게시된 항목이나 LLM 키 미설정 시 오류를 반환합니다.
 */
export async function reprocessNewsStubWithLlm(
  processedNewsId: string,
): Promise<ReprocessNewsStubResult> {
  const pid = processedNewsId.trim();
  if (!pid) {
    return { ok: false, processed_news_id: pid, error: 'processed_news_id 가 비었습니다.' };
  }

  if (!isNewsSummaryLlmConfigured()) {
    return {
      ok: false,
      processed_news_id: pid,
      error:
        'LLM 키가 설정되어 있지 않습니다. OPENAI_API_KEY 또는 GEMINI_API_KEY 등을 Vercel 환경 변수에 넣은 뒤 다시 시도하세요.',
    };
  }

  const client = getServerSupabaseClient();

  const { data: proc, error: pErr } = await client
    .from('processed_news')
    .select('id, raw_news_id, published')
    .eq('id', pid)
    .maybeSingle();

  if (pErr || !proc) {
    return { ok: false, processed_news_id: pid, error: pErr?.message ?? '초안을 찾을 수 없습니다.' };
  }
  if (proc.published === true) {
    return { ok: false, processed_news_id: pid, error: '이미 게시된 기사는 재가공할 수 없습니다.' };
  }

  const rawId = String(proc.raw_news_id);
  const { data: raw, error: rErr } = await client
    .from('raw_news')
    .select('id, title, raw_body, external_url')
    .eq('id', rawId)
    .maybeSingle();

  if (rErr || !raw) {
    return {
      ok: false,
      processed_news_id: pid,
      error: rErr?.message ?? '원문(raw_news)을 찾을 수 없습니다.',
    };
  }

  const title = (raw.title as string | null)?.trim() || '(제목 없음)';
  const url = (raw.external_url as string | null) ?? '';

  let llm: LlmBilingualPayload;
  try {
    llm = await callBilingualSummary(title, raw.raw_body as string | null, url);
  } catch (e) {
    return {
      ok: false,
      processed_news_id: pid,
      error: `LLM 호출 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const cleanBody = JSON.stringify({
    ko: {
      title: llm.ko_title,
      summary: llm.ko_summary,
      blurb: llm.ko_blurb,
      ...(llm.ko_editor_note ? { editor_note: llm.ko_editor_note } : {}),
    },
    th: {
      title: llm.th_title,
      summary: llm.th_summary,
      blurb: llm.th_blurb,
      ...(llm.th_editor_note ? { editor_note: llm.th_editor_note } : {}),
    },
    source_url: url,
  });

  const { error: updErr } = await client
    .from('processed_news')
    .update({ clean_body: cleanBody })
    .eq('id', pid);

  if (updErr) {
    return { ok: false, processed_news_id: pid, error: updErr.message };
  }

  // summaries 교체: 기존 행 삭제 후 새 행 삽입
  const { error: delErr } = await client.from('summaries').delete().eq('processed_news_id', pid);
  if (delErr) {
    return { ok: false, processed_news_id: pid, error: `summaries 삭제 실패: ${delErr.message}` };
  }

  const { error: insErr } = await client.from('summaries').insert([
    { processed_news_id: pid, summary_text: llm.ko_summary, model: 'ko' },
    { processed_news_id: pid, summary_text: llm.th_summary, model: 'th' },
  ]);
  if (insErr) {
    return { ok: false, processed_news_id: pid, error: `summaries 삽입 실패: ${insErr.message}` };
  }

  return { ok: true, processed_news_id: pid };
}

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

    const rowResult = await persistBilingualProcessedNews(client, row as RawNewsTodoRow, llm);
    results.push(rowResult);
    if (rowResult.ok && !usedStub) {
      slackDigest.push({
        ko_title: llm.ko_title,
        ko_summary: llm.ko_summary,
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
