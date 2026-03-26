/**
 * summarizeAndPersistNews.ts — raw_news → LLM 한국어·태국어 제목·요약 → processed_news / summaries
 *
 * 환경 변수:
 * - NEWS_SUMMARY_PROVIDER: openai | gemini | local | auto (기본 auto)
 * - OpenAI: OPENAI_API_KEY, OPENAI_MODEL (기본 gpt-4o-mini)
 * - Gemini(OpenAI 호환 엔드포인트): GEMINI_API_KEY, GEMINI_MODEL (기본 gemini-2.0-flash), GEMINI_OPENAI_BASE_URL (선택)
 * - 로컬(OpenAI 호환): LOCAL_LLM_BASE_URL (예: http://127.0.0.1:11434/v1), LOCAL_LLM_MODEL (기본 llama3.2), LOCAL_LLM_API_KEY (선택)
 * - auto: OpenAI 키 있으면 우선, 429/쿼터류 실패 시 GEMINI_API_KEY → 있으면 Gemini, 다음으로 LOCAL_LLM_BASE_URL 로컬 폴백
 *
 * processed_news.clean_body: { ko: {title,summary,blurb}, th: {...}, source_url }
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

/** process-news / 배치가 돌아갈 수 있는지 (키 또는 로컬 URL) */
export function isNewsSummaryLlmConfigured(): boolean {
  const p = normalizeNewsSummaryProvider();
  if (p === 'openai') return Boolean(process.env.OPENAI_API_KEY?.trim());
  if (p === 'gemini') return Boolean(process.env.GEMINI_API_KEY?.trim());
  if (p === 'local') return Boolean(process.env.LOCAL_LLM_BASE_URL?.trim());
  return (
    Boolean(process.env.OPENAI_API_KEY?.trim()) ||
    Boolean(process.env.GEMINI_API_KEY?.trim()) ||
    Boolean(process.env.LOCAL_LLM_BASE_URL?.trim())
  );
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
  th_title: string;
  th_summary: string;
  th_blurb: string;
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
  return {
    ko_title: o.ko_title.trim(),
    ko_summary: o.ko_summary.trim(),
    ko_blurb: clamp(String(o.ko_blurb), 160),
    th_title: o.th_title.trim(),
    th_summary: o.th_summary.trim(),
    th_blurb: clamp(String(o.th_blurb), 160),
  };
}

const BILINGUAL_SYSTEM_PROMPT =
  'You are a news editor for a Thailand–Korea bilingual community site "Thai Ja World". Output valid JSON only. Korean fields: ko_title, ko_summary, ko_blurb. Thai fields: th_title, th_summary, th_blurb.\n\nRules:\n- Do NOT invent facts. Use only what is present in the provided title/body and keep it consistent with the source URL.\n- Avoid defamation: never state uncertain allegations as confirmed facts.\n- Avoid identifying private individuals; if names are not clearly provided in the input, use neutral wording.\n- Blurbs are click-worthy but responsible: short, attention-grabbing first lines without offensive, hateful, or political persuasion content.\n- Output only the JSON object specified.';

function buildBilingualUserBlock(title: string, body: string | null, sourceUrl: string): string {
  return [
    `원문 제목: ${title}`,
    `원문 본문(없으면 빈 값): ${body?.trim() || '(없음)'}`,
    `출처 URL: ${sourceUrl}`,
    '',
    '위는 태국·동남아 관련 뉴스 기사 메타데이터입니다.',
    '원문 언어와 관계없이 아래 여덟 필드를 모두 채우세요.',
    '반드시 아래 키만 가진 JSON 객체 한 개만 출력하세요 (다른 텍스트 금지):',
    '{"ko_title":"","ko_summary":"","ko_blurb":"","th_title":"","th_summary":"","th_blurb":""}',
    '- ko_title: 한국어 한 줄 헤드라인(팩트 기반, 제공된 제목/본문/출처 범위 내에서만). 영어 원문 제목을 그대로 복사하지 말고 한국어로 재작성.',
    '- ko_summary: 한국어 2~4문장 요약. 반드시 첫 문장부터 “클릭을 부르는 훅”이 되게 작성하되, 검증되지 않은 내용(예: 확정된 범죄 여부, 특정 개인 신상, 확실하지 않은 수사 결과)은 절대 단정하지 말 것. 원문에 근거가 없으면 “보도에 따르면/관계자는/현지 매체는” 같은 완충 표현을 사용.',
    '- ko_blurb: 피드 카드에 쓰는 1문장(짧은 첫줄) 훅. 40~90자 내외. 자극적이어도 되지만 과장/허위/명예훼손/혐오/정치 선동 금지. “보도에 따르면” 같은 근거 표현을 우선.',
    '- th_title, th_summary: 자연스러운 태국어(공손한 뉴스 톤).',
    '- th_blurb: 태국어로 같은 뉘앙스의 짧은 한마디(길이는 한국어 blurb 와 비슷하게).',
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

async function callOpenAiCompatibleChatCompletion(params: {
  baseUrl: string;
  model: string;
  apiKey: string | undefined;
  messages: Array<{ role: string; content: string }>;
  jsonObjectMode: boolean;
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
    max_tokens: 2400,
  };
  if (params.jsonObjectMode) {
    body.response_format = { type: 'json_object' };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes('aborted')) {
      throw new Error(`${LLM_TIMEOUT_MS}ms 후 LLM 요청 타임아웃`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
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
      throw new Error(`${label} JSON 스키마 불일치 (ko_/th_ 제목·요약·블러브 필수)`);
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
      throw new Error(`${label} JSON 스키마 불일치 (ko_/th_ 제목·요약·블러브 필수)`);
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

  const provider = normalizeNewsSummaryProvider();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const openaiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiBase =
    process.env.GEMINI_OPENAI_BASE_URL?.trim() ||
    'https://generativelanguage.googleapis.com/v1beta/openai';
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
  const localBase = process.env.LOCAL_LLM_BASE_URL?.trim();
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
    });
    return parseBilingualPayloadFromContent(content, '로컬 LLM');
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
    });
    return parseBilingualPayloadFromContent(content, 'OpenAI');
  };

  const runGemini = async () => {
    if (!geminiKey) {
      throw new Error('GEMINI_API_KEY 가 설정되지 않았습니다.');
    }
    // Gemini OpenAI 호환 레이어는 response_format 지원이 제한적일 수 있어 프롬프트+파서로 통일
    const content = await callOpenAiCompatibleChatCompletion({
      baseUrl: geminiBase,
      model: geminiModel,
      apiKey: geminiKey,
      messages,
      jsonObjectMode: false,
    });
    return parseBilingualPayloadFromContent(content, 'Gemini');
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
      if (shouldFallbackFromOpenAi(e)) {
        if (geminiKey) {
          try {
            console.warn(
              '[NewsSummary] OpenAI 실패 → Gemini 폴백:',
              e instanceof Error ? e.message.slice(0, 220) : String(e),
            );
            return await runGemini();
          } catch (e2) {
            if (localBase) {
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

/**
 * 아직 processed_news 가 없는 raw_news 최대 `limit`건에 대해 한국어·태국어 요약 후 저장합니다.
 */
export async function summarizeAndPersistNewsBatch(
  limit: number,
): Promise<SummarizeBatchResult> {
  if (!isNewsSummaryLlmConfigured()) {
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

  if (!rawRows?.length) {
    return { results: [], llmConfigured: true, openaiConfigured: true };
  }

  const todo = rawRows.filter((r) => !done.has(r.id)).slice(0, cap);
  const results: SummarizeRowResult[] = [];
  const slackDigest: NewsSlackDigestItem[] = [];

  for (const row of todo) {
    const title = row.title?.trim() || '(제목 없음)';
    const url = row.external_url ?? '';

    try {
      const llm = await callBilingualSummary(title, row.raw_body, url);

      const cleanBody = JSON.stringify({
        ko: {
          title: llm.ko_title,
          summary: llm.ko_summary,
          blurb: llm.ko_blurb,
        },
        th: {
          title: llm.th_title,
          summary: llm.th_summary,
          blurb: llm.th_blurb,
        },
        source_url: url,
      });

      const { data: proc, error: insP } = await client
        .from('processed_news')
        .insert({
          raw_news_id: row.id,
          clean_body: cleanBody,
          language: 'ko',
          published: newsInsertAsPublished(),
        })
        .select('id')
        .single();

      if (insP || !proc?.id) {
        results.push({
          raw_news_id: row.id,
          ok: false,
          error: insP?.message ?? 'processed_news insert 실패',
        });
        continue;
      }

      const pid = proc.id as string;

      const { error: sKo } = await client.from('summaries').insert({
        processed_news_id: pid,
        summary_text: llm.ko_summary,
        model: 'ko',
      });

      if (sKo) {
        results.push({
          raw_news_id: row.id,
          ok: false,
          error: sKo.message,
        });
        continue;
      }

      const { error: sTh } = await client.from('summaries').insert({
        processed_news_id: pid,
        summary_text: llm.th_summary,
        model: 'th',
      });

      if (sTh) {
        results.push({
          raw_news_id: row.id,
          ok: false,
          error: sTh.message,
        });
        continue;
      }

      results.push({ raw_news_id: row.id, ok: true });
      slackDigest.push({
        ko_title: llm.ko_title,
        ko_summary: llm.ko_summary,
        source_url: url,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ raw_news_id: row.id, ok: false, error: msg });
    }
  }

  return {
    results,
    llmConfigured: true,
    openaiConfigured: true,
    ...(slackDigest.length > 0 ? { slackDigest } : {}),
  };
}
