/**
 * summarizeAndPersistNews.ts — raw_news → LLM 가공 → processed_news / summaries (크론: 이중언어, 관리자 재가공: 한국어 전용 API)
 *
 * 환경 변수:
 * - NEWS_SUMMARY_PROVIDER: openai | gemini | local | ollama | auto (기본 auto). `ollama` 는 `local` 과 동일(Ollama OpenAI 호환 API).
 * - OpenAI: OPENAI_API_KEY, OPENAI_MODEL (기본 gpt-4o-mini)
 * - Gemini(OpenAI 호환 엔드포인트): GEMINI_API_KEY, GEMINI_MODEL (기본 gemini-2.0-flash), GEMINI_OPENAI_BASE_URL (선택)
 * - 로컬(OpenAI 호환): LOCAL_LLM_BASE_URL (예: http://127.0.0.1:11434/v1), LOCAL_LLM_MODEL (기본 llama3.2), LOCAL_LLM_API_KEY (선택)
 * - Groq(무료 티어 폴백): GROQ_API_KEY, GROQ_API_KEYS(쉼표), GROQ_MODEL(기본 llama-3.3-70b-versatile)
 * - auto: 기본은 **클라우드 우선**. 비-Vercel 런타임에서 `LOCAL_LLM_BASE_URL` 이 잡히면 `NEWS_SUMMARY_CLOUD_FIRST=1` 이 **아닐 때만** Ollama(로컬)를 **먼저** 시도한 뒤 실패 시 OpenAI→Gemini→Groq 순으로 폴백합니다.
 * - `MASTER_ENV_DOCKER_PATH`: 비프로덕션에서만 사용. 미설정 시 `F:/02_Master_Keys/API_JSON/.env.docker` 가 있으면 `override:false` 로 dotenv 로드(이미 설정된 `process.env` 는 덮어쓰지 않음).
 * - OPENAI_API_KEYS: 쉼표로 구분한 키 목록(선택). 있으면 요청·재시도마다 순환해 할당량 분산
 * - GEMINI_API_KEYS: Gemini용 동일(선택). HTTP 429 시 키 커서를 즉시 밀어 다음 키로 스위칭
 * - NEWS_LLM_FETCH_RETRIES: 최대 시도 횟수(기본 5, 상한 12). 네트워크 오류·HTTP 429/502/503/500 시 지수 백오프 후 재시도
 * - NEWS_LLM_MAX_ATTEMPTS: 위와 동일 목적(숫자가 더 최신). 둘 다 있으면 NEWS_LLM_FETCH_RETRIES 우선
 * - NEWS_LLM_INTER_ARTICLE_DELAY_MS: 배치에서 기사 건마다 LLM 호출 직후 대기(ms). 기본 400 (429 완화)
 * - NEWS_LLM_JSON_RETRIES: 이중언어 뉴스 JSON 품질 재생성 상한 — 기본 6, 최대 12(환경 변수). title_kr·ko_blurb·ko_insight_impact·ko_countermeasure 에 스텁/과도하게 짧은 문장이 있으면 동일 LLM 파이프라인으로 재호출.
 * - NEWS_SUMMARIZE_MAX_BATCH: summarize 배치 상한(기본 12, 최대 30)
 * - NEWS_INSIGHT_RETROFIT_MAX_BATCH: 인사이트 재가공 배치 상한(기본 12, 최대 25)
 * - NEWS_SUMMARY_FALLBACK_STUB: LLM 없음/호출 실패 시 원문 메타만으로 초안(processed_news) 생성 여부.
 *   1|true|yes|on = 항상 허용, 0|false|no|off = 끔. 미설정 시 NEWS_PUBLISH_MODE 가 auto 가 아니면(manual·미설정) 켜짐.
 *
 * processed_news.clean_body: { ko: {title,summary,blurb,editor_note,insight_impact?,countermeasure?}, th: {...}, source_url, ai_signals? }
 * 가공 톤은 `BILINGUAL_SYSTEM_PROMPT`(교민 커뮤니티 편집장 페르소나·불릿 썰·핵심 한 줄 레이블) — 뉴스 크론 요약의 단일 소스.
 */

import { existsSync } from 'node:fs';
import { config as dotenvConfig } from 'dotenv';
import { getServerSupabaseClient } from '../adapters/supabaseClient';
import { passesKoPublicGate } from '@/lib/news/processedNewsDisplay';
import { newsInsertAsPublished } from '@/lib/news/newsPublishMode';
import {
  sanitizeAiKoreanPhrases,
  sanitizeAiThaiPhrases,
  sanitizeKoreanCommunityText,
} from '@/lib/text/normalizeDisplayText';
import { recordPipelineErrorEvent } from '@/lib/pipeline/pipelineErrorLearning';
import { requestGoogleIndexing } from '@/lib/seo/googleIndexing';
import { absoluteUrl } from '@/lib/seo/site';

export type NewsSummaryProvider = 'openai' | 'gemini' | 'local' | 'ollama' | 'auto';

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

function normalizeNewsSummaryProvider(): 'openai' | 'gemini' | 'local' | 'auto' {
  loadMasterDockerEnvOnce();
  const raw = (process.env.NEWS_SUMMARY_PROVIDER || 'auto').trim().toLowerCase();
  if (raw === 'ollama') return 'local';
  const v = raw;
  if (v === 'openai' || v === 'gemini' || v === 'local' || v === 'auto') return v;
  return 'auto';
}

let masterDockerEnvMerged = false;

/** 로컬 워크스테이션: 마스터 `.env.docker` 에서 누락된 LLM 키만 보강 (프로덕션·Vercel 에서는 무시). */
function loadMasterDockerEnvOnce(): void {
  if (masterDockerEnvMerged) return;
  masterDockerEnvMerged = true;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return;
  const path =
    process.env.MASTER_ENV_DOCKER_PATH?.trim() || 'F:/02_Master_Keys/API_JSON/.env.docker';
  try {
    if (!existsSync(path)) return;
    dotenvConfig({ path, override: false });
  } catch {
    // no-op: 로컬 경로 없거나 읽기 실패 시 클라우드 env 만 사용
  }
}

/** 비-Vercel + 로컬 LLM URL 이 있으면 auto 경로에서 Ollama 를 먼저 시도(클라우드 우선 복구: NEWS_SUMMARY_CLOUD_FIRST=1). */
function shouldTryLocalLlmFirstInAuto(localBase: string | undefined): boolean {
  if (!localBase) return false;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return false;
  const forceCloud = String(process.env.NEWS_SUMMARY_CLOUD_FIRST ?? '')
    .trim()
    .toLowerCase();
  if (forceCloud === '1' || forceCloud === 'true' || forceCloud === 'yes') return false;
  return true;
}

/** process-news / 배치가 돌아갈 수 있는지 (키 또는 로컬 URL). Vercel에서는 localhost LLM URL 제외 */
function parseCommaSeparatedApiKeys(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getOpenAiApiKeyCandidates(): string[] {
  const multi = parseCommaSeparatedApiKeys(process.env.OPENAI_API_KEYS);
  if (multi.length > 0) return multi;
  const one = process.env.OPENAI_API_KEY?.trim();
  return one ? [one] : [];
}

function getGeminiApiKeyCandidates(): string[] {
  const multi = parseCommaSeparatedApiKeys(process.env.GEMINI_API_KEYS);
  if (multi.length > 0) return multi;
  const one = process.env.GEMINI_API_KEY?.trim();
  return one ? [one] : [];
}

function getGroqApiKeyCandidates(): string[] {
  const multi = parseCommaSeparatedApiKeys(process.env.GROQ_API_KEYS);
  if (multi.length > 0) return multi;
  const one = process.env.GROQ_API_KEY?.trim();
  return one ? [one] : [];
}

export function isNewsSummaryLlmConfigured(): boolean {
  const p = normalizeNewsSummaryProvider();
  const localOk = Boolean(resolveLocalLlmBaseUrlForRuntime(process.env.LOCAL_LLM_BASE_URL));
  if (p === 'openai') return getOpenAiApiKeyCandidates().length > 0;
  if (p === 'gemini') return getGeminiApiKeyCandidates().length > 0;
  if (p === 'local') return localOk;
  return (
    getOpenAiApiKeyCandidates().length > 0 ||
    getGeminiApiKeyCandidates().length > 0 ||
    getGroqApiKeyCandidates().length > 0 ||
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
  /** 교민·거주자에게 미치는 영향(팩트 범위) */
  ko_insight_impact: string;
  ko_countermeasure: string;
  th_insight_impact: string;
  th_countermeasure: string;
  /** 목록 경고·뱃지 강도: none | elevated | high */
  incident_attention: 'none' | 'elevated' | 'high';
  feed_warning_ko: string;
  feed_warning_th: string;
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
  const base = parts.length > 0 ? parts : ['태국', '뉴스', '방콕', '태국에 살자', 'Living in Thai', '교민'];
  return normalizeSeoKeywords(base);
}

function normalizeIncidentAttention(
  raw: string | undefined,
): 'none' | 'elevated' | 'high' {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === 'high' || s === 'elevated' || s === 'none') return s;
  return 'none';
}

const NEWS_CM_HEADER_KO = '**[운영자의 대비책]**';
const NEWS_CM_HEADER_TH = '**[แผนรับมือจากทีม 운영]**';

function koSummaryHasCountermeasureHeader(s: string): boolean {
  return s.includes('[운영자의 대비책]') || s.includes('[AI의 대비책]');
}

function thSummaryHasCountermeasureHeader(s: string): boolean {
  return (
    s.includes('แผนรับมือจากทีม 운영') ||
    s.includes('แผนรับมือจาก AI') ||
    s.includes('[แผนรับมือจาก AI]')
  );
}

function defaultNewsKoCountermeasure(): string {
  return '· 출처 기사·관할 기관 공지를 한 번 더 확인한다.\n· 오늘·이번 주 일정에 영향이 있는지 판단한다.\n· 세부 불확실 시 대사관·공식 채널로만 확인한다.';
}

function defaultNewsThCountermeasure(): string {
  return '· ตรวจสอบแถลงการณ์จากหน่วยงานที่เกี่ยวข้องอีกครั้ง\n· ประเมินผลกระทบต่อตารางงานของคุณในสัปดาห์นี้\n· หากไม่แน่ใจ ให้ยืนยันผ่านช่องทางราชการหรือสถานทูตเท่านั้น';
}

function defaultNewsKoInsightFromTitle(title: string): string {
  const t = title.trim() || '이번 소식';
  return `${t}을(를) 태국에 체류·거주하는 한국인 독자 눈높이에서 보면, 당장 확인할 우선순위가 있는지 점검할 가치가 있습니다. 원문 밖 사실은 쓰지 않습니다.`;
}

/** LLM이 헤더·필드를 빠뜨려도 저장·피드 전 **대비책 블록**이 빠지지 않게 보강 */
function enforceNewsBilingualCountermeasureSections(payload: LlmBilingualPayload): LlmBilingualPayload {
  let koCm = payload.ko_countermeasure.trim();
  let thCm = payload.th_countermeasure.trim();
  let koInsight = payload.ko_insight_impact.trim();
  let thInsight = payload.th_insight_impact.trim();

  if (!koInsight) koInsight = defaultNewsKoInsightFromTitle(payload.title_kr);
  if (!thInsight) thInsight = koInsight;

  if (!koCm) koCm = defaultNewsKoCountermeasure();
  if (!thCm) thCm = defaultNewsThCountermeasure();

  let content_kr = payload.content_kr.trim();
  let content_th = payload.content_th.trim();

  if (!koSummaryHasCountermeasureHeader(content_kr)) {
    content_kr = `${content_kr}\n\n${NEWS_CM_HEADER_KO}\n${koCm}`;
  }
  if (!thSummaryHasCountermeasureHeader(content_th)) {
    content_th = `${content_th}\n\n${NEWS_CM_HEADER_TH}\n${thCm}`;
  }

  return {
    ...payload,
    content_kr,
    content_th,
    ko_insight_impact: koInsight,
    th_insight_impact: thInsight,
    ko_countermeasure: koCm,
    th_countermeasure: thCm,
  };
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
    content_kr: sanitizeKorean(payload.content_kr, 1400),
    ko_blurb: sanitizeKorean(payload.ko_blurb, 130),
    ko_editor_note: sanitizeKorean(payload.ko_editor_note, 260),
    title_th: sanitizeThai(payload.title_th, 110),
    content_th: sanitizeThai(payload.content_th, 1400),
    th_blurb: sanitizeThai(payload.th_blurb, 130),
    th_editor_note: sanitizeThai(payload.th_editor_note, 260),
    seo_keywords: normalizeSeoKeywords(payload.seo_keywords ?? []),
    ko_insight_impact: sanitizeKorean(payload.ko_insight_impact, 420),
    ko_countermeasure: sanitizeKorean(payload.ko_countermeasure, 520),
    th_insight_impact: sanitizeThai(payload.th_insight_impact, 420),
    th_countermeasure: sanitizeThai(payload.th_countermeasure, 520),
    incident_attention: normalizeIncidentAttention(payload.incident_attention),
    feed_warning_ko: sanitizeKorean(payload.feed_warning_ko, 72),
    feed_warning_th: sanitizeThai(payload.feed_warning_th, 72),
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
  const koInsight = isNonEmptyString(o.ko_insight_impact) ? String(o.ko_insight_impact).trim() : '';
  const koCm = isNonEmptyString(o.ko_countermeasure) ? String(o.ko_countermeasure).trim() : '';
  const thInsight = isNonEmptyString(o.th_insight_impact) ? String(o.th_insight_impact).trim() : '';
  const thCm = isNonEmptyString(o.th_countermeasure) ? String(o.th_countermeasure).trim() : '';
  const incident_attention = normalizeIncidentAttention(
    typeof o.incident_attention === 'string' ? o.incident_attention : 'none',
  );
  const fwKo = typeof o.feed_warning_ko === 'string' ? o.feed_warning_ko.trim() : '';
  const fwTh = typeof o.feed_warning_th === 'string' ? o.feed_warning_th.trim() : '';
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
    ko_insight_impact: koInsight,
    ko_countermeasure: koCm,
    th_insight_impact: thInsight,
    th_countermeasure: thCm,
    incident_attention,
    feed_warning_ko: fwKo,
    feed_warning_th: fwTh,
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
    ko_insight_impact:
      '원문만으로는 영향 범위를 단정할 수 없어요. 승인 전에 출처를 열어 팩트·날짜를 꼭 대조해 주세요.',
    ko_countermeasure: defaultNewsKoCountermeasure(),
    th_insight_impact:
      'จากข้อความต้นฉบับเพียงอย่างเดียวยังสรุปผลกระทบไม่ได้ — โปรดตรวจสอบแหล่งที่มาและวันที่ก่อนเผยแพร่',
    th_countermeasure: defaultNewsThCountermeasure(),
    incident_attention: 'none',
    feed_warning_ko: '',
    feed_warning_th: '',
  };
}

/** 뉴스 크론 가공 톤 — 사건에서 배우는 대비책 + 적당한 위트 + 냉철한 중립 */
const BILINGUAL_SYSTEM_PROMPT = [
  'ROLE: You are NOT a generic chatbot here — you write as the **human operator / lead editor** of 「태국에, 살자」(Thai Ja World). Stay in character as that one witty-but-grounded Korea–Thailand expat desk voice.',
  'PERSONA ANCHOR: You MUST write as a **태국에서 20년째 살아온 베테랑 교민** — 비자·세무·교통·치안·소비자 분쟁까지 “현장에서 굴러먹은” 경험을 바탕으로 말한다. (환각 금지: 원문에 없는 사실·번호·기관명을 지어내지 말 것.)',
  'PERSONA: **태국 현지 사정에 밝은 위트 있는 한국인 운영자** — 말투는 적당히 위트 있되 냉철한 중립. 기계 번역·나열 체가 아니라 "이런 일이 있으니 이렇게 하세요"라고 짚어 주는 **전문가 한마디** 톤. never flippant, never a clown, never cruel.',
  'CONTINUITY: Day or night, breaking or slow news — you are the **same** single operator voice for this site. No "as an AI", no shifting personality between articles.',
  'MISSION: Do NOT "copy the wire" or plain-translate. Learn from the incident: what happened → what it implies for readers → what they should do next. Trust beats hype.',
  'TONE: dry warmth, one beat of wit per paragraph max; no meme spam, no victim mockery, no fake urgency. Never read like a bland press release.',
  '',
  '=== title_kr / title_th (한 줄 기사) ===',
  '- One line each. Not a dry fact label: a punchy "한 줄 기사" that hooks curiosity while staying 100% inside supplied facts.',
  '- Example SHAPE only (do not copy words unless facts match): dull "방콕 교통 체증 심화" → brighter "오늘 방콕 도로는 거대한 주차장 — 차 안에서 태국어 복습 각?"',
  '- Accident/crime/incident: still witty but never mock victims; use honest stakes + hedging when facts are thin.',
  '',
  '=== content_kr / content_th (본문 레이아웃) ===',
  '- Plain text, newlines OK; label lines are literal (UI may render bold for lines starting with **).',
  '- Line 1 EXACTLY: **[🔥 핵심 한 줄 요약]** (Korean) / **[🔥 สรุปเด็ดหนึ่งบรรทัด]** (Thai).',
  '- Line 2: one killer sentence (3-second read). Blank line. Then bullets "- " or "• " for facts + "what it means for 우리/ชาวต่างชาติที่อยู่ไทย". Blank line. 1~2 lines neutral wit closer.',
  '- Final sentence of each content_kr/content_th MUST end with a field-operator style one-liner (human warmth + practical caution), e.g., "방콕 도로 오늘도 만만치 않네요. 우회로 먼저 확인하세요."',
  '- Then a blank line, then a line EXACTLY: **[운영자의 대비책]** (Korean) / **[แผนรับมือจากทีม 운영]** (Thai), then 2~4 short lines: concrete "오늘/이번 주" 행동 지침 (must echo themes later expanded in *_countermeasure; no invented hotlines).',
  '',
  '=== ko_insight_impact / th_insight_impact ===',
  '- 2~4 sentences: cold-clear analysis of how this affects people in Thailand (교민·거주·단기 체류). One dry wit line allowed if it serves clarity. No new facts; hedge when uncertain.',
  '',
  '=== ko_countermeasure / th_countermeasure ===',
  '- Full "[운영자의 대비책]" body: 3~6 imperative lines OR numbered steps — same personality as above, expanded checklist (apps, routes, documents, official channels).',
  '- Practical only — no invented hotlines. If unsure, say "공식·대사관에서 확인" / Thai equivalent.',
  '',
  '=== incident_attention (string enum) ===',
  '- Exactly one of: none | elevated | high.',
  '- high: imminent safety risk to many residents (severe weather, major transport shutdown, violent unrest, mass casualty).',
  '- elevated: notable disruption or elevated caution (traffic chaos, scams wave, health advisory).',
  '- none: default for soft news.',
  '',
  '=== feed_warning_ko / feed_warning_th ===',
  '- One short line each (max ~42 chars). Empty string "" if incident_attention is none.',
  '- If elevated/high: urgent but calm micro-warning (e.g. "🚨 출근 전 우회로·MRT 확인"). No ALL-CAPS panic.',
  '',
  '=== ko_blurb, ko_editor_note, th_blurb, th_editor_note ===',
  '- ko_blurb / th_blurb: feed-card hook (group-chat preview). No false claims.',
  '- *_editor_note: 1~3 sentences; extra wit or angle. Do NOT repeat facts from content_* or insight/countermeasure blocks.',
  '',
  '=== seo_keywords ===',
  '- One string: exactly five comma-separated phrases (no numbering, no inner quotes).',
  '',
  '=== SAFETY ===',
  '- ONLY supplied title/body/source_url. No hallucinated names, numbers, charges, verdicts.',
  '- No hate, harassment, political rallying, or sensationalism beyond facts.',
  '',
  '=== [Language Filter] (mandatory) ===',
  '- Korean-facing fields (title_kr, content_kr, ko_blurb, ko_editor_note, ko_insight_impact, ko_countermeasure, feed_warning_ko, seo_keywords) must stay **Korean-first**: do NOT paste Thai script (ก–ฮ range) into those fields except unavoidable proper nouns ≤12 chars total per field.',
  '- Do NOT paste long English sentences into Korean fields (Latin words as proper nouns only; no English paragraphs).',
  '- Do NOT repeat the same Korean clause/sentence 3+ times across Korean fields — vary wording.',
  '- ko_countermeasure MUST read like a **태국 20년 차 베테랑 교민** checklist: dry wit allowed, but include concrete imperatives (routes, apps, documents, official channels). If you cannot, stop and output only `[QUALITY FAILED]: countermeasure_weak` (no JSON).',
  '- If you detect your own draft violates the filter, stop and output only `[QUALITY FAILED]: language_mix` or `[QUALITY FAILED]: repetition` (no JSON).',
  '',
  'Output valid JSON only. Exactly these 16 keys (all strings except values noted):',
  'title_kr, content_kr, ko_blurb, ko_editor_note, ko_insight_impact, ko_countermeasure, feed_warning_ko,',
  'title_th, content_th, th_blurb, th_editor_note, th_insight_impact, th_countermeasure, feed_warning_th,',
  'incident_attention (none|elevated|high), seo_keywords.',
].join('\n');

function buildBilingualUserBlock(title: string, body: string | null, sourceUrl: string): string {
  const sanitizedTitle = sanitizeAiKoreanPhrases(title);
  const sanitizedBody = sanitizeAiKoreanPhrases(body);
  return [
    `원문 제목: ${sanitizedTitle || title}`,
    `원문 본문(없으면 빈 값): ${sanitizedBody?.trim() || '(없음)'}`,
    `출처 URL: ${sourceUrl}`,
    '',
    '아래는 태국·동남아와 관련된 원문입니다. 단순 번역·나열 금지 — 「태국에, 살자」의 **적당히 위트 있고 냉철한 중립 전문가** 톤으로 재구성하라.',
    '사건·사고는 가볍게 흘리지 말고, 독자가 **무엇을 배우고 무엇을 하면 되는지**가 남도록 써라. 위트는 문장당 한 번 이하, 피해자 조롱·선정 과장 금지.',
    '제목(title_kr/title_th)은 원제를 그대로 옮기지 말고, 팩트 안에서 호기심을 여는 **한 줄 위트 제목**으로 다시 짓는다.',
    '본문(content_kr/content_th) 요약 끝에는 반드시 **[운영자의 대비책]** / Thai **[แผนรับมือจากทีม 운영]** 헤더 줄을 넣고, ko_countermeasure·th_countermeasure에 담을 실행 지침을 한 번 더 압축해 적는다.',
    '원문 언어와 관계없이 시스템이 요구한 16개 키를 모두 채우세요. title_kr/title_th에는 "메타데이터" 같은 내부 용어를 넣지 마세요.',
    '**절대 금지:** "내용 준비 중", "가공 전", "TBD", "placeholder", 빈 문장, 원문만 복붙 수준의 title_kr·ko_blurb·ko_insight_impact·ko_countermeasure.',
    '반드시 아래 키만 가진 JSON 객체 한 개만 출력하세요 (다른 텍스트 금지):',
    '{"title_kr":"","content_kr":"","ko_blurb":"","ko_editor_note":"","ko_insight_impact":"","ko_countermeasure":"","feed_warning_ko":"","title_th":"","content_th":"","th_blurb":"","th_editor_note":"","th_insight_impact":"","th_countermeasure":"","feed_warning_th":"","incident_attention":"none","seo_keywords":""}',
    '- title_kr / title_th: 사실 안에서 도는 ‘한 줄 기사’ 톤. 지루한 헤드라인 금지.',
    '- ko_insight_impact / th_insight_impact: 우리 독자에게 어떤 영향인지.',
    '- ko_countermeasure / th_countermeasure: 오늘 할 일·우회·확인처 등 실행 지침.',
    '- incident_attention + feed_warning_*: 사건·재난·대혼잡 등이면 elevated/high 와 짧은 경고 문구, 아니면 none + 빈 문자열.',
    '- seo_keywords: 키워드 5개, 쉼표로만 구분.',
  ].join('\n');
}

function buildPersistedCleanBodyJson(sanitized: LlmBilingualPayload, url: string): string {
  const ai_signals: Record<string, string> = {
    incident_attention: sanitized.incident_attention,
  };
  if (sanitized.feed_warning_ko.trim()) ai_signals.feed_warning_ko = sanitized.feed_warning_ko.trim();
  if (sanitized.feed_warning_th.trim()) ai_signals.feed_warning_th = sanitized.feed_warning_th.trim();

  return JSON.stringify({
    ko: {
      title: sanitized.title_kr,
      summary: sanitized.content_kr,
      blurb: sanitized.ko_blurb,
      ...(sanitized.ko_editor_note ? { editor_note: sanitized.ko_editor_note } : {}),
      ...(sanitized.ko_insight_impact.trim()
        ? { insight_impact: sanitized.ko_insight_impact.trim() }
        : {}),
      ...(sanitized.ko_countermeasure.trim()
        ? { countermeasure: sanitized.ko_countermeasure.trim() }
        : {}),
    },
    th: {
      title: sanitized.title_th,
      summary: sanitized.content_th,
      blurb: sanitized.th_blurb,
      ...(sanitized.th_editor_note ? { editor_note: sanitized.th_editor_note } : {}),
      ...(sanitized.th_insight_impact.trim()
        ? { insight_impact: sanitized.th_insight_impact.trim() }
        : {}),
      ...(sanitized.th_countermeasure.trim()
        ? { countermeasure: sanitized.th_countermeasure.trim() }
        : {}),
    },
    source_url: url,
    ai_signals,
  });
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

export function stripMarkdownJsonFence(content: string): string {
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

function llmCompletionMaxAttempts(): number {
  const legacy = process.env.NEWS_LLM_FETCH_RETRIES?.trim();
  const nLegacy = legacy ? Number(legacy) : NaN;
  if (Number.isFinite(nLegacy) && nLegacy >= 1) return Math.min(12, Math.floor(nLegacy));
  const raw = process.env.NEWS_LLM_MAX_ATTEMPTS?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 1) return Math.min(12, Math.floor(n));
  return 5;
}

function parseRetryAfterMs(headerVal: string | null): number | null {
  if (!headerVal?.trim()) return null;
  const s = headerVal.trim();
  const sec = Number(s);
  if (Number.isFinite(sec) && sec >= 0) return Math.min(120_000, Math.floor(sec * 1000));
  const d = Date.parse(s);
  if (!Number.isNaN(d)) {
    const delta = d - Date.now();
    return delta > 0 ? Math.min(120_000, delta) : null;
  }
  return null;
}

function computeLlmBackoffMs(attemptIndex: number, retryAfterMs: number | null): number {
  const cap = 90_000;
  const fromHeader = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : 0;
  const exp = Math.floor(1000 * 2 ** (attemptIndex - 1));
  const jitter = Math.floor(Math.random() * 400);
  return Math.min(cap, Math.max(fromHeader, exp + jitter));
}

function isRetriableLlmHttpStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 502 || status === 500;
}

function newsLlmInterArticleDelayMs(): number {
  const raw = process.env.NEWS_LLM_INTER_ARTICLE_DELAY_MS?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 0) return Math.min(60_000, Math.floor(n));
  return 400;
}

async function sleepBetweenNewsLlmCalls(): Promise<void> {
  const ms = newsLlmInterArticleDelayMs();
  if (ms > 0) await sleepMs(ms);
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
  /** 단일 키(로컬 등). apiKeyCandidates 와 동시에 주면 candidates 우선 */
  apiKey?: string | undefined;
  /** 여러 키 — 재시도·순환 시 다음 키 사용 (429·할당량 분산) */
  apiKeyCandidates?: string[];
  messages: Array<{ role: string; content: string }>;
  jsonObjectMode: boolean;
  /** 기본 2800. 편집실 백필 등 짧은 응답은 900 정도로 낮춤 */
  maxTokens?: number;
}): Promise<string> {
  const url = chatCompletionsUrlFromBase(params.baseUrl);
  const keyPool =
    params.apiKeyCandidates && params.apiKeyCandidates.length > 0
      ? params.apiKeyCandidates.map((k) => k.trim()).filter(Boolean)
      : params.apiKey?.trim()
        ? [params.apiKey.trim()]
        : [];

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
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
  const maxAttempts = llmCompletionMaxAttempts();

  let keyCursor = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const keyForAttempt =
      keyPool.length > 0 ? keyPool[keyCursor % keyPool.length] : undefined;
    if (keyForAttempt) {
      headers.Authorization = `Bearer ${keyForAttempt}`;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('aborted')) {
        throw new Error(`${timeoutMs}ms 후 LLM 요청 타임아웃 (${host})`);
      }
      const chain = errorChainMessage(e);
      if (attempt >= maxAttempts) {
        throw new Error(
          `LLM fetch 실패 (${host}), ${maxAttempts}회 시도: ${chain || msg}. VPN·방화벽·프록시·DNS 확인. NEWS_LLM_FETCH_RETRIES 로 횟수 조절.`,
        );
      }
      const backoff = computeLlmBackoffMs(attempt, null);
      console.warn(
        `[NewsLLM] fetch 재시도 ${attempt + 1}/${maxAttempts} (${host}) ${backoff}ms 후(지수 백오프): ${(chain || msg).slice(0, 160)}`,
      );
      await sleepMs(backoff);
      continue;
    }

    if (res.ok) {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content?.trim()) {
        throw new Error('LLM 응답 본문이 비어 있습니다.');
      }
      return content;
    }

    const t = await res.text();
    const retryAfterMs = parseRetryAfterMs(res.headers.get('retry-after'));
    if (isRetriableLlmHttpStatus(res.status) && attempt < maxAttempts) {
      if (res.status === 429 && keyPool.length > 1) {
        keyCursor += 1;
      }
      const backoff = computeLlmBackoffMs(attempt, retryAfterMs);
      console.warn(
        `[NewsLLM] HTTP ${res.status} → ${backoff}ms 후 재시도 ${attempt + 1}/${maxAttempts} (${host}). 응답 일부: ${t.slice(0, 200)}`,
      );
      await sleepMs(backoff);
      continue;
    }
    if (res.status === 429 || res.status === 503) {
      void recordPipelineErrorEvent({
        scope: 'news.llm.http',
        reasonCode: `HTTP_${res.status}`,
        messageExcerpt: t.slice(0, 400),
        meta: { host },
      });
    }
    throw new HttpCompletionError(res.status, `LLM HTTP ${res.status}: ${t.slice(0, 400)}`);
  }

  throw new Error(`LLM fetch 실패 (${host}): 응답 없음`);
}

const THAI_SCRIPT_RE = /[\u0E00-\u0E7F]/u;
const LONG_LATIN_RUN_RE = /[A-Za-z][A-Za-z\s,.;:'"()\-]{34,}[A-Za-z]/;

function extractJsonStringField(raw: string, key: string): string | null {
  const escKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`"${escKey}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
  const m = re.exec(raw);
  if (!m?.[1]) return null;
  return m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
}

/** JSON 본문이 깨졌을 때 주요 키만 RegEx 로 뽑아 최소 스키마를 채운다. */
function tryRepairBilingualPayloadFromRawText(raw: string): Record<string, unknown> | null {
  const keys = [
    'title_kr',
    'content_kr',
    'ko_blurb',
    'ko_editor_note',
    'ko_insight_impact',
    'ko_countermeasure',
    'feed_warning_ko',
    'title_th',
    'content_th',
    'th_blurb',
    'th_editor_note',
    'th_insight_impact',
    'th_countermeasure',
    'feed_warning_th',
    'incident_attention',
    'seo_keywords',
  ] as const;
  const out: Record<string, unknown> = {};
  let any = false;
  for (const k of keys) {
    const v = extractJsonStringField(raw, k);
    if (v != null) {
      out[k] = v;
      any = true;
    }
  }
  return any ? out : null;
}

function hasThaiScriptInKoSurfaceFields(p: LlmBilingualPayload): boolean {
  const blob = [
    p.title_kr,
    p.ko_blurb,
    p.ko_editor_note,
    p.ko_insight_impact,
    p.ko_countermeasure,
    p.feed_warning_ko,
    Array.isArray(p.seo_keywords) ? p.seo_keywords.join(',') : '',
  ].join('\n');
  return THAI_SCRIPT_RE.test(blob);
}

function hasSuspiciousLatinRunInKoFields(p: LlmBilingualPayload): boolean {
  const blob = [p.title_kr, p.ko_blurb, p.ko_insight_impact, p.ko_countermeasure, p.ko_editor_note].join('\n');
  return LONG_LATIN_RUN_RE.test(blob);
}

function hasExcessiveKoreanRepetition(p: LlmBilingualPayload): boolean {
  const blob = [p.title_kr, p.ko_blurb, p.ko_insight_impact, p.ko_countermeasure, p.ko_editor_note, p.content_kr]
    .join('\n')
    .replace(/\s+/gu, ' ')
    .trim();
  const chunks = blob.split(/(?<=[.!?。])\s+|[\n\r]+/u).map((s) => s.trim()).filter((s) => s.length >= 14);
  const counts = new Map<string, number>();
  for (const c of chunks) {
    const k = c.slice(0, 80);
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if ((counts.get(k) ?? 0) >= 3) return true;
  }
  return false;
}

function isWeakKoCountermeasure(cm: string): boolean {
  const t = cm.trim();
  if (t.length < 52) return true;
  if (!/[-•·]|\d+\./u.test(t)) return true;
  return false;
}

/** LLM 출력이 [Language Filter] 를 위반하면 throw → 상위에서 JSON 재시도 */
function assertBilingualKoQualityGate(p: LlmBilingualPayload): void {
  const head = (p.title_kr ?? '').trim();
  if (/^\[QUALITY FAILED\]/u.test(head)) {
    throw new Error(head.slice(0, 120));
  }
  if (hasThaiScriptInKoSurfaceFields(p)) {
    throw new Error('[QUALITY FAILED]: language_mix (Thai script in Korean fields)');
  }
  if (hasSuspiciousLatinRunInKoFields(p)) {
    throw new Error('[QUALITY FAILED]: language_mix (long English run in Korean fields)');
  }
  if (hasExcessiveKoreanRepetition(p)) {
    throw new Error('[QUALITY FAILED]: repetition');
  }
  if (isWeakKoCountermeasure(p.ko_countermeasure ?? '')) {
    throw new Error('[QUALITY FAILED]: countermeasure_weak');
  }
}

function parseBilingualPayloadFromContent(content: string, label: string): LlmBilingualPayload {
  const raw = stripMarkdownJsonFence(content);
  const leading = raw.trim();
  if (/^\[QUALITY FAILED\]/u.test(leading) && !raw.includes('{')) {
    throw new Error(leading.slice(0, 500));
  }

  const truncateForError = (s: string) =>
    s.length > 500 ? `${s.slice(0, 500)}…(truncated)` : s;

  const repairJson = (s: string): string => {
    let out = s.trim();
    out = out.replace(/,\s*([}\]])/g, '$1');
    return out;
  };

  const mergeRepairInto = (base: unknown, repair: Record<string, unknown>): unknown => {
    if (base !== null && typeof base === 'object' && !Array.isArray(base)) {
      return { ...(base as Record<string, unknown>), ...repair };
    }
    return repair;
  };

  const tryPayloadAfterRepair = (
    baseObj: unknown,
    sourceText: string,
    logLabel: string,
  ): LlmBilingualPayload | null => {
    const first = parseLlmPayload(baseObj);
    if (first) return first;
    const rep = tryRepairBilingualPayloadFromRawText(sourceText);
    if (!rep) return null;
    const merged = mergeRepairInto(baseObj, rep);
    const second = parseLlmPayload(merged);
    if (second) {
      console.warn(`[NewsLLM] [SCHEMA REPAIRED] ${logLabel}: RegEx·부분 키 병합`);
    }
    return second ?? null;
  };

  // LLM 응답이 JSON 외 텍스트를 섞는 경우가 있어,
  // 첫 번째 JSON 객체({ ... })만 찾아서 파싱하도록 완충 처리합니다.
  try {
    const parsed = JSON.parse(raw) as unknown;
    const payload = tryPayloadAfterRepair(parsed, raw, label);
    if (!payload) {
      throw new Error(
        `${label} JSON 스키마 불일치 (title/content/blurb 필수 + 인사이트·대비책·incident_attention·seo_keywords 등 16키)`,
      );
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
      const fromRep = tryPayloadAfterRepair(null, raw, label);
      if (fromRep) return fromRep;
      throw new Error(`${label} JSON 파싱 실패: ${truncateForError(raw)}`);
    }

    const payload = tryPayloadAfterRepair(parsed, raw, label);
    if (!payload) {
      throw new Error(
        `${label} JSON 스키마 불일치 (title/content/blurb 필수 + 인사이트·대비책·incident_attention·seo_keywords 등 16키)`,
      );
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

/** 커뮤니티 인사이트 등 뉴스 외 LLM 호출에서 재사용 (OpenAI→Gemini→로컬 폴백 동일). */
export async function runNewsSummaryProviders<T>(
  messages: Array<{ role: string; content: string }>,
  parseFromContent: (content: string, label: string) => T,
  maxTokens: number,
): Promise<T> {
  loadMasterDockerEnvOnce();
  const provider = normalizeNewsSummaryProvider();
  const openaiKeys = getOpenAiApiKeyCandidates();
  const openaiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const geminiKeys = getGeminiApiKeyCandidates();
  const geminiBase =
    process.env.GEMINI_OPENAI_BASE_URL?.trim() ||
    'https://generativelanguage.googleapis.com/v1beta/openai';
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
  const groqKeys = getGroqApiKeyCandidates();
  const groqModel = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';
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
    if (!openaiKeys.length) {
      throw new Error('OPENAI_API_KEY(또는 OPENAI_API_KEYS) 가 설정되지 않았습니다.');
    }
    const content = await callOpenAiCompatibleChatCompletion({
      baseUrl: 'https://api.openai.com/v1',
      model: openaiModel,
      apiKeyCandidates: openaiKeys,
      messages,
      jsonObjectMode: true,
      maxTokens,
    });
    return parseFromContent(content, 'OpenAI');
  };

  const runGemini = async () => {
    if (!geminiKeys.length) {
      throw new Error('GEMINI_API_KEY(또는 GEMINI_API_KEYS) 가 설정되지 않았습니다.');
    }
    const content = await callOpenAiCompatibleChatCompletion({
      baseUrl: geminiBase,
      model: geminiModel,
      apiKeyCandidates: geminiKeys,
      messages,
      jsonObjectMode: false,
      maxTokens,
    });
    return parseFromContent(content, 'Gemini');
  };

  const runGroq = async () => {
    if (!groqKeys.length) {
      throw new Error('GROQ_API_KEY(또는 GROQ_API_KEYS) 가 설정되지 않았습니다.');
    }
    const content = await callOpenAiCompatibleChatCompletion({
      baseUrl: 'https://api.groq.com/openai/v1',
      model: groqModel,
      apiKeyCandidates: groqKeys,
      messages,
      jsonObjectMode: true,
      maxTokens,
    });
    return parseFromContent(content, 'Groq');
  };

  const recoverAfterGeminiFails = async (): Promise<T> => {
    if (groqKeys.length > 0) {
      try {
        console.warn('[NewsSummary] Gemini 경로 실패 → Groq 폴백 시도');
        return await runGroq();
      } catch (eG) {
        if (shouldFallbackToAlternateLlm(eG) && localBase) {
          console.warn(
            '[NewsSummary] Groq 실패 → 로컬 LLM 폴백:',
            eG instanceof Error ? eG.message.slice(0, 220) : String(eG),
          );
          return runLocal();
        }
        throw eG;
      }
    }
    if (localBase) {
      console.warn('[NewsSummary] Gemini 실패 → 로컬 LLM (Groq 미설정)');
      return runLocal();
    }
    throw new Error(
      'Gemini 할당량 한도 — GROQ_API_KEY 또는 프로덕션에서 접근 가능한 LOCAL_LLM_BASE_URL 을 추가하면 폴백됩니다.',
    );
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

  if (provider === 'auto' && shouldTryLocalLlmFirstInAuto(localBase)) {
    try {
      return await runLocal();
    } catch (e) {
      console.warn(
        '[NewsSummary] Ollama(로컬) 선행 실패 — 클라우드 폴백:',
        e instanceof Error ? e.message.slice(0, 220) : String(e),
      );
    }
  }

  if (openaiKeys.length > 0) {
    try {
      return await runOpenAi();
    } catch (e) {
      if (shouldFallbackToAlternateLlm(e)) {
        if (geminiKeys.length > 0) {
          try {
            console.warn(
              '[NewsSummary] OpenAI 실패 → Gemini 폴백:',
              e instanceof Error ? e.message.slice(0, 220) : String(e),
            );
            return await runGemini();
          } catch (e2) {
            if (!shouldFallbackToAlternateLlm(e2)) throw e2;
            console.warn(
              '[NewsSummary] Gemini 실패 후 Groq·로컬 순으로 복구:',
              e2 instanceof Error ? e2.message.slice(0, 220) : String(e2),
            );
            return recoverAfterGeminiFails();
          }
        }
        if (groqKeys.length > 0) {
          try {
            console.warn(
              '[NewsSummary] OpenAI 실패 → Groq 폴백:',
              e instanceof Error ? e.message.slice(0, 220) : String(e),
            );
            return await runGroq();
          } catch (eG) {
            if (shouldFallbackToAlternateLlm(eG) && localBase) {
              console.warn(
                '[NewsSummary] Groq 실패 → 로컬 LLM:',
                eG instanceof Error ? eG.message.slice(0, 220) : String(eG),
              );
              return runLocal();
            }
            throw eG;
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
          `OpenAI 연결 실패: ${errorChainMessage(e).slice(0, 280)}. GEMINI_API_KEY·GROQ_API_KEY·LOCAL_LLM(배포망 접근 가능) 중 폴백을 구성하세요.`,
        );
      }
      throw e;
    }
  }

  if (geminiKeys.length > 0) {
    try {
      return await runGemini();
    } catch (e) {
      if (!shouldFallbackToAlternateLlm(e)) throw e;
      console.warn(
        '[NewsSummary] Gemini 단독 경로 실패 → Groq·로컬:',
        e instanceof Error ? e.message.slice(0, 220) : String(e),
      );
      return recoverAfterGeminiFails();
    }
  }

  if (groqKeys.length > 0) {
    return runGroq();
  }

  if (localBase) {
    return runLocal();
  }

  throw new Error(
    'NEWS_SUMMARY_PROVIDER=auto 일 때 OPENAI_API_KEY, GEMINI_API_KEY, GROQ_API_KEY, LOCAL_LLM_BASE_URL 중 하나 이상이 필요합니다.',
  );
}

/** NEWS_LLM_JSON_RETRIES: 한국어 JSON 품질 재생성 상한 — 기본 6, env 로 1~12 조절(운영 튜닝) */
function newsLlmJsonQualityMaxAttempts(): number {
  const raw = process.env.NEWS_LLM_JSON_RETRIES?.trim();
  if (!raw) return 6;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return 6;
  return Math.min(12, Math.max(1, n));
}

const NEWS_KO_PLACEHOLDER_PHRASE_RE =
  /내용\s*준비|준비\s*중\s*입니다|가공\s*전|가공전|placeholder|TBD|작성\s*예정|추후\s*공개|coming\s*soon|\(제목\s*없음\)|여기에\s*입력|메타데이터|원문만으로는|LLM\s*없음/i;

function newsBilingualPayloadNeedsJsonRetry(sanitized: LlmBilingualPayload): boolean {
  const titleKr = (sanitized.title_kr ?? '').trim();
  const blurb = (sanitized.ko_blurb ?? '').trim();
  const insight = (sanitized.ko_insight_impact ?? '').trim();
  const counter = (sanitized.ko_countermeasure ?? '').trim();
  const parts = [titleKr, blurb, insight, counter];
  if (parts.some((t) => !t || t.length < 4)) return true;
  if (insight.length < 24) return true;
  if (counter.length < 40) return true;
  if (parts.some((t) => NEWS_KO_PLACEHOLDER_PHRASE_RE.test(t))) return true;
  return false;
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
  const maxJson = newsLlmJsonQualityMaxAttempts();
  for (let attempt = 1; attempt <= maxJson; attempt++) {
    let llm: LlmBilingualPayload;
    try {
      llm = await runNewsSummaryProviders(messages, parseBilingualPayloadFromContent, 3800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt >= maxJson) throw e;
      console.warn(`[NewsLLM] JSON/LLM 예외 → ${attempt + 1}/${maxJson} 재시도: ${msg.slice(0, 220)}`);
      await sleepMs(350 * attempt);
      continue;
    }
    const sanitized = sanitizeNewsPayloadTone(enforceNewsBilingualCountermeasureSections(llm));
    try {
      assertBilingualKoQualityGate(sanitized);
    } catch (qe) {
      const qmsg = qe instanceof Error ? qe.message : String(qe);
      if (attempt >= maxJson) throw qe;
      console.warn(
        `[NewsLLM] [Language Filter] 품질 게이트 → ${attempt + 1}/${maxJson} 재시도: ${qmsg.slice(0, 220)}`,
      );
      await sleepMs(400 * attempt);
      continue;
    }
    if (!newsBilingualPayloadNeedsJsonRetry(sanitized)) {
      if (attempt > 1) {
        console.warn(
          `[NewsLLM] title_kr·ko_blurb·ko_insight_impact·ko_countermeasure 품질 검사 통과 (${attempt}/${maxJson})`,
        );
      }
      return sanitized;
    }
    console.warn(
      `[NewsLLM] 한국어 품질/placeholder 감지 → JSON 재생성 ${attempt}/${maxJson} (title_kr·ko_blurb·ko_insight_impact·ko_countermeasure)`,
    );
    await sleepMs(400 * attempt);
  }
  throw new Error(
    `[NewsLLM] 이중언어 JSON 품질 재시도 ${maxJson}회 초과: title_kr·ko_blurb·ko_insight_impact·ko_countermeasure`,
  );
}

/** 관리자 한국어 전용 가공 — 크론 이중언어 파이프라인과 별도 */
const KOREAN_ONLY_SYSTEM_PROMPT = [
  'You are NOT a generic AI assistant in this task — you are the **on-the-ground operator / lead editor** of 「태국에, 살자」(Living in Thai) Korean news desk. Persona: **태국 현지 사정에 밝은 위트 있는 한국인 운영자** (적당히 위트 있되 냉철한 중립; 기계 번역 톤 금지).',
  'CONTINUITY: You are the **same** 「태국에, 살자」 한국 데스크 목소리 24시간 내내 — 기사마다 다른 캐릭터처럼 말하지 말 것.',
  'The source may be Thai, English, or any language. Output MUST be 100% Korean Hangul only in every Korean-payload field below (no Thai script, no English sentences in Korean fields).',
  'If a proper noun must stay in Latin (e.g. BTS, UNESCO), keep it short.',
  'Output valid JSON only with exactly these keys: title_kr, content_kr, ko_blurb, ko_editor_note, ko_insight_impact, ko_countermeasure, feed_warning_ko, incident_attention, seo_keywords.',
  '',
  '=== Structure (plain text, newlines allowed) ===',
  '- title_kr: one line — not the wire-service original title; a curiosity-hooking **한 줄 위트 제목** built only from supplied facts.',
  '- content_kr: Line 1 = **[🔥 핵심 한 줄 요약]** then killer sentence, blank line, bullets for facts + "what it means for 우리", blank line, short neutral wit. Then blank line + line exactly **[운영자의 대비책]** + 2~4 short action lines (preview of countermeasure).',
  '- The final line of content_kr must be a warm, witty operator one-liner that sounds like an on-site Thailand expert.',
  '- ko_blurb: ultra-short feed hook (40~100 chars).',
  '- ko_editor_note: 1~3 sentences; one dry wit beat max. Do NOT repeat facts from content_kr.',
  '- ko_insight_impact: 2~4 sentences — cold-clear analysis of impact on people in Thailand; this persona\'s voice.',
  '- ko_countermeasure: full **[운영자의 대비책]** body in JSON field — numbered or bullet imperative steps readers take today/this week (no invented hotlines).',
  '- feed_warning_ko: one very short warning line, or "" if incident_attention is none.',
  '- incident_attention: exactly one of none | elevated | high.',
  '- seo_keywords: one string — five comma-separated Korean phrases.',
  '',
  '=== Safety ===',
  '- Use ONLY supplied title/body/source_url. Hedge when uncertain.',
  'Output one JSON object only.',
].join('\n');

function buildKoreanOnlyUserBlock(title: string, body: string | null, sourceUrl: string): string {
  const sanitizedTitle = sanitizeAiKoreanPhrases(title);
  const sanitizedBody = sanitizeAiKoreanPhrases(body);
  return [
    `원문 제목: ${sanitizedTitle || title}`,
    `원문 본문(없으면 빈 값): ${sanitizedBody?.trim() || '(없음)'}`,
    `출처 URL: ${sourceUrl}`,
    '',
    '위 원문에서 사실만 추출해 한국어 독자용 기사로 재작성하라. JSON 스키마는 시스템 지시를 따른다.',
  ].join('\n');
}

function parseKoreanOnlyLlmPayload(raw: unknown): LlmBilingualPayload | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const titleKr = isNonEmptyString(o.title_kr) ? o.title_kr.trim() : null;
  const contentKr = isNonEmptyString(o.content_kr) ? o.content_kr.trim() : null;
  if (!titleKr || !contentKr || !isNonEmptyString(o.ko_blurb)) return null;
  const clamp = (s: string, max: number) => {
    const t = s.trim();
    return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t;
  };
  const editorClamp = 300;
  const koEd = isNonEmptyString(o.ko_editor_note) ? clamp(String(o.ko_editor_note), editorClamp) : '';
  const seo_keywords = parseSeoKeywordsField(o.seo_keywords);
  const seo = seo_keywords.length > 0 ? seo_keywords : stubSeoKeywordsFromTitle(titleKr);
  const ko_blurb = clamp(String(o.ko_blurb), 160);
  const thEd = koEd || ko_blurb;
  const koInsight = isNonEmptyString(o.ko_insight_impact) ? String(o.ko_insight_impact).trim() : '';
  const koCm = isNonEmptyString(o.ko_countermeasure) ? String(o.ko_countermeasure).trim() : '';
  const fwKo = typeof o.feed_warning_ko === 'string' ? o.feed_warning_ko.trim() : '';
  const incident_attention = normalizeIncidentAttention(
    typeof o.incident_attention === 'string' ? o.incident_attention : 'none',
  );
  return {
    title_kr: titleKr,
    content_kr: contentKr,
    ko_blurb,
    ko_editor_note: koEd,
    title_th: titleKr,
    content_th: contentKr,
    th_blurb: ko_blurb,
    th_editor_note: thEd,
    seo_keywords: seo,
    ko_insight_impact: koInsight,
    ko_countermeasure: koCm,
    th_insight_impact: koInsight,
    th_countermeasure: koCm,
    incident_attention,
    feed_warning_ko: fwKo,
    feed_warning_th: fwKo,
  };
}

function parseKoreanOnlyPayloadFromContent(content: string, label: string): LlmBilingualPayload {
  const raw = stripMarkdownJsonFence(content);
  const truncateForError = (s: string) => (s.length > 500 ? `${s.slice(0, 500)}…(truncated)` : s);
  const repairJson = (s: string): string => s.trim().replace(/,\s*([}\]])/g, '$1');

  try {
    const parsed = JSON.parse(raw) as unknown;
    const payload = parseKoreanOnlyLlmPayload(parsed);
    if (!payload) {
      throw new Error(`${label} JSON 스키마 불일치 (한국어 전용 title_kr·content_kr·ko_blurb 필수)`);
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
    const payload = parseKoreanOnlyLlmPayload(parsed);
    if (!payload) {
      throw new Error(`${label} JSON 스키마 불일치 (한국어 전용 필드)`);
    }
    return payload;
  }
}

async function callKoreanOnlySummary(
  title: string,
  body: string | null,
  sourceUrl: string,
): Promise<LlmBilingualPayload> {
  const userBlock = buildKoreanOnlyUserBlock(title, body, sourceUrl);
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: KOREAN_ONLY_SYSTEM_PROMPT },
    { role: 'user', content: userBlock },
  ];
  return runNewsSummaryProviders(messages, parseKoreanOnlyPayloadFromContent, 3600);
}

const EDITOR_NOTES_ONLY_SYSTEM_PROMPT = [
  'You are the same cynical-but-funny 「태국에, 살자」 **human operator / desk editor** (교민 커뮤니티 편집장 voice — not a generic bot). Output valid JSON only: keys ko_editor_note and th_editor_note (strings only).',
  '- Do NOT repeat or summarize article facts again. No new factual claims.',
  '- ko_editor_note: natural Korean — dry wit, 뼈있는 한마디, expat-in-Thailand banter allowed.',
  '- th_editor_note: natural Thai with the same emotional vibe (not a literal translation of the Korean).',
  '- 1~3 short sentences. Situation-matched punch; no forced jokes.',
  '- Invite a reaction lightly; no signup/subscribe/click-begging, no ads, no political rallying.',
].join('\n');

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
  const sanitized = sanitizeNewsPayloadTone(enforceNewsBilingualCountermeasureSections(llm));
  const cleanBody = buildPersistedCleanBodyJson(sanitized, url);

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

  if (publishedFlag) {
    void requestGoogleIndexing(absoluteUrl(`/news/${pid}`));
  }

  return { raw_news_id: row.id, ok: true };
}

export type UpdateBilingualProcessedNewsOptions = {
  /** 넣으면 `published` 를 함께 갱신 (관리자 한국어 재가공 시 false 로 승인 대기 고정) */
  publishedPatch?: boolean;
  /**
   * true: `tips_articles` 동기화 생략 — 인사이트 엔진 일괄 재가공 시 기존 꿀팁 초안/게시 상태를 덮어쓰지 않음.
   */
  skipTipsArticles?: boolean;
};

/**
 * 기존 `processed_news` 행에 이중 요약을 다시 써 넣습니다(id·발행 상태 유지).
 */
async function updateBilingualProcessedNews(
  client: ReturnType<typeof getServerSupabaseClient>,
  processedNewsId: string,
  row: RawNewsTodoRow,
  llm: LlmBilingualPayload,
  options?: UpdateBilingualProcessedNewsOptions,
): Promise<SummarizeRowResult> {
  const url = row.external_url ?? '';
  const sanitized = sanitizeNewsPayloadTone(enforceNewsBilingualCountermeasureSections(llm));
  const cleanBody = buildPersistedCleanBodyJson(sanitized, url);
  const publishedPatch = options?.publishedPatch;
  const skipTipsArticles = options?.skipTipsArticles === true;

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
      ...(publishedPatch !== undefined ? { published: publishedPatch } : {}),
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

  if (!skipTipsArticles) {
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
  }

  return { raw_news_id: row.id, ok: true };
}

/** 인사이트 엔진(16키·ko/th insight·ai_signals) 기준으로 재가공이 필요한지 */
export function needsInsightEngineRetrofit(cleanBody: string | null | undefined): boolean {
  if (!cleanBody?.trim()) return true;
  try {
    const o = JSON.parse(cleanBody) as {
      ko?: { insight_impact?: string; countermeasure?: string };
      th?: { insight_impact?: string; countermeasure?: string };
      ai_signals?: { incident_attention?: string };
    };
    const minKo = 6;
    const minTh = 4;
    const koI = o.ko?.insight_impact?.trim() ?? '';
    const koC = o.ko?.countermeasure?.trim() ?? '';
    const thI = o.th?.insight_impact?.trim() ?? '';
    const thC = o.th?.countermeasure?.trim() ?? '';
    const att = (o.ai_signals?.incident_attention ?? '').trim().toLowerCase();
    if (koI.length < minKo || koC.length < minKo || thI.length < minTh || thC.length < minTh) return true;
    if (att !== 'none' && att !== 'elevated' && att !== 'high') return true;
    return false;
  } catch {
    return true;
  }
}

export type RetrofitInsightEngineBatchResult = {
  llmConfigured: boolean;
  scanned: number;
  eligible: number;
  ok: number;
  failed: { id: string; error: string }[];
};

/**
 * DB에 쌓인 `processed_news`를 `raw_news` 원문으로 다시 이중언어 LLM 가공(인사이트·대비책·ai_signals 포함).
 * - 행 단위: LLM 성공 시에만 DB 갱신 → 실패 시 기존 clean_body 유지.
 * - `skipTipsArticles`: 기본 true — `tips_articles` 게시/초안 상태를 뉴스 재가공으로 덮어쓰지 않음.
 */
function newsInsightRetrofitMaxCap(): number {
  const raw = process.env.NEWS_INSIGHT_RETROFIT_MAX_BATCH?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 1) return Math.min(25, Math.floor(n));
  return 12;
}

function newsSummarizeMaxBatchCap(): number {
  const raw = process.env.NEWS_SUMMARIZE_MAX_BATCH?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 1) return Math.min(30, Math.floor(n));
  return 12;
}

function forceTranslateMaxCap(): number {
  const raw = process.env.NEWS_FORCE_TRANSLATE_MAX_BATCH?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 1) return Math.min(80, Math.floor(n));
  return 32;
}

export async function retrofitInsightEngineProcessedNewsBatch(params: {
  limit: number;
  onlyMissing: boolean;
  skipTipsArticles?: boolean;
}): Promise<RetrofitInsightEngineBatchResult> {
  if (!isNewsSummaryLlmConfigured()) {
    return { llmConfigured: false, scanned: 0, eligible: 0, ok: 0, failed: [] };
  }
  const limit = Math.min(Math.max(Math.floor(params.limit), 1), newsInsightRetrofitMaxCap());
  const onlyMissing = params.onlyMissing !== false;
  const skipTipsArticles = params.skipTipsArticles !== false;

  const client = getServerSupabaseClient();
  const { data: rows, error } = await client
    .from('processed_news')
    .select('id, clean_body, language, raw_news_id, summaries(summary_text, model)')
    .order('created_at', { ascending: false })
    .limit(1200);

  if (error) {
    return {
      llmConfigured: true,
      scanned: 0,
      eligible: 0,
      ok: 0,
      failed: [{ id: '-', error: error.message }],
    };
  }

  const scanned = rows?.length ?? 0;
  const candidates = (rows ?? []).filter((r) => {
    const sums = r.summaries as { summary_text: string; model: string | null }[] | null;
    if (
      !passesKoPublicGate(
        r.language as string | null,
        (r.clean_body as string | null) ?? null,
        sums,
      )
    ) {
      return false;
    }
    if (onlyMissing && !needsInsightEngineRetrofit(r.clean_body as string | null)) return false;
    return Boolean(r.raw_news_id);
  });

  const slice = candidates.slice(0, limit);
  const eligible = slice.length;
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
      await sleepBetweenNewsLlmCalls();
      continue;
    }
    const ur = await updateBilingualProcessedNews(client, pid, rowTodo, llm, {
      skipTipsArticles,
    });
    if (ur.ok) ok += 1;
    else failed.push({ id: pid, error: ur.error ?? '갱신 실패' });
    await sleepBetweenNewsLlmCalls();
  }

  return { llmConfigured: true, scanned, eligible, ok, failed };
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
  const cap = Math.min(Math.max(maxRows, 1), forceTranslateMaxCap());

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
      await sleepBetweenNewsLlmCalls();
      continue;
    }

    const ur = await updateBilingualProcessedNews(client, pid, rowTodo, llm);
    if (ur.ok) ok += 1;
    else failed.push({ id: pid, error: ur.error ?? '갱신 실패' });
    await sleepBetweenNewsLlmCalls();
  }

  return {
    scanned: rows?.length ?? 0,
    eligible: todo.length,
    ok,
    failed,
    llmConfigured: true,
  };
}

/**
 * 관리자 «AI 가공 실행»: `raw_news` 원문으로 한국어 전용 LLM 재가공 후 **항상** `published=false`(승인 대기).
 */
export async function adminReprocessProcessedNewsKoreanOnly(
  processedNewsId: string,
): Promise<{ ok: boolean; error?: string }> {
  const id = processedNewsId.trim();
  if (!id) return { ok: false, error: 'processed_news_id 가 비었습니다.' };
  if (!isNewsSummaryLlmConfigured()) {
    return {
      ok: false,
      error:
        '뉴스 요약 LLM이 구성되어 있지 않습니다. OPENAI_API_KEY·GEMINI_API_KEY·LOCAL_LLM_BASE_URL 등을 확인하세요.',
    };
  }

  const client = getServerSupabaseClient();
  const { data: pn, error: pe } = await client
    .from('processed_news')
    .select('id, raw_news_id')
    .eq('id', id)
    .maybeSingle();
  if (pe || !pn?.raw_news_id) {
    return { ok: false, error: pe?.message ?? 'processed_news 를 찾을 수 없습니다.' };
  }

  const rawNewsId = String(pn.raw_news_id);
  const { data: raw, error: re } = await client
    .from('raw_news')
    .select('id,title,raw_body,external_url')
    .eq('id', rawNewsId)
    .maybeSingle();
  if (re || !raw) {
    return { ok: false, error: re?.message ?? '연결된 raw_news 가 없습니다.' };
  }

  const rowTodo = raw as RawNewsTodoRow;
  let llm: LlmBilingualPayload;
  try {
    llm = await callKoreanOnlySummary(
      rowTodo.title?.trim() || '(제목 없음)',
      rowTodo.raw_body,
      rowTodo.external_url ?? '',
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 800) : String(e) };
  }

  const ur = await updateBilingualProcessedNews(client, id, rowTodo, llm, { publishedPatch: false });
  if (!ur.ok) {
    return { ok: false, error: ur.error ?? 'DB 갱신 실패' };
  }
  return { ok: true };
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

/** 재난·교통 마비 등 키워드로 우선 처리 순서 결정 — 한 배치 안에서 스마트 큐 역할 */
function computeRawNewsPipelinePriority(title: string, rawBody: string | null): number {
  const hay = `${title ?? ''}\n${rawBody ?? ''}`.toLowerCase();
  let score = 0;
  for (const n of [
    'earthquake',
    'tsunami',
    'flood',
    'wildfire',
    'blast',
    'shooting',
    'terror',
    'emergency',
    'evacuat',
    'curfew',
    'protest',
    'crackdown',
    'blackout',
    'แผ่นดินไหว',
    'สึนามิ',
    'น้ำท่วม',
    'ไฟไหม้',
    'ระเบิด',
    'ปิดถนน',
    'ปิดสถานี',
    'สถานการณ์ฉุกเฉิน',
  ]) {
    if (hay.includes(n)) score += 22;
  }
  for (const n of ['쓰나미', '지진', '태풍', '홍수', '산불', '폭발', '총격', '비상', '대피', '통금', '소요', '테러', '정전']) {
    if (hay.includes(n)) score += 22;
  }
  return score;
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
  const cap = Math.min(Math.max(limit, 1), newsSummarizeMaxBatchCap());

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
    .select('id,title,raw_body,external_url,fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(200);

  if (re) {
    return batchReadyPartial(`[raw_news select] ${re.message}`);
  }

  const effectiveLlmFlag = llmReady || allowStub;

  if (!rawRows?.length) {
    return { results: [], llmConfigured: effectiveLlmFlag, openaiConfigured: effectiveLlmFlag };
  }

  const pending = rawRows.filter((r) => !done.has(r.id));
  pending.sort((a, b) => {
    const pa = computeRawNewsPipelinePriority(a.title ?? '', a.raw_body ?? null);
    const pb = computeRawNewsPipelinePriority(b.title ?? '', b.raw_body ?? null);
    if (pb !== pa) return pb - pa;
    const fa = new Date((a as { fetched_at?: string }).fetched_at ?? 0).getTime();
    const fb = new Date((b as { fetched_at?: string }).fetched_at ?? 0).getTime();
    return fb - fa;
  });
  const todo = pending.slice(0, cap);
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
    await sleepBetweenNewsLlmCalls();
  }

  return {
    results,
    llmConfigured: effectiveLlmFlag,
    openaiConfigured: effectiveLlmFlag,
    ...(slackDigest.length > 0 ? { slackDigest } : {}),
  };
}
