/**
 * processAndPersistKnowledge.ts — raw_knowledge → LLM 구조화 → processed_knowledge / knowledge_summaries
 *
 * LLM 출력 strict JSON 스키마:
 *   board_target, editorial_meta, ko{title,summary,checklist,cautions,tags}, th{...}, board_copy, sources[]
 *
 * 안전 원칙:
 *   - PII(전화번호/주소/개인연락처/계좌/실명) 절대 출력 금지 — 시스템 프롬프트에 강하게 명시
 *   - 비자/법률: 항상 디스클레이머 cautions 포함
 *   - 과장("100% 보장" 등) 금지 — 불확실하면 confidence_level=low, cautions 강화
 *   - JSON 파싱 실패 시 해당 항목 실패 처리 + bot_actions 기록
 *
 * 환경 변수: NEWS_SUMMARY_PROVIDER / OPENAI_API_KEY / GEMINI_API_KEY / LOCAL_LLM_BASE_URL
 *            KNOWLEDGE_PUBLISH_MODE = manual(기본) | auto
 *            KNOWLEDGE_LLM_FALLBACK_STUB — LLM 없음/행별 실패 시 원문 스텁 초안(published=false) 저장.
 *              1|true 켜기, 0|false 끔. 미설정 시 manual(또는 미설정)이면 켜짐, auto 면 끔(뉴스 NEWS_SUMMARY_FALLBACK_STUB 과 동일 패턴).
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';
import { resolveKnowledgeRawBodyForProcessing } from '@/lib/knowledge/fetchKnowledgeArticleText';
import { KNOWLEDGE_STUB_SUMMARY_SNIPPET } from '@/lib/knowledge/knowledgeStubConstants';
import { knowledgeInsertAsPublished } from '@/lib/knowledge/knowledgePublishMode';
import type { KnowledgeLlmOutput } from '@/lib/knowledge/knowledgeLlmTypes';

// ── 타입 ──────────────────────────────────────────────────────────────────

export { KNOWLEDGE_STUB_SUMMARY_SNIPPET } from '@/lib/knowledge/knowledgeStubConstants';
export type { KnowledgeLlmOutput } from '@/lib/knowledge/knowledgeLlmTypes';

export interface KnowledgeProcessRowResult {
  raw_knowledge_id: string;
  ok: boolean;
  board_target?: 'tips_board' | 'board_board';
  error?: string;
}

export interface KnowledgeProcessBatchResult {
  results: KnowledgeProcessRowResult[];
  llmConfigured: boolean;
  dbError?: string;
}

export type EnsureKnowledgeDraftResult = {
  ok: boolean;
  raw_knowledge_id: string;
  processed_knowledge_id?: string;
  error?: string;
  already_existed?: boolean;
};

// ── LLM 설정 ──────────────────────────────────────────────────────────────

type LlmProvider = 'openai' | 'gemini' | 'local' | 'auto';

const LLM_TIMEOUT_MS = (() => {
  const raw = process.env.NEWS_LLM_TIMEOUT_MS?.trim();
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 120_000;
})();

function normalizeProvider(): LlmProvider {
  const v = (process.env.NEWS_SUMMARY_PROVIDER || 'auto').trim().toLowerCase();
  if (v === 'openai' || v === 'gemini' || v === 'local' || v === 'auto') return v;
  return 'auto';
}

export function isKnowledgeLlmConfigured(): boolean {
  const p = normalizeProvider();
  if (p === 'openai') return Boolean(process.env.OPENAI_API_KEY?.trim());
  if (p === 'gemini') return Boolean(process.env.GEMINI_API_KEY?.trim());
  if (p === 'local') return Boolean(process.env.LOCAL_LLM_BASE_URL?.trim());
  return (
    Boolean(process.env.OPENAI_API_KEY?.trim()) ||
    Boolean(process.env.GEMINI_API_KEY?.trim()) ||
    Boolean(process.env.LOCAL_LLM_BASE_URL?.trim())
  );
}

/** 관리자 페이지용 — 비밀 값 없이 provider 설정만 노출 */
export function getKnowledgeLlmAdminStatus(): {
  configured: boolean;
  providerSetting: 'openai' | 'gemini' | 'local' | 'auto';
} {
  return {
    configured: isKnowledgeLlmConfigured(),
    providerSetting: normalizeProvider(),
  };
}

/**
 * LLM 미동작·행별 오류 시에도 승인 큐용 스텁을 넣을지.
 * 기본: 수동 승인 모드에서만 true (Vercel에 키 없을 때 지식 큐가 비지 않게).
 */
export function stubKnowledgeOnLlmFailure(): boolean {
  const raw = process.env.KNOWLEDGE_LLM_FALLBACK_STUB?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  return !knowledgeInsertAsPublished();
}

// ── HTTP LLM 호출 ─────────────────────────────────────────────────────────

class HttpCompletionError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpCompletionError';
    this.status = status;
  }
}

function chatCompletionsUrl(baseUrl: string): string {
  const b = baseUrl.trim().replace(/\/+$/, '');
  if (b.endsWith('/v1/chat/completions')) return b;
  if (b.endsWith('/chat/completions')) return b;
  if (/\/openai$/i.test(b)) return `${b}/chat/completions`;
  if (b.endsWith('/v1')) return `${b}/chat/completions`;
  return `${b}/v1/chat/completions`;
}

function stripMarkdownFence(content: string): string {
  const t = content.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (m?.[1]) return m[1].trim();
  return t;
}

async function callLlm(params: {
  baseUrl: string;
  model: string;
  apiKey: string | undefined;
  messages: Array<{ role: string; content: string }>;
  jsonObjectMode: boolean;
}): Promise<string> {
  const url = chatCompletionsUrl(params.baseUrl);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (params.apiKey?.trim()) {
    headers.Authorization = `Bearer ${params.apiKey.trim()}`;
  }

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: 0,
    max_tokens: 4000,
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
      throw new Error(`${LLM_TIMEOUT_MS}ms LLM 타임아웃`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const t = await res.text();
    throw new HttpCompletionError(res.status, `LLM HTTP ${res.status}: ${t.slice(0, 400)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error('LLM 응답 본문이 비어 있습니다.');
  return content;
}

function shouldFallback(err: unknown): boolean {
  if (err instanceof HttpCompletionError && err.status === 429) return true;
  const msg = err instanceof Error ? err.message : String(err);
  const low = msg.toLowerCase();
  return low.includes('429') && (low.includes('quota') || low.includes('rate'));
}

// ── 시스템 프롬프트 ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a pragmatic knowledge curator for "Thai Ja World" (Thailand–Korea community).
Your job: given a Thai/Korea-related web article (title + excerpt + URL), output a structured JSON with practical information.

LANGUAGE — HIGHEST PRIORITY (do not violate):
- The entire "ko" object is for KOREAN readers: ko.title, ko.summary, ko.checklist[], ko.cautions[], ko.tags[] MUST be natural 한국어 written in Hangul. Translate and paraphrase from English/Thai sources; NEVER paste English article sentences into ko fields.
- The entire "th" object is for THAI readers: all strings MUST be natural ภาษาไทย (Thai script). Do not leave English in th.title or th.summary.
- Source text in English is INPUT only; output must localize per field as above.
- Automated check: ko.title needs many Hangul syllables (가-힣), not Roman letters. ko.summary must be mostly Hangul paragraphs — if you output English here, the response will be rejected.
- Same for th.*: must be mostly Thai Unicode letters (ก-๙), not English paragraphs in th.summary.

CRITICAL SAFETY RULES — violating these is unacceptable:
1. NEVER include PII: phone numbers, physical addresses, personal contact info, account numbers, real names of private individuals, personal identifiers. If present in source, OMIT or generalize.
2. ALWAYS add legal/official disclaimer in cautions for visa, immigration, or legal topics: "법률 자문이 아닙니다. 실제 비자 신청 전 반드시 대사관·공식 기관에서 확인하세요."
3. NEVER use expressions like "100% 가능", "보장", "확정" for uncertain facts. Use confidence_level=low and strengthen cautions instead.
4. No exaggeration, no sensationalism, no political bias.
5. Output ONLY valid JSON — no markdown fences, no extra text outside the JSON.

ROUTING:
- board_target="tips_board": clearly life tips / daily wisdom / practical hacks for living in Thailand
- board_target="board_board": visa regulations, immigration procedures, documents, legal guides, or ANY ambiguous content
- When in doubt → board_board (never force into tips_board)

OUTPUT STRUCTURE (strict JSON):
{
  "board_target": "tips_board" | "board_board",
  "editorial_meta": {
    "novelty_score": 0-100,
    "usefulness_score": 0-100,
    "confidence_level": "high"|"medium"|"low",
    "reasons": ["string"]
  },
  "ko": {
    "title": "클릭을 부르는 호기심 제목(질문·구체 숫자·상황) 가능. 단, 과장·거짓·선정 금지. 출처 사실 범위만. 120자 이내 권장.",
    "summary": "① 맨 앞 1~2문장(총 120~200자): 비회원 피드·꿀팁 허브에 노출되는 '궁금증 훅'. ② 줄바꿈 후 본 요약(실용·체크리스트 보조). 총 300~700자. 불확실하면 '보도에 따르면/공식 확인 필요'.",
    "checklist": ["실행 가능한 스텝/체크리스트. PII 금지"],
    "cautions": ["공식확인권장/법률자문아님/불확실성 명시. 비자·법률 관련은 반드시 포함"],
    "tags": ["키워드5~8개. PII 금지"]
  },
  "th": {
    "title": "자연스러운 태국어 제목",
    "summary": "태국어 요약 300~600자",
    "checklist": ["태국어 체크리스트"],
    "cautions": ["태국어 주의사항. 비자·법률이면 'ข้อมูลนี้ไม่ใช่คำแนะนำทางกฎหมาย' 포함"],
    "tags": ["태국어 키워드"]
  },
  "board_copy": {
    "category_badge_text": "tips_board면 '꿀팁 한 스푼' 계열, board_board면 '비자·가이드 게시판' 계열",
    "category_description": "짧은 카테고리 소개 1문장"
  },
  "sources": [{"external_url":"","source_name":"","retrieved_at":""}]
}`;

function buildUserBlock(title: string, body: string | null, sourceUrl: string, retrievedAt: string): string {
  return [
    `원문 제목: ${title || '(없음)'}`,
    `원문 발췌(없으면 빈 값): ${body?.trim() || '(없음)'}`,
    `출처 URL: ${sourceUrl}`,
    `수집 시각: ${retrievedAt}`,
    '',
    '위 내용을 기반으로 앞서 지시한 JSON 스키마를 정확히 따라 출력하세요.',
    '원문이 영어/태국어여도 ko.* 는 전부 한국어(한글)로 번역·재작성하고, th.* 는 전부 태국어로 번역·재작성하세요. 영어 문단을 ko.summary에 그대로 넣지 마세요.',
    '반드시 JSON 객체만 출력하고 다른 텍스트는 출력하지 마세요.',
  ].join('\n');
}

const KNOWLEDGE_LLM_LOCALE_RETRY_USER = [
  '이전 응답이 규칙을 만족하지 않았습니다. 같은 원문에 대해 JSON만 다시 출력하세요.',
  '필수: ko.title·ko.summary·ko.checklist·ko.cautions·ko.tags 의 모든 문장은 한글(한국어)만 — 영어 원문 복붙 금지, 반드시 번역·요약.',
  '필수: th.title·th.summary·th.checklist·th.cautions·th.tags 는 태국 문자(ภาษาไทย)만 사용.',
  '숫자·고유명사(DTV, TM30 등)만 라틴 허용, 본문 설명은 각 언어로 작성.',
].join('\n');

const HANGUL_SYLLABLE_RE = /[\uAC00-\uD7AF]/g;
const THAI_LETTER_RE = /[\u0E00-\u0E7F]/g;

function countRegexMatches(s: string, re: RegExp): number {
  const m = s.match(re);
  return m ? m.length : 0;
}

/** LLM이 영어를 ko.* 에 넣는 경우 차단 — 재시도 유도 */
function validateKnowledgeLlmOutputLocales(out: KnowledgeLlmOutput): string | null {
  const koTitle = out.ko.title.trim();
  const koSum = out.ko.summary.trim();
  const hangulT = countRegexMatches(koTitle, HANGUL_SYLLABLE_RE);
  const hangulS = countRegexMatches(koSum, HANGUL_SYLLABLE_RE);
  if (hangulT < 4) {
    return 'ko.title 에 한글 음절이 너무 적습니다. 영어 제목을 한국어로 번역하세요.';
  }
  if (hangulS < 28) {
    return 'ko.summary 는 한글로 된 요약이어야 합니다. 영어 문단을 붙여 넣지 말고 한국어로 300자 내외로 다시 쓰세요.';
  }

  const thTitle = out.th.title.trim();
  const thSum = out.th.summary.trim();
  const thaiT = countRegexMatches(thTitle, THAI_LETTER_RE);
  const thaiS = countRegexMatches(thSum, THAI_LETTER_RE);
  if (thaiT < 4) {
    return 'th.title 은 태국어 문자로 작성하세요.';
  }
  if (thaiS < 28) {
    return 'th.summary 는 태국어로 작성하세요. 영어만 넣지 마세요.';
  }
  return null;
}

function knowledgeLlmErrorShouldRetryLocaleOrParse(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('LOCALE:') || msg.includes('JSON 파싱 실패') || msg.includes('파싱 실패');
}

// ── JSON 파싱/검증 ────────────────────────────────────────────────────────

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function parseKnowledgeLlmOutput(raw: unknown): KnowledgeLlmOutput | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const boardTarget = o.board_target;
  if (boardTarget !== 'tips_board' && boardTarget !== 'board_board') return null;

  const ko = o.ko as Record<string, unknown> | null;
  const th = o.th as Record<string, unknown> | null;
  if (!ko || !th) return null;
  if (!isNonEmptyString(ko.title) || !isNonEmptyString(ko.summary)) return null;
  if (!isNonEmptyString(th.title) || !isNonEmptyString(th.summary)) return null;

  const editorialMeta = (o.editorial_meta as Record<string, unknown> | null) ?? {};
  const boardCopy = (o.board_copy as Record<string, unknown> | null) ?? {};

  return {
    board_target: boardTarget,
    editorial_meta: {
      novelty_score: typeof editorialMeta.novelty_score === 'number' ? Math.max(0, Math.min(100, editorialMeta.novelty_score)) : 50,
      usefulness_score: typeof editorialMeta.usefulness_score === 'number' ? Math.max(0, Math.min(100, editorialMeta.usefulness_score)) : 50,
      confidence_level:
        editorialMeta.confidence_level === 'high' || editorialMeta.confidence_level === 'medium' || editorialMeta.confidence_level === 'low'
          ? editorialMeta.confidence_level
          : 'medium',
      reasons: isStringArray(editorialMeta.reasons) ? editorialMeta.reasons : [],
    },
    ko: {
      title: String(ko.title).trim(),
      summary: String(ko.summary).trim(),
      editorial_note:
        typeof ko.editorial_note === 'string' && ko.editorial_note.trim()
          ? String(ko.editorial_note).trim()
          : undefined,
      checklist: isStringArray(ko.checklist) ? ko.checklist : [],
      cautions: isStringArray(ko.cautions) ? ko.cautions : [],
      tags: isStringArray(ko.tags) ? ko.tags.slice(0, 8) : [],
    },
    th: {
      title: String(th.title).trim(),
      summary: String(th.summary).trim(),
      editorial_note:
        typeof th.editorial_note === 'string' && th.editorial_note.trim()
          ? String(th.editorial_note).trim()
          : undefined,
      checklist: isStringArray(th.checklist) ? th.checklist : [],
      cautions: isStringArray(th.cautions) ? th.cautions : [],
      tags: isStringArray(th.tags) ? th.tags.slice(0, 8) : [],
    },
    board_copy: {
      category_badge_text: isNonEmptyString(boardCopy.category_badge_text)
        ? String(boardCopy.category_badge_text).trim()
        : boardTarget === 'tips_board' ? '꿀팁 한 스푼' : '비자·가이드 게시판',
      category_description: isNonEmptyString(boardCopy.category_description)
        ? String(boardCopy.category_description).trim()
        : '',
    },
    sources: Array.isArray(o.sources)
      ? (o.sources as Array<Record<string, unknown>>).map((s) => ({
          external_url: typeof s.external_url === 'string' ? s.external_url : '',
          source_name: typeof s.source_name === 'string' ? s.source_name : '',
          retrieved_at: typeof s.retrieved_at === 'string' ? s.retrieved_at : new Date().toISOString(),
        }))
      : [],
  };
}

function extractJsonFromContent(content: string): KnowledgeLlmOutput | null {
  const raw = stripMarkdownFence(content);

  const repairJson = (s: string) => s.replace(/,\s*([}\]])/g, '$1');
  const tryParse = (s: string): unknown => {
    try { return JSON.parse(s); } catch {
      try { return JSON.parse(repairJson(s)); } catch { return null; }
    }
  };

  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  const candidates: string[] = [raw];
  if (first >= 0 && last > first) candidates.push(raw.slice(first, last + 1));

  for (const c of candidates) {
    const parsed = tryParse(c);
    if (parsed) {
      const result = parseKnowledgeLlmOutput(parsed);
      if (result) return result;
    }
  }
  return null;
}

// ── LLM 라우터 ────────────────────────────────────────────────────────────

type KnowledgeChatMessage = { role: 'system' | 'user'; content: string };

function finishKnowledgeLlmParse(content: string, label: string): KnowledgeLlmOutput {
  const result = extractJsonFromContent(content);
  if (!result) {
    throw new Error(`${label} JSON 파싱 실패: ${content.slice(0, 300)}`);
  }
  const locErr = validateKnowledgeLlmOutputLocales(result);
  if (locErr) {
    throw new Error(`LOCALE: ${locErr}`);
  }
  return result;
}

async function routeKnowledgeLlmWithMessages(messages: KnowledgeChatMessage[]): Promise<KnowledgeLlmOutput> {
  const provider = normalizeProvider();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const openaiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiBase = process.env.GEMINI_OPENAI_BASE_URL?.trim() || 'https://generativelanguage.googleapis.com/v1beta/openai';
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
  const localBase = process.env.LOCAL_LLM_BASE_URL?.trim();
  const localModel = process.env.LOCAL_LLM_MODEL?.trim() || 'llama3.2';
  const localKey = process.env.LOCAL_LLM_API_KEY?.trim();

  const runLocal = async (): Promise<KnowledgeLlmOutput> => {
    if (!localBase) throw new Error('LOCAL_LLM_BASE_URL 미설정');
    const content = await callLlm({
      baseUrl: localBase,
      model: localModel,
      apiKey: localKey,
      messages,
      jsonObjectMode: false,
    });
    return finishKnowledgeLlmParse(content, '로컬 LLM');
  };

  const runOpenAi = async (): Promise<KnowledgeLlmOutput> => {
    if (!openaiKey) throw new Error('OPENAI_API_KEY 미설정');
    const content = await callLlm({
      baseUrl: 'https://api.openai.com/v1',
      model: openaiModel,
      apiKey: openaiKey,
      messages,
      jsonObjectMode: true,
    });
    return finishKnowledgeLlmParse(content, 'OpenAI');
  };

  const runGemini = async (): Promise<KnowledgeLlmOutput> => {
    if (!geminiKey) throw new Error('GEMINI_API_KEY 미설정');
    const content = await callLlm({
      baseUrl: geminiBase,
      model: geminiModel,
      apiKey: geminiKey,
      messages,
      jsonObjectMode: false,
    });
    return finishKnowledgeLlmParse(content, 'Gemini');
  };

  if (provider === 'local') return runLocal();
  if (provider === 'gemini') return runGemini();
  if (provider === 'openai') return runOpenAi();

  // auto: OpenAI → Gemini → Local 폴백
  if (openaiKey) {
    try {
      return await runOpenAi();
    } catch (e) {
      if (shouldFallback(e)) {
        if (geminiKey) {
          try {
            return await runGemini();
          } catch (e2) {
            if (localBase) {
              return runLocal();
            }
            throw e2;
          }
        }
        if (localBase) return runLocal();
      }
      throw e;
    }
  }
  if (geminiKey) return runGemini();
  if (localBase) return runLocal();

  throw new Error('LLM 미설정 — OPENAI_API_KEY, GEMINI_API_KEY, LOCAL_LLM_BASE_URL 중 하나 필요');
}

async function callKnowledgeLlm(
  title: string,
  body: string | null,
  sourceUrl: string,
  retrievedAt: string,
): Promise<KnowledgeLlmOutput> {
  const baseMessages: KnowledgeChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserBlock(title, body, sourceUrl, retrievedAt) },
  ];

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages: KnowledgeChatMessage[] =
      attempt === 0 ? baseMessages : [...baseMessages, { role: 'user', content: KNOWLEDGE_LLM_LOCALE_RETRY_USER }];
    try {
      return await routeKnowledgeLlmWithMessages(messages);
    } catch (e) {
      lastErr = e;
      if (attempt === 0 && knowledgeLlmErrorShouldRetryLocaleOrParse(e)) {
        continue;
      }
      throw e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// ── DB 적재 공통 (스텁·LLM 공용) ───────────────────────────────────────────

type RawKnowledgeRow = {
  id: string;
  title_original: string | null;
  raw_body: string | null;
  external_url: string | null;
  fetched_at: string | null;
};

async function insertProcessedKnowledgeFromLlm(
  client: ReturnType<typeof getServerSupabaseClient>,
  rawId: string,
  llm: KnowledgeLlmOutput,
  published: boolean,
): Promise<EnsureKnowledgeDraftResult> {
  const cleanBody = JSON.stringify(llm);
  const { data: proc, error: insP } = await client
    .from('processed_knowledge')
    .insert({
      raw_knowledge_id: rawId,
      clean_body: cleanBody,
      language_default: 'ko',
      board_target: llm.board_target,
      published,
    })
    .select('id')
    .single();

  if (insP || !proc?.id) {
    return {
      ok: false,
      raw_knowledge_id: rawId,
      error: insP?.message ?? 'processed_knowledge insert 실패',
    };
  }

  const pid = proc.id as string;

  const { error: sKo } = await client.from('knowledge_summaries').insert({
    processed_knowledge_id: pid,
    summary_text: llm.ko.summary,
    model: 'ko',
  });
  if (sKo) {
    return { ok: false, raw_knowledge_id: rawId, error: sKo.message };
  }

  const { error: sTh } = await client.from('knowledge_summaries').insert({
    processed_knowledge_id: pid,
    summary_text: llm.th.summary,
    model: 'th',
  });
  if (sTh) {
    return { ok: false, raw_knowledge_id: rawId, error: sTh.message };
  }

  return { ok: true, raw_knowledge_id: rawId, processed_knowledge_id: pid };
}

/**
 * raw 본문이 짧으면 URL fetch 후 LLM(또는 스텁)으로 processed_knowledge 생성.
 * 호출 전 해당 raw에 대한 processed 행이 없어야 합니다.
 */
export async function processKnowledgeFromResolvedRaw(
  client: ReturnType<typeof getServerSupabaseClient>,
  row: RawKnowledgeRow,
): Promise<KnowledgeProcessRowResult> {
  const rawId = String(row.id);
  const title = (row.title_original ?? '').trim() || '(제목 없음)';
  const url = (row.external_url ?? '').trim();
  const fetchedAt = (row.fetched_at ?? new Date().toISOString()).trim();

  const resolved = await resolveKnowledgeRawBodyForProcessing(url, row.raw_body);
  if (resolved.updatedRawBodyForDb) {
    await client.from('raw_knowledge').update({ raw_body: resolved.updatedRawBodyForDb }).eq('id', rawId);
  }

  const bodyForLlm = resolved.llmText;
  const llmReady = isKnowledgeLlmConfigured();
  const allowStub = stubKnowledgeOnLlmFailure();

  if (!llmReady) {
    const stubLlm = buildKnowledgeStubLlmOutput(title, bodyForLlm, url, fetchedAt);
    const r = await insertProcessedKnowledgeFromLlm(client, rawId, stubLlm, false);
    return r.ok
      ? { raw_knowledge_id: rawId, ok: true, board_target: stubLlm.board_target }
      : { raw_knowledge_id: rawId, ok: false, error: r.error };
  }

  try {
    const llm = await callKnowledgeLlm(title, bodyForLlm, url, fetchedAt);
    const r = await insertProcessedKnowledgeFromLlm(client, rawId, llm, knowledgeInsertAsPublished());
    return r.ok
      ? { raw_knowledge_id: rawId, ok: true, board_target: llm.board_target }
      : { raw_knowledge_id: rawId, ok: false, error: r.error };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (allowStub) {
      const stubLlm = buildKnowledgeStubLlmOutput(title, bodyForLlm, url, fetchedAt);
      const r = await insertProcessedKnowledgeFromLlm(client, rawId, stubLlm, false);
      return r.ok
        ? { raw_knowledge_id: rawId, ok: true, board_target: stubLlm.board_target }
        : { raw_knowledge_id: rawId, ok: false, error: r.error ?? msg };
    }
    return { raw_knowledge_id: rawId, ok: false, error: msg };
  }
}

/** 승인 대기 초안만: 삭제 후 원문 URL에서 본문을 다시 긁고 LLM으로 초안 재생성 */
export async function reprocessKnowledgeDraftWithLlm(
  processedKnowledgeId: string,
): Promise<{ ok: boolean; error?: string; board_target?: string }> {
  const client = getServerSupabaseClient();
  const pid = processedKnowledgeId.trim();
  if (!pid) {
    return { ok: false, error: 'processed_knowledge_id 가 비었습니다.' };
  }

  const { data: proc, error: pErr } = await client
    .from('processed_knowledge')
    .select('id, raw_knowledge_id, published')
    .eq('id', pid)
    .maybeSingle();

  if (pErr || !proc) {
    return { ok: false, error: pErr?.message ?? '초안을 찾을 수 없습니다.' };
  }
  if (proc.published === true) {
    return { ok: false, error: '이미 게시된 항목은 재가공할 수 없습니다.' };
  }

  const rawId = String(proc.raw_knowledge_id);
  const { error: delErr } = await client.from('processed_knowledge').delete().eq('id', pid);
  if (delErr) {
    return { ok: false, error: delErr.message };
  }

  const { data: raw, error: rErr } = await client
    .from('raw_knowledge')
    .select('id, title_original, raw_body, external_url, fetched_at')
    .eq('id', rawId)
    .maybeSingle();

  if (rErr || !raw) {
    return { ok: false, error: rErr?.message ?? '원문(raw_knowledge)을 찾을 수 없습니다.' };
  }

  if (!isKnowledgeLlmConfigured()) {
    return {
      ok: false,
      error: 'LLM 키가 설정되어 있지 않습니다. OPENAI_API_KEY 또는 GEMINI_API_KEY 등을 설정한 뒤 다시 시도하세요.',
    };
  }

  const rowResult = await processKnowledgeFromResolvedRaw(client, raw as RawKnowledgeRow);
  if (!rowResult.ok) {
    return { ok: false, error: rowResult.error ?? '재가공 실패' };
  }
  return { ok: true, board_target: rowResult.board_target };
}

// ── 메인 배치 처리 ────────────────────────────────────────────────────────

export async function processAndPersistKnowledgeBatch(
  limit: number,
): Promise<KnowledgeProcessBatchResult> {
  const client = getServerSupabaseClient();
  const cap = Math.min(Math.max(limit, 1), 30);
  const llmReady = isKnowledgeLlmConfigured();
  const allowStub = stubKnowledgeOnLlmFailure();
  const pipelineReady = llmReady || allowStub;

  const { data: processedRows, error: pe } = await client
    .from('processed_knowledge')
    .select('raw_knowledge_id');
  if (pe) {
    return {
      results: [],
      llmConfigured: pipelineReady,
      dbError: `[processed_knowledge select] ${pe.message}`,
    };
  }

  const done = new Set((processedRows ?? []).map((r) => r.raw_knowledge_id as string));

  const { data: rawRows, error: re } = await client
    .from('raw_knowledge')
    .select('id, title_original, raw_body, external_url, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(200);
  if (re) {
    return {
      results: [],
      llmConfigured: pipelineReady,
      dbError: `[raw_knowledge select] ${re.message}`,
    };
  }

  if (!rawRows?.length) {
    return { results: [], llmConfigured: pipelineReady };
  }

  const todo = rawRows.filter((r) => !done.has(r.id as string)).slice(0, cap);
  const results: KnowledgeProcessRowResult[] = [];

  for (const row of todo) {
    const rowResult = await processKnowledgeFromResolvedRaw(client, row as RawKnowledgeRow);
    results.push(rowResult);
  }

  return { results, llmConfigured: pipelineReady };
}

function clampKnowledgePlain(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** LLM 없이 관리자 승인 큐용 최소 구조 (항상 board_board, confidence low) */
function buildKnowledgeStubLlmOutput(
  title: string,
  rawBody: string | null,
  sourceUrl: string,
  fetchedAt: string,
): KnowledgeLlmOutput {
  const head = title.trim() || '(제목 없음)';
  const body = rawBody?.trim() ?? '';
  const excerpt = body.length > 0 ? clampKnowledgePlain(body, 1200) : '';
  const visaKo =
    '법률 자문이 아닙니다. 실제 비자 신청 전 반드시 대사관·공식 기관에서 확인하세요.';
  const visaTh =
    'ข้อมูลนี้ไม่ใช่คำแนะนำทางกฎหมาย — โปรดยืนยันกับสถานทูตหรือหน่วยงานทางการเสมอ';
  const koSummary = excerpt
    ? `${excerpt}\n\n—\n(자동 초안: 원문 발췌. LLM 가공 전입니다. 승인 전에 다듬어 주세요.)`
    : `${KNOWLEDGE_STUB_SUMMARY_SNIPPET}. 출처를 확인한 뒤 편집해 주세요.\n${sourceUrl}`;

  return {
    board_target: 'board_board',
    editorial_meta: {
      novelty_score: 40,
      usefulness_score: 45,
      confidence_level: 'low',
      reasons: ['관리자 스텁 초안 — LLM 미가공'],
    },
    ko: {
      title: clampKnowledgePlain(head, 200),
      summary: koSummary,
      checklist: ['출처에서 공식 정보를 확인합니다.', visaKo],
      cautions: [visaKo, '자동 생성 초안이므로 게시 전 내용을 반드시 검토하세요.'],
      tags: ['Thailand', '자동초안', '검토필요'],
    },
    th: {
      title: clampKnowledgePlain(head, 200),
      summary:
        excerpt.length > 0
          ? '(อัตโนมัติ) มีเนื้อหาต้นฉบับบางส่วนในสรุปภาษาเกาหลี — โปรดเขียนสรุปภาษาไทยก่อนเผยแพร่'
          : '(อัตโนมัติ) ยังไม่มีเนื้อหาเพียงพอ',
      checklist: ['ตรวจสอบจากแหล่งข้อมูลทางการ', visaTh],
      cautions: [visaTh, 'ร่างอัตโนมัติ — ต้องตรวจทานก่อนเผยแพร่'],
      tags: ['Thailand', 'draft'],
    },
    board_copy: {
      category_badge_text: '비자·가이드 게시판',
      category_description: '태국 생활·비자 관련 정보(자동 초안)',
    },
    sources: [
      {
        external_url: sourceUrl,
        source_name: '수집 원문',
        retrieved_at: fetchedAt,
      },
    ],
  };
}

/**
 * `processed_knowledge` 가 없는 `raw_knowledge` 에 스텁 JSON을 넣습니다. 항상 `published=false`.
 */
export async function ensureKnowledgeDraftFromRawKnowledgeId(
  rawKnowledgeId: string,
): Promise<EnsureKnowledgeDraftResult> {
  const id = rawKnowledgeId.trim();
  if (!id) {
    return { ok: false, raw_knowledge_id: id, error: 'raw_knowledge_id 가 비었습니다.' };
  }
  const client = getServerSupabaseClient();

  const { data: existing, error: exErr } = await client
    .from('processed_knowledge')
    .select('id')
    .eq('raw_knowledge_id', id)
    .maybeSingle();
  if (exErr) {
    return { ok: false, raw_knowledge_id: id, error: exErr.message };
  }
  if (existing?.id) {
    return {
      ok: true,
      raw_knowledge_id: id,
      processed_knowledge_id: String(existing.id),
      already_existed: true,
    };
  }

  const { data: raw, error: re } = await client
    .from('raw_knowledge')
    .select('id, title_original, raw_body, external_url, fetched_at')
    .eq('id', id)
    .maybeSingle();
  if (re) {
    return { ok: false, raw_knowledge_id: id, error: re.message };
  }
  if (!raw) {
    return { ok: false, raw_knowledge_id: id, error: 'raw_knowledge 를 찾을 수 없습니다.' };
  }

  const title = (raw.title_original as string)?.trim() || '(제목 없음)';
  const url = (raw.external_url as string) ?? '';
  const fetchedAt = (raw.fetched_at as string) ?? new Date().toISOString();

  const resolved = await resolveKnowledgeRawBodyForProcessing(url, raw.raw_body as string | null);
  if (resolved.updatedRawBodyForDb) {
    await client.from('raw_knowledge').update({ raw_body: resolved.updatedRawBodyForDb }).eq('id', id);
  }

  const stubLlm = buildKnowledgeStubLlmOutput(title, resolved.llmText, url, fetchedAt);
  return insertProcessedKnowledgeFromLlm(client, id, stubLlm, false);
}
