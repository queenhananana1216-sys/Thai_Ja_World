/**
 * 커뮤니티 posts · processed_knowledge 용 AI 부가 인사이트.
 * 유저 원문(title/content, clean_body)은 변경하지 않고 ai_insight JSON 만 저장.
 */
import { getServerSupabaseClient } from '../adapters/supabaseClient';
import { isNewsSummaryLlmConfigured, runNewsSummaryProviders, stripMarkdownJsonFence } from './summarizeAndPersistNews';
import type { PostAiInsightDisplayV1, PostAiInsightV1 } from '@/lib/community/postAiInsightDisplay';

const CONTEXT_MAX = 12_000;

export type PostInsightRawLlm = {
  ko_ai_summary: string;
  ko_insight_impact: string;
  ko_countermeasure: string;
  feed_warning_ko: string;
  th_ai_summary: string;
  th_insight_impact: string;
  th_countermeasure: string;
  feed_warning_th: string;
  incident_attention: 'none' | 'elevated' | 'high';
  seo_keywords: string;
};

function clamp(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function parsePostInsightRaw(content: string, label: string): PostInsightRawLlm {
  const raw = stripMarkdownJsonFence(content);
  let o: unknown;
  try {
    o = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`${label} JSON 파싱 실패`);
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) {
    throw new Error(`${label} JSON 루트가 객체가 아님`);
  }
  const r = o as Record<string, unknown>;
  const str = (k: string) => clamp(String(r[k] ?? ''), 2400);
  const att = String(r.incident_attention ?? 'none').toLowerCase();
  const incident_attention =
    att === 'elevated' || att === 'high' ? att : ('none' as const);
  const out: PostInsightRawLlm = {
    ko_ai_summary: str('ko_ai_summary'),
    ko_insight_impact: str('ko_insight_impact'),
    ko_countermeasure: str('ko_countermeasure'),
    feed_warning_ko: clamp(String(r.feed_warning_ko ?? ''), 120),
    th_ai_summary: str('th_ai_summary'),
    th_insight_impact: str('th_insight_impact'),
    th_countermeasure: str('th_countermeasure'),
    feed_warning_th: clamp(String(r.feed_warning_th ?? ''), 120),
    incident_attention,
    seo_keywords: clamp(String(r.seo_keywords ?? ''), 400),
  };
  const minKo = 8;
  const minTh = 6;
  if (
    out.ko_ai_summary.length < minKo ||
    out.ko_insight_impact.length < minKo ||
    out.ko_countermeasure.length < minKo ||
    out.th_ai_summary.length < minTh ||
    out.th_insight_impact.length < minTh ||
    out.th_countermeasure.length < minTh
  ) {
    throw new Error(`${label} 필수 한·태 필드가 너무 짧음`);
  }
  return out;
}

function withAiCountermeasureHeader(text: string, lang: 'ko' | 'th'): string {
  const t = text.trim();
  if (!t) {
    return lang === 'ko'
      ? '**[AI의 대비책]**\n· 공식 경로만으로 확인하고, 불확실하면 저장·차단 후 신고 채널을 이용합니다.'
      : '**[แผนรับมือจาก AI]**\n· ตรวจสอบผ่านช่องทางราชการเท่านั้น — หากไม่แน่ใจให้หยุดและรอข้อมูล';
  }
  if (lang === 'ko' && t.includes('[AI의 대비책]')) return t;
  if (lang === 'th' && (t.includes('แผนรับมือจาก AI') || t.includes('[แผนรับมือจาก AI]'))) return t;
  return lang === 'ko' ? `**[AI의 대비책]**\n${t}` : `**[แผนรับมือจาก AI]**\n${t}`;
}

function buildAiInsightPayload(raw: PostInsightRawLlm): PostAiInsightV1 {
  const display: PostAiInsightDisplayV1 = {
    ko: {
      summary: raw.ko_ai_summary,
      insight_impact: raw.ko_insight_impact,
      countermeasure: withAiCountermeasureHeader(raw.ko_countermeasure, 'ko'),
    },
    th: {
      summary: raw.th_ai_summary,
      insight_impact: raw.th_insight_impact,
      countermeasure: withAiCountermeasureHeader(raw.th_countermeasure, 'th'),
    },
    ai_signals: {
      incident_attention: raw.incident_attention,
      ...(raw.feed_warning_ko.trim() ? { feed_warning_ko: raw.feed_warning_ko.trim() } : {}),
      ...(raw.feed_warning_th.trim() ? { feed_warning_th: raw.feed_warning_th.trim() } : {}),
    },
  };
  return {
    schema_version: 1,
    raw_llm: { ...raw },
    display,
  };
}

const COMMUNITY_INSIGHT_SYSTEM = [
  'You are the editorial voice for "Living in Thai / 태국에, 살자" community safety desk — **태국 현지에 익숙한 한인 운영자** 한 사람이 옆에서 짚어 주듯: 적당히 위트 있되 냉철한 중립. 뉴스 데스크와 같은 철학(사건에서 배우고, 곧장 행동으로 연결).',
  'Tone: 한 줄 드라이 위트는 OK, 기계 번역·형식적인 "유의하세요" 나열 금지. no hype, no moralizing, no victim mockery.',
  'You receive CONTEXT about a USER-WRITTEN community post (title + body excerpt).',
  'STRICT RULES:',
  '- NEVER copy, paraphrase, or quote the user title or body in your output strings.',
  '- NEVER output any substring longer than 18 characters that appears verbatim in CONTEXT (case-insensitive match).',
  '- Produce ONLY your own analytical lines in Korean and Thai as instructed.',
  '- Stay factual and practical; no harassment; no invented laws or visa claims beyond generic prudence.',
  '',
  'Output a single JSON object with EXACTLY these keys (all string values except incident_attention enum):',
  'ko_ai_summary, ko_insight_impact, ko_countermeasure, feed_warning_ko,',
  'th_ai_summary, th_insight_impact, th_countermeasure, feed_warning_th,',
  'incident_attention (none|elevated|high), seo_keywords',
  '',
  'Meanings:',
  '- *_ai_summary: one tight "AI 한마디" line for that language (not a recap of the post).',
  '- *_insight_impact: how this topic may affect readers in Thailand (generic, no names).',
  '- *_countermeasure: 1~3 concrete prudent steps (verify official sources, stay alert, etc.). JSON 문자열 안에는 헤더 없이 본문만 — 시스템이 **[AI의 대비책]** / **[แผนรับมือจาก AI]** 접두를 붙인다.',
  '- feed_warning_*: empty string "" usually; short line if incident_attention is elevated/high.',
  '- seo_keywords: exactly five comma-separated Korean/Thai mixed phrases, no numbering.',
].join('\n');

async function callCommunityInsightLlm(contextBlock: string): Promise<PostInsightRawLlm> {
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: COMMUNITY_INSIGHT_SYSTEM },
    {
      role: 'user',
      content: [
        'CONTEXT (do not quote in output):',
        contextBlock.slice(0, CONTEXT_MAX),
        '',
        'Return JSON only.',
      ].join('\n'),
    },
  ];
  return runNewsSummaryProviders(messages, parsePostInsightRaw, 1600);
}

type InsightShape = {
  schema_version?: number;
  display?: {
    ko?: { summary?: string; insight_impact?: string; countermeasure?: string };
    th?: { summary?: string; insight_impact?: string; countermeasure?: string };
  };
};

export function needsPostAiInsight(insight: unknown): boolean {
  if (insight == null) return true;
  try {
    const o: InsightShape =
      typeof insight === 'string' ? (JSON.parse(insight) as InsightShape) : (insight as InsightShape);
    if (Number(o.schema_version) !== 1) return true;
    const ko = o.display?.ko;
    const th = o.display?.th;
    const minKo = 6;
    const minTh = 4;
    const koI = ko?.insight_impact?.trim() ?? '';
    const koC = ko?.countermeasure?.trim() ?? '';
    const koS = ko?.summary?.trim() ?? '';
    const thI = th?.insight_impact?.trim() ?? '';
    const thC = th?.countermeasure?.trim() ?? '';
    const thS = th?.summary?.trim() ?? '';
    if (
      koI.length < minKo ||
      koC.length < minKo ||
      koS.length < minKo ||
      thI.length < minTh ||
      thC.length < minTh ||
      thS.length < minTh
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export type RetrofitPostInsightBatchResult = {
  llmConfigured: boolean;
  scanned: number;
  eligible: number;
  ok: number;
  failed: { id: string; error: string }[];
};

export async function retrofitPostInsightBatch(params: {
  limit: number;
  onlyMissing: boolean;
}): Promise<RetrofitPostInsightBatchResult> {
  if (!isNewsSummaryLlmConfigured()) {
    return { llmConfigured: false, scanned: 0, eligible: 0, ok: 0, failed: [] };
  }
  const limit = Math.min(Math.max(Math.floor(params.limit), 1), 25);
  const onlyMissing = params.onlyMissing !== false;
  const client = getServerSupabaseClient();

  const { data: rows, error } = await client
    .from('posts')
    .select('id, title, content, moderation_status, author_hidden, ai_insight')
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .order('created_at', { ascending: false })
    .limit(800);

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
    if (onlyMissing && !needsPostAiInsight(r.ai_insight)) return false;
    return Boolean((r.title as string)?.trim() || (r.content as string)?.trim());
  });
  const slice = candidates.slice(0, limit);
  const eligible = slice.length;
  const failed: { id: string; error: string }[] = [];
  let ok = 0;

  for (const row of slice) {
    const id = String(row.id);
    const title = String(row.title ?? '').trim() || '(제목 없음)';
    const body = String(row.content ?? '').trim();
    const context = [`TITLE: ${title}`, '', 'BODY:', body].join('\n');
    let raw: PostInsightRawLlm;
    try {
      raw = await callCommunityInsightLlm(context);
    } catch (e) {
      failed.push({
        id,
        error: e instanceof Error ? e.message.slice(0, 500) : String(e),
      });
      continue;
    }
    const payload = buildAiInsightPayload(raw);
    const { error: upErr } = await client.from('posts').update({ ai_insight: payload }).eq('id', id);
    if (upErr) failed.push({ id, error: upErr.message });
    else ok += 1;
  }

  return { llmConfigured: true, scanned, eligible, ok, failed };
}

function knowledgeContextFromCleanBody(clean: unknown): string {
  if (clean == null) return '';
  let j: unknown = clean;
  if (typeof clean === 'string') {
    try {
      j = JSON.parse(clean) as unknown;
    } catch {
      return '';
    }
  }
  const o = j as Record<string, unknown>;
  const ko = o.ko as Record<string, unknown> | undefined;
  const th = o.th as Record<string, unknown> | undefined;
  const parts = [
    ko?.title ? `KO_TITLE: ${String(ko.title)}` : '',
    ko?.summary ? `KO_SUMMARY: ${String(ko.summary)}` : '',
    th?.title ? `TH_TITLE: ${String(th.title)}` : '',
    th?.summary ? `TH_SUMMARY: ${String(th.summary)}` : '',
  ].filter(Boolean);
  return parts.join('\n\n').slice(0, CONTEXT_MAX);
}

export async function retrofitProcessedKnowledgeInsightBatch(params: {
  limit: number;
  onlyMissing: boolean;
}): Promise<RetrofitPostInsightBatchResult> {
  if (!isNewsSummaryLlmConfigured()) {
    return { llmConfigured: false, scanned: 0, eligible: 0, ok: 0, failed: [] };
  }
  const limit = Math.min(Math.max(Math.floor(params.limit), 1), 25);
  const onlyMissing = params.onlyMissing !== false;
  const client = getServerSupabaseClient();

  const { data: rows, error } = await client
    .from('processed_knowledge')
    .select('id, clean_body, published, ai_insight')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(600);

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
    if (onlyMissing && !needsPostAiInsight(r.ai_insight)) return false;
    return Boolean(knowledgeContextFromCleanBody(r.clean_body));
  });
  const slice = candidates.slice(0, limit);
  const eligible = slice.length;
  const failed: { id: string; error: string }[] = [];
  let ok = 0;

  for (const row of slice) {
    const id = String(row.id);
    const context = knowledgeContextFromCleanBody(row.clean_body);
    if (!context.trim()) {
      failed.push({ id, error: 'clean_body 에서 컨텍스트 추출 실패' });
      continue;
    }
    let raw: PostInsightRawLlm;
    try {
      raw = await callCommunityInsightLlm(context);
    } catch (e) {
      failed.push({
        id,
        error: e instanceof Error ? e.message.slice(0, 500) : String(e),
      });
      continue;
    }
    const payload = buildAiInsightPayload(raw);
    const { error: upErr } = await client
      .from('processed_knowledge')
      .update({ ai_insight: payload })
      .eq('id', id);
    if (upErr) failed.push({ id, error: upErr.message });
    else ok += 1;
  }

  return { llmConfigured: true, scanned, eligible, ok, failed };
}

/** 단일 글 트리거용 — 크론에서 postId 하나만 재실행할 때 */
export async function runPostInsightForId(postId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isNewsSummaryLlmConfigured()) {
    return { ok: false, error: 'LLM not configured' };
  }
  const client = getServerSupabaseClient();
  const { data: row, error } = await client
    .from('posts')
    .select('id, title, content, moderation_status, author_hidden')
    .eq('id', postId)
    .maybeSingle();
  if (error || !row) return { ok: false, error: error?.message ?? 'not found' };
  if (row.moderation_status !== 'safe' || row.author_hidden) {
    return { ok: false, error: 'not eligible' };
  }
  const title = String(row.title ?? '').trim() || '(제목 없음)';
  const body = String(row.content ?? '').trim();
  const context = [`TITLE: ${title}`, '', 'BODY:', body].join('\n');
  let raw: PostInsightRawLlm;
  try {
    raw = await callCommunityInsightLlm(context);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const payload = buildAiInsightPayload(raw);
  const { error: upErr } = await client.from('posts').update({ ai_insight: payload }).eq('id', postId);
  if (upErr) return { ok: false, error: upErr.message };
  return { ok: true };
}
