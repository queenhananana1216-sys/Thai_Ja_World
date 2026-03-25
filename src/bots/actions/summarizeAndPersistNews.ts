/**
 * summarizeAndPersistNews.ts — raw_news → LLM 한국어·태국어 제목·요약 → processed_news / summaries
 *
 * 환경 변수: OPENAI_API_KEY (필수), OPENAI_MODEL (선택, 기본 gpt-4o-mini)
 * processed_news.clean_body: { ko: {title,summary,blurb}, th: {...}, source_url }
 */

import { getServerSupabaseClient } from '../adapters/supabaseClient';
import { newsInsertAsPublished } from '@/lib/news/newsPublishMode';

export interface SummarizeRowResult {
  raw_news_id: string;
  ok: boolean;
  error?: string;
}

export interface SummarizeBatchResult {
  results: SummarizeRowResult[];
  openaiConfigured: boolean;
  /** processed_news / raw_news 조회 실패 등 */
  dbError?: string;
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

async function callOpenAiBilingualSummary(
  title: string,
  body: string | null,
  sourceUrl: string,
): Promise<LlmBilingualPayload> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error('OPENAI_API_KEY 가 설정되지 않았습니다.');
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const userBlock = [
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

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a news editor for a Thailand–Korea bilingual community site "Thai Ja World". Output valid JSON only. Korean fields: ko_title, ko_summary, ko_blurb. Thai fields: th_title, th_summary, th_blurb.\n\nRules:\n- Do NOT invent facts. Use only what is present in the provided title/body and keep it consistent with the source URL.\n- Avoid defamation: never state uncertain allegations as confirmed facts.\n- Avoid identifying private individuals; if names are not clearly provided in the input, use neutral wording.\n- Blurbs are click-worthy but responsible: short, attention-grabbing first lines without offensive, hateful, or political persuasion content.\n- Output only the JSON object specified.',
        },
        { role: 'user', content: userBlock },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.33,
      max_tokens: 2400,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${t.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error('OpenAI 응답 본문이 비어 있습니다.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw new Error('OpenAI JSON 파싱 실패');
  }

  const payload = parseLlmPayload(parsed);
  if (!payload) {
    throw new Error('OpenAI JSON 스키마 불일치 (ko_/th_ 제목·요약·블러브 필수)');
  }
  return payload;
}

/**
 * 아직 processed_news 가 없는 raw_news 최대 `limit`건에 대해 한국어·태국어 요약 후 저장합니다.
 */
export async function summarizeAndPersistNewsBatch(
  limit: number,
): Promise<SummarizeBatchResult> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { results: [], openaiConfigured: false };
  }

  const client = getServerSupabaseClient();
  const cap = Math.min(Math.max(limit, 1), 30);

  const { data: processedRows, error: pe } = await client
    .from('processed_news')
    .select('raw_news_id');

  if (pe) {
    return {
      results: [],
      openaiConfigured: true,
      dbError: `[processed_news select] ${pe.message}`,
    };
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
    return {
      results: [],
      openaiConfigured: true,
      dbError: `[raw_news select] ${re.message}`,
    };
  }

  if (!rawRows?.length) {
    return {
      results: [],
      openaiConfigured: true,
    };
  }

  const todo = rawRows.filter((r) => !done.has(r.id)).slice(0, cap);
  const results: SummarizeRowResult[] = [];

  for (const row of todo) {
    const title = row.title?.trim() || '(제목 없음)';
    const url = row.external_url ?? '';

    try {
      const llm = await callOpenAiBilingualSummary(title, row.raw_body, url);

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
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ raw_news_id: row.id, ok: false, error: msg });
    }
  }

  return { results, openaiConfigured: true };
}
