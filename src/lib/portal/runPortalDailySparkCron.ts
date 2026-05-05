import 'server-only';

import { revalidateTag } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import {
  buildDeterministicPortalSpark,
  PORTAL_DAILY_SPARK_SETTING_KEY,
  type PortalDailySparkPayload,
} from '@/lib/portal/portalDailySpark';
import { PORTAL_DAILY_SPARK_CACHE_TAG } from '@/lib/portal/loadPortalDailySpark';

async function tryOpenAiSpark(base: PortalDailySparkPayload): Promise<PortalDailySparkPayload | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  if (!key) return null;
  const user = [
    `서울 기준 오늘 날짜: ${base.spark_date}`,
    '태국 거주·여행 교민 커뮤니티 「태국에, 살자」(Living in Thai) 포털용 짧은 한국어 카피를 JSON 한 개로만 출력하세요.',
    '키: spark_date(문자열 동일), fortune_line(한 줄 42자 이내), fortune_detail(2~3문장 한국어만), mission_title(18자 이내), mission_body(2문장 한국어), mission_cta_href(경로 문자열, 보통 /community/boards 또는 /tips).',
    '태국 테마(방콕·날씨·먹거리·비자·안전·커뮤니티) 중 하나를 섞되, 과장·미신 표현 금지. 영어·태국어 문자열 금지.',
  ].join('\n');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You write concise Korean marketing copy. Output JSON only.' },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const merged: PortalDailySparkPayload = {
      spark_date: typeof o.spark_date === 'string' ? o.spark_date.trim() : base.spark_date,
      fortune_line: typeof o.fortune_line === 'string' ? o.fortune_line.trim() : base.fortune_line,
      fortune_detail: typeof o.fortune_detail === 'string' ? o.fortune_detail.trim() : base.fortune_detail,
      mission_title: typeof o.mission_title === 'string' ? o.mission_title.trim() : base.mission_title,
      mission_body: typeof o.mission_body === 'string' ? o.mission_body.trim() : base.mission_body,
      mission_cta_href:
        typeof o.mission_cta_href === 'string' && o.mission_cta_href.startsWith('/')
          ? o.mission_cta_href.trim()
          : base.mission_cta_href,
      source: 'openai',
    };
    if (merged.fortune_line.length < 4 || merged.mission_body.length < 8) return null;
    return merged;
  } catch {
    return null;
  }
}

async function tryGeminiSpark(base: PortalDailySparkPayload): Promise<PortalDailySparkPayload | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const baseUrl =
    process.env.GEMINI_OPENAI_BASE_URL?.trim() || 'https://generativelanguage.googleapis.com/v1beta/openai';
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
  const user = [
    `서울 기준 오늘 날짜: ${base.spark_date}`,
    '태국 거주·여행 교민 커뮤니티 「태국에, 살자」(Living in Thai) 포털용 짧은 한국어 카피를 JSON 한 개로만 출력하세요.',
    '키: spark_date(문자열 동일), fortune_line(한 줄 42자 이내), fortune_detail(2~3문장 한국어만), mission_title(18자 이내), mission_body(2문장 한국어), mission_cta_href(경로 문자열, 보통 /community/boards 또는 /tips).',
    '태국 테마(방콕·날씨·먹거리·비자·안전·커뮤니티) 중 하나를 섞되, 과장·미신 표현 금지. 영어·태국어 문자열 금지.',
  ].join('\n');
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You write concise Korean marketing copy. Output JSON only.' },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const merged: PortalDailySparkPayload = {
      spark_date: typeof o.spark_date === 'string' ? o.spark_date.trim() : base.spark_date,
      fortune_line: typeof o.fortune_line === 'string' ? o.fortune_line.trim() : base.fortune_line,
      fortune_detail: typeof o.fortune_detail === 'string' ? o.fortune_detail.trim() : base.fortune_detail,
      mission_title: typeof o.mission_title === 'string' ? o.mission_title.trim() : base.mission_title,
      mission_body: typeof o.mission_body === 'string' ? o.mission_body.trim() : base.mission_body,
      mission_cta_href:
        typeof o.mission_cta_href === 'string' && o.mission_cta_href.startsWith('/')
          ? o.mission_cta_href.trim()
          : base.mission_cta_href,
      source: 'gemini',
    };
    if (merged.fortune_line.length < 4 || merged.mission_body.length < 8) return null;
    return merged;
  } catch {
    return null;
  }
}

export async function runPortalDailySparkCron(): Promise<{ ok: boolean; mode: string; error?: string }> {
  const base = buildDeterministicPortalSpark();
  let payload = (await tryOpenAiSpark(base)) ?? (await tryGeminiSpark(base)) ?? base;

  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.from('site_settings').upsert(
      {
        key: PORTAL_DAILY_SPARK_SETTING_KEY,
        value: payload as unknown as Record<string, unknown>,
      },
      { onConflict: 'key' },
    );
    if (error) {
      return { ok: false, mode: payload.source, error: error.message };
    }
    revalidateTag(PORTAL_DAILY_SPARK_CACHE_TAG);
    return { ok: true, mode: payload.source };
  } catch (e) {
    return { ok: false, mode: 'error', error: e instanceof Error ? e.message : String(e) };
  }
}
