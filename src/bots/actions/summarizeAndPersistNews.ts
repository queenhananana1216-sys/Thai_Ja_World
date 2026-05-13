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
 * - NEWS_LLM_JSON_RETRIES: JSON 필수 필드 누락·무의미 placeholder 시 LLM 응답 전체 재시도(기본 6, 최대 6)
 * - NEWS_SUMMARY_FALLBACK_STUB: LLM 없음/호출 실패 시 원문 메타만으로 초안(processed_news) 생성 여부.
 *   1|true|yes|on = 항상 허용, 0|false|no|off = 끔. 미설정 시 NEWS_PUBLISH_MODE 가 auto 가 아니면(manual·미설정) 켜짐.
 *
 * processed_news.clean_body: { ko: {...}, th: {...}, source_url, seo?: { meta_description_ko, ... } }
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';
import { newsInsertAsPublished } from '@/lib/news/newsPublishMode';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';

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

/** JSON 파싱 실패 시 내부 마커(저장 금지) — 재시도 루프에서만 사용 */
export const NEWS_SCHEMA_EMPTY_PLACEHOLDER = 'empty-placeholder';

function forbiddenNewsCopy(s: string): boolean {
  const t = s.trim().toLowerCase();
  if (!t) return true;
  if (t.includes(NEWS_SCHEMA_EMPTY_PLACEHOLDER)) return true;
  if (t.includes('내용 준비 중')) return true;
  if (t.includes('준비 중입니다')) return true;
  if (t === 'tbd' || t === 'n/a' || t === 'na') return true;
  return false;
}

/** 스텁 복붙·짧은 한마디 수준의 insight/counter 는 재시도 유도 */
function shallowKoInsightOrCountermeasure(insight: string, counter: string): boolean {
  const i = insight.trim();
  const c = counter.trim();
  if (i.length < 40 || c.length < 40) return true;
  if (i === c) return true;
  if (i.includes('«뉴스 한 줄»') && i.includes('교민 입장에선')) return true;
  if (c.includes('대사관·이민국·은행 공지로 교차 확인') && c.includes('아직 확정이 아닌 말은 단정하지 말고')) {
    return true;
  }
  return false;
}

interface LlmBilingualPayload {
  /** 한국어 헤드라인(표기용, ko.title 과 동기) */
  title_kr: string;
  ko_title: string;
  ko_summary: string;
  ko_blurb: string;
  /** 왜 중요한지·영향(한국어, 1~2문장) */
  ko_insight_impact: string;
  /** 이용자 관점 대응·완충(한국어, 1~2문장) */
  ko_countermeasure: string;
  /** 편집실 톤 한마디(팩트 반복 금지). 비어 있으면 UI에 안 씀 */
  ko_editor_note: string;
  th_title: string;
  th_summary: string;
  th_blurb: string;
  th_editor_note: string;
  /** SEO meta (optional from LLM; persist fills fallbacks) */
  meta_description_ko?: string;
  meta_description_th?: string;
  meta_description_en?: string;
  meta_description_zh_cn?: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function pickSeoMetaField(o: Record<string, unknown>, key: string): string | undefined {
  const v = o[key];
  if (!isNonEmptyString(v)) return undefined;
  const t = trimForMetaDescription(v.trim(), 155);
  if (forbiddenNewsCopy(t)) return undefined;
  return t;
}

function reKeyQuoted(key: string): string {
  return key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** [SCHEMA REPAIRED] 깨진 JSON 본문에서 따옴표 문자열 값만 끌어옵니다. */
function regexExtractQuoted(haystack: string, keys: string[]): string | null {
  for (const k of keys) {
    const re = new RegExp(`"${reKeyQuoted(k)}"\\s*:\\s*"([\\s\\S]*?)"`, 'im');
    const m = re.exec(haystack);
    if (m && typeof m[1] === 'string') {
      return m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .trim();
    }
  }
  return null;
}

function schemaRepairedFlatMap(haystack: string): Record<string, string> {
  const g = (keys: string[]) => regexExtractQuoted(haystack, keys);
  return {
    title_kr: g(['title_kr', 'titleKr', 'ko_title', 'kotitle']) ?? '',
    ko_title: g(['ko_title', 'title_kr', 'kotitle']) ?? '',
    ko_summary: g(['ko_summary', 'summary_ko', 'koSummary']) ?? '',
    ko_blurb: g(['ko_blurb', 'blurb_ko', 'koBlurb']) ?? '',
    ko_insight_impact: g(['ko_insight_impact', 'insight_impact', 'koInsightImpact', 'insight']) ?? '',
    ko_countermeasure: g(['ko_countermeasure', 'countermeasure', 'koCountermeasure', 'counter_measure']) ?? '',
    ko_editor_note: g(['ko_editor_note', 'editor_note_ko']) ?? '',
    th_title: g(['th_title', 'title_th']) ?? '',
    th_summary: g(['th_summary', 'summary_th']) ?? '',
    th_blurb: g(['th_blurb', 'blurb_th']) ?? '',
    th_editor_note: g(['th_editor_note', 'editor_note_th']) ?? '',
    meta_description_ko: g(['meta_description_ko', 'metaDescriptionKo']) ?? '',
    meta_description_th: g(['meta_description_th', 'metaDescriptionTh']) ?? '',
    meta_description_en: g(['meta_description_en', 'metaDescriptionEn']) ?? '',
    meta_description_zh_cn: g(['meta_description_zh_cn', 'metaDescriptionZhCn', 'meta_description_zh-CN']) ?? '',
  };
}

function parseLlmPayload(raw: unknown): LlmBilingualPayload | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const titleKrRaw = isNonEmptyString(o.title_kr)
    ? o.title_kr.trim()
    : isNonEmptyString(o.ko_title)
      ? o.ko_title.trim()
      : '';
  const koTitleRaw = isNonEmptyString(o.ko_title)
    ? o.ko_title.trim()
    : isNonEmptyString(o.title_kr)
      ? o.title_kr.trim()
      : '';
  if (
    !titleKrRaw ||
    !koTitleRaw ||
    !isNonEmptyString(o.ko_summary) ||
    !isNonEmptyString(o.ko_blurb) ||
    !isNonEmptyString(o.ko_insight_impact) ||
    !isNonEmptyString(o.ko_countermeasure) ||
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
  const head = clampPlainText(titleKrRaw || koTitleRaw, 200);
  const out: LlmBilingualPayload = {
    title_kr: head,
    ko_title: head,
    ko_summary: o.ko_summary.trim(),
    ko_blurb: clamp(String(o.ko_blurb), 160),
    ko_insight_impact: clamp(String(o.ko_insight_impact), 420),
    ko_countermeasure: clamp(String(o.ko_countermeasure), 420),
    ko_editor_note: koEd,
    th_title: o.th_title.trim(),
    th_summary: o.th_summary.trim(),
    th_blurb: clamp(String(o.th_blurb), 160),
    th_editor_note: thEd,
  };
  if (
    forbiddenNewsCopy(out.title_kr) ||
    forbiddenNewsCopy(out.ko_blurb) ||
    forbiddenNewsCopy(out.ko_insight_impact) ||
    forbiddenNewsCopy(out.ko_countermeasure)
  ) {
    return null;
  }
  if (shallowKoInsightOrCountermeasure(out.ko_insight_impact, out.ko_countermeasure)) {
    return null;
  }
  const mKo = pickSeoMetaField(o, 'meta_description_ko');
  const mTh = pickSeoMetaField(o, 'meta_description_th');
  const mEn = pickSeoMetaField(o, 'meta_description_en');
  const mZh = pickSeoMetaField(o, 'meta_description_zh_cn');
  if (!mKo || !mTh || !mEn || !mZh) {
    return null;
  }
  out.meta_description_ko = mKo;
  out.meta_description_th = mTh;
  out.meta_description_en = mEn;
  out.meta_description_zh_cn = mZh;
  return out;
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
  const stubHead = clampPlainText(head, 200);
  return {
    title_kr: stubHead,
    ko_title: stubHead,
    ko_summary,
    ko_blurb: clampPlainText(head, 100),
    ko_insight_impact:
      '교민 입장에선 «뉴스 한 줄»보다 비자·TM30·세금·환율에 닿는지가 핵심이에요. 원문·공지를 열어 실제로 바뀐 조항·날짜·대상만 짚어 적어 주세요.',
    ko_countermeasure:
      '아직 확정이 아닌 말은 단정하지 말고, 대사관·이민국·은행 공지로 교차 확인하는 루틴을 안내해 주세요. 급하면 현지 변호사·세무사 한 번은 기본값이에요.',
    ko_editor_note: `LLM 없음·오류로 원문 제목·발췌만으로 초안을 만들었어요.${errTail}`,
    th_title: clampPlainText(head, 200),
    th_summary:
      excerpt.length > 0
        ? '(อัตโนมัติ) มีข้อความต้นฉบับบางส่วนในสรุปภาษาเกาหลี — โปรดเขียนสรุปภาษาไทยก่อนเผยแพร่'
        : '(อัตโนมัติ) ยังไม่มีเนื้อหาเพียงพอ — โปรดแก้ไขก่อนเผยแพร่',
    th_blurb: clampPlainText(head, 100),
    th_editor_note: 'ร่างอัตโนมัติ — แก้ภาษาไทยก่อนเผยแพร่',
    meta_description_ko: trimForMetaDescription(`${stubHead} 태국 교민 비자 TM30 바트 환율 꿀팁`, 155),
    meta_description_th: trimForMetaDescription(`${stubHead} ไทย วีซ่า TM30 บาท`, 155),
    meta_description_en: trimForMetaDescription(`Thailand news draft: ${stubHead} visa TM30 baht`, 155),
    meta_description_zh_cn: trimForMetaDescription(`泰国资讯草稿: ${stubHead} 签证 泰铢`, 155),
  };
}

const BILINGUAL_SYSTEM_PROMPT =
  'You are a 20-year Thailand-resident Korean diaspora veteran for "Living in Thai" (Thai Ja World): visas, TM30 headaches, baht FX swings, condo rules, school runs, and "how locals actually work around it" — sharp, witty, never flippant about facts. Output valid JSON only.\n\n' +
  'Required keys: title_kr, ko_title, ko_summary, ko_blurb, ko_insight_impact, ko_countermeasure, ko_editor_note, th_title, th_summary, th_blurb, th_editor_note, meta_description_ko, meta_description_th, meta_description_en, meta_description_zh_cn.\n\n' +
  'Voice:\n' +
  '- Not a wire-service rewrite: sharpen how this hits a Korean resident’s wallet, visa status, commute, school run, or peace of mind.\n' +
  '- Wit is welcome, but never at the cost of accuracy; hedge when the source hedges.\n\n' +
  'Rules:\n' +
  '- title_kr and ko_title must be the same Korean headline (non-empty, no internal jargon like "metadata").\n' +
  '- ko_insight_impact: 2 Korean sentences max, MUST tie to THIS story (fees, deadlines, enforcement tone, who gets caught first). Ban generic "life tips" that could apply to any article. No new unverified facts.\n' +
  '- ko_countermeasure: 2 Korean sentences max, concrete next checks (which office/site/document, what to screenshot, what to ask in Thai/Korean) grounded in the source. Ban copy-paste boilerplate that could fit any headline.\n' +
  '- ko_blurb: punchy card hook (~40–90 Korean characters vibe) that still respects defamation/safety norms.\n' +
  '- meta_description_*: each <=155 chars, natural language, include high-intent keywords (Korean: 태국 교민 비자 TM30 바트 환율; Thai: ไทย วีซ่า TM30 บาท; English: Thailand expat visa TM30 baht FX; zh_cn: 泰国 签证 TM30 泰铢) without stuffing or false claims.\n' +
  '- NEVER output placeholder fluff such as "내용 준비 중", "TBD", "N/A", or the literal token "' +
  NEWS_SCHEMA_EMPTY_PLACEHOLDER +
  '" in any field.\n' +
  '- Do NOT invent facts. Use only what is present in the provided title/body and keep it consistent with the source URL.\n' +
  '- Avoid defamation: never state uncertain allegations as confirmed facts.\n' +
  '- Avoid identifying private individuals; if names are not clearly provided in the input, use neutral wording.\n\n' +
  'Rules for ko_editor_note and th_editor_note (VERY IMPORTANT):\n' +
  '- Desk voice AFTER facts: informal editor notes, NOT a second summary.\n' +
  '- Do NOT repeat or paraphrase ko_summary/th_summary. No new facts.\n' +
  '- Korean note in natural Korean; Thai note in natural Thai (same vibe).\n' +
  '- 1~3 short sentences; warm, slightly witty; no hard-sell, no political rallying.\n\n' +
  'Output only the JSON object with the fifteen string fields.';

function buildBilingualUserBlock(title: string, body: string | null, sourceUrl: string): string {
  return [
    `원문 제목: ${title}`,
    `원문 본문(없으면 빈 값): ${body?.trim() || '(없음)'}`,
    `출처 URL: ${sourceUrl}`,
    '',
    '아래는 태국에 사는 한국인·교민에게 실제로 닿는 뉴스/공지 원문입니다. 20년 차 현지 생존자의 시선으로, 비자·TM30·세금·바트·안전 중 무엇에 꽂히는지부터 짚어 주세요.',
    '원문 언어와 관계없이 아래 열다섯 필드를 모두 채우세요. title_kr·ko_title에는 "메타데이터" 같은 내부 용어를 넣지 마세요.',
    '「내용 준비 중», "TBD", "N/A", "' + NEWS_SCHEMA_EMPTY_PLACEHOLDER + '" 같은 무의미 문자열은 절대 넣지 마세요. 모르면 원문 범위 안에서만 완충 표현을 쓰세요.',
    '반드시 아래 키만 가진 JSON 객체 한 개만 출력하세요 (다른 텍스트 금지):',
    '{"title_kr":"","ko_title":"","ko_summary":"","ko_blurb":"","ko_insight_impact":"","ko_countermeasure":"","ko_editor_note":"","th_title":"","th_summary":"","th_blurb":"","th_editor_note":"","meta_description_ko":"","meta_description_th":"","meta_description_en":"","meta_description_zh_cn":""}',
    '- title_kr, ko_title: 동일한 한국어 한 줄 헤드라인(팩트 기반, 제공된 제목/본문/출처 범위 내에서만). 영어 원문 제목을 그대로 복사하지 말고 한국어로 재작성.',
    '- ko_summary: 한국어 2~4문장 요약. 반드시 첫 문장부터 “클릭을 부르는 훅”이 되게 작성하되, 검증되지 않은 내용(예: 확정된 범죄 여부, 특정 개인 신상, 확실하지 않은 수사 결과)은 절대 단정하지 말 것. 원문에 근거가 없으면 “보도에 따르면/관계자는/현지 매체는” 같은 완충 표현을 사용.',
    '- ko_blurb: 피드 카드에 쓰는 1문장(짧은 첫줄) 훅. 40~90자 내외. 자극적이어도 되지만 과장/허위/명예훼손/혐오/정치 선동 금지. “보도에 따르면” 같은 근거 표현을 우선.',
    '- ko_insight_impact: 반드시 «이 기사»의 주제·주체·기한·금액·지역 중 무엇이 교민의 비자·통장·통학·출퇴근에 닿는지 구체적으로. 뉴스 한 줄과 무관한 일반론·훈계 금지.',
    '- ko_countermeasure: 오늘·이번 주에 할 체크리스트 형태(어느 사이트/창구, 어떤 서류, 어떤 질문을 태국어로 던질지). 다른 기사에도 그대로 붙일 수 있는 상투문 금지.',
    '- ko_editor_note: 위 요약과 별개로, 운영 편집실이 남기는 짧은 한마디. 뉴스 팩트를 다시 말하지 말 것. 부담 없이 감상·댓글을 권하는 느낌 + 가벼운 위트(“생각 쓰면 서로 시간 뺏는 거 아시죠” 같은 톤도 OK). 홍보·가입 독려·무거운 설교 금지.',
    '- th_title, th_summary: 자연스러운 태국어(공손한 뉴스 톤).',
    '- th_blurb: 태국어로 같은 뉘앙스의 짧은 한마디(길이는 한국어 blurb 와 비슷하게).',
    '- th_editor_note: 태국어로 ko_editor_note 와 같은 역할·톤. 요약(th_summary) 내용을 반복하지 말 것.',
    '- meta_description_ko: 한국어, 155자 이내, 태국 체류·비자·TM30·바트·환율 등 검색 의도 키워드를 자연스럽게 포함.',
    '- meta_description_th: 태국어, 155자 이내, 동일 키워드 뉘앙스(วีซ่า TM30 เงินบาท 등).',
    '- meta_description_en: English, <=155 chars, Thailand expat / visa / TM30 / baht FX angle, no fabricated facts.',
    '- meta_description_zh_cn: Simplified Chinese, <=155 chars, 泰国生活 / 签证 / TM30 / 泰铢 등 자연스러운 표현.',
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

function mergeFlatStringsIntoRecord(
  base: Record<string, unknown>,
  flat: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(flat)) {
    if (v && !isNonEmptyString(out[k])) out[k] = v;
  }
  return out;
}

function parseBilingualPayloadFromContent(content: string, label: string): LlmBilingualPayload {
  const raw = stripMarkdownJsonFence(content);

  const truncateForError = (s: string) =>
    s.length > 500 ? `${s.slice(0, 500)}…(truncated)` : s;

  const repairJson = (s: string): string => {
    let out = s.trim();
    out = out.replace(/,\s*([}\]])/g, '$1');
    return out;
  };

  const tryFromObject = (obj: unknown, sourceTag: string): LlmBilingualPayload | null => {
    if (obj === null || typeof obj !== 'object') return null;
    const o0 = obj as Record<string, unknown>;
    let pay = parseLlmPayload(o0);
    if (pay) return pay;
    const merged = mergeFlatStringsIntoRecord(o0, schemaRepairedFlatMap(raw));
    pay = parseLlmPayload(merged);
    if (pay) {
      console.warn(`[NewsSummary] ${label}: [SCHEMA REPAIRED] ${sourceTag} — 누락 키 RegEx 보강`);
      return pay;
    }
    return null;
  };

  try {
    const parsed = JSON.parse(raw) as unknown;
    const ok = tryFromObject(parsed, 'flat-json');
    if (ok) return ok;
  } catch {
    /* fall through */
  }

  const m = raw.match(/\{[\s\S]*?\}/m);
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');

  const candidates: string[] = [];
  if (m?.[0]) candidates.push(m[0]);
  if (first >= 0 && last > first) candidates.push(raw.slice(first, last + 1));

  for (const c of candidates) {
    let parsed: unknown | null = null;
    try {
      parsed = JSON.parse(c) as unknown;
    } catch {
      try {
        parsed = JSON.parse(repairJson(c)) as unknown;
      } catch {
        parsed = null;
      }
    }
    if (!parsed) continue;
    const ok = tryFromObject(parsed, 'extracted-json');
    if (ok) return ok;
  }

  throw new Error(
    `${label} JSON 파싱·필수 필드 복구 실패(무의미 placeholder 저장 안 함): ${truncateForError(raw)}`,
  );
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
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.warn(
          '[NewsLLM] Vercel: LOCAL_LLM_BASE_URL 이 로컬호스트라 무시합니다. Production에 OPENAI_API_KEY 또는 GEMINI_API_KEY 를 넣으세요.',
        );
      }
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
  const parseRetriesRaw = process.env.NEWS_LLM_JSON_RETRIES?.trim();
  const parseRetriesParsed = parseRetriesRaw ? Number(parseRetriesRaw) : NaN;
  const maxAttempts =
    Number.isFinite(parseRetriesParsed) && parseRetriesParsed >= 1
      ? Math.min(6, Math.floor(parseRetriesParsed))
      : 6;

  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const userBlock = buildBilingualUserBlock(title, body, sourceUrl);
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: BILINGUAL_SYSTEM_PROMPT },
      { role: 'user', content: userBlock },
    ];
    try {
      return await runNewsSummaryProviders(messages, parseBilingualPayloadFromContent, 2800);
    } catch (e) {
      lastErr = e;
      if (attempt >= maxAttempts) break;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        `[NewsSummary] JSON 파싱·필수필드 실패 → LLM 재시도 ${attempt + 1}/${maxAttempts}: ${msg.slice(0, 220)}`,
      );
      await sleepMs(650 * attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
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

function newsSeoFromPayload(llm: LlmBilingualPayload): {
  meta_description_ko: string;
  meta_description_th: string;
  meta_description_en: string;
  meta_description_zh_cn: string;
} {
  const koFb = trimForMetaDescription(`${llm.ko_blurb} 태국 교민 비자 TM30 바트 환율 Living in Thai`, 155);
  const thFb = trimForMetaDescription(`${llm.th_blurb} ไทย วีซ่า TM30 เงินบาท`, 155);
  const enFb = trimForMetaDescription(
    `Thailand expat: ${llm.ko_blurb.slice(0, 72)} visa · TM30 · baht FX`,
    155,
  );
  const zhFb = trimForMetaDescription(`泰国生活: ${llm.ko_blurb.slice(0, 72)} 签证 TM30 泰铢`, 155);
  return {
    meta_description_ko: llm.meta_description_ko?.trim()
      ? trimForMetaDescription(llm.meta_description_ko.trim(), 155)
      : koFb,
    meta_description_th: llm.meta_description_th?.trim()
      ? trimForMetaDescription(llm.meta_description_th.trim(), 155)
      : thFb,
    meta_description_en: llm.meta_description_en?.trim()
      ? trimForMetaDescription(llm.meta_description_en.trim(), 155)
      : enFb,
    meta_description_zh_cn: llm.meta_description_zh_cn?.trim()
      ? trimForMetaDescription(llm.meta_description_zh_cn.trim(), 155)
      : zhFb,
  };
}

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
      title: llm.title_kr,
      title_kr: llm.title_kr,
      summary: llm.ko_summary,
      blurb: llm.ko_blurb,
      insight_impact: llm.ko_insight_impact,
      countermeasure: llm.ko_countermeasure,
      ...(llm.ko_editor_note ? { editor_note: llm.ko_editor_note } : {}),
    },
    th: {
      title: llm.th_title,
      summary: llm.th_summary,
      blurb: llm.th_blurb,
      ...(llm.th_editor_note ? { editor_note: llm.th_editor_note } : {}),
    },
    source_url: url,
    seo: newsSeoFromPayload(llm),
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

  if (publishedFlag) {
    void import('@/lib/seo/googleIndexing')
      .then(({ requestGoogleIndexing }) => requestGoogleIndexing(absoluteUrl(`/news/${pid}`)))
      .catch((err) => console.warn('[googleIndexing] news insert', err));
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
