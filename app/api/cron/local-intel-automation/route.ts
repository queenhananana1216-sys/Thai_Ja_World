import { type NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { processKnowledgeFromResolvedRaw } from '@/bots/actions/processAndPersistKnowledge';
import { upsertTipsArticleBySourceUrl } from '@/bots/actions/summarizeAndPersistNews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

type IntelItem = {
  source: 'visa' | 'hospital' | 'pharmacy' | 'mart' | 'real-estate';
  title: string;
  external_url: string;
  raw_body: string;
  category_hint: string;
};

type VerifiedIntel = {
  ok: boolean;
  normalized_name?: string;
  normalized_summary?: string;
  category?: string;
  region?: string;
  slug?: string;
  confidence?: 'high' | 'medium' | 'low';
  reason?: string;
};

function cronSecret(): string {
  return process.env.CRON_SECRET?.trim() || process.env.BOT_CRON_SECRET?.trim() || '';
}

function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 64);
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json, */*',
      'User-Agent': 'LivingInThai-LocalIntel/2026',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function collectLocalIntel(): Promise<IntelItem[]> {
  const now = new Date().toISOString();
  const items: IntelItem[] = [];

  const visaFeed = `https://news.google.com/rss/search?q=${encodeURIComponent('태국 비자 규정')}&hl=ko&gl=TH&ceid=TH:ko`;
  items.push({
    source: 'visa',
    title: `[AUTO][VISA] Thailand visa policy watch ${now.slice(0, 10)}`,
    external_url: `internal://local-intel/visa/${now.slice(0, 10)}`,
    raw_body: JSON.stringify({ feed: visaFeed, collected_at: now }),
    category_hint: 'info',
  });

  const overpassQuery = `[out:json][timeout:25];
(
  node["amenity"="hospital"](13.6,100.4,13.9,100.8);
  node["amenity"="pharmacy"](13.6,100.4,13.9,100.8);
  node["shop"="supermarket"](13.6,100.4,13.9,100.8);
);
out body 15;`;
  try {
    const raw = (await fetchJson(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`,
    )) as { elements?: Array<Record<string, unknown>> };
    for (const element of raw.elements ?? []) {
      const tags = (element.tags as Record<string, unknown> | undefined) ?? {};
      const name = typeof tags.name === 'string' ? tags.name : 'Unnamed';
      const amenity = typeof tags.amenity === 'string' ? tags.amenity : '';
      const shop = typeof tags.shop === 'string' ? tags.shop : '';
      const category = amenity === 'hospital' ? 'hospital' : amenity === 'pharmacy' ? 'pharmacy' : shop === 'supermarket' ? 'mart' : 'local';
      if (category === 'local') continue;
      items.push({
        source: category as IntelItem['source'],
        title: `[AUTO][${category.toUpperCase()}] ${name}`,
        external_url: `https://www.openstreetmap.org/node/${String(element.id ?? '')}`,
        raw_body: JSON.stringify({
          source: 'openstreetmap-overpass',
          name,
          lat: element.lat ?? null,
          lon: element.lon ?? null,
          tags,
          collected_at: now,
        }),
        category_hint: category,
      });
    }
  } catch (error) {
    console.error('[local-intel-automation] overpass fetch failed:', error);
  }

  return items.slice(0, 40);
}

async function verifyLocalIntelWithLlm(item: IntelItem): Promise<VerifiedIntel> {
  const provider = (process.env.NEWS_SUMMARY_PROVIDER || 'auto').trim().toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiBase =
    process.env.GEMINI_OPENAI_BASE_URL?.trim() || 'https://generativelanguage.googleapis.com/v1beta/openai';
  const openaiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';

  const targets =
    provider === 'openai'
      ? [{ baseUrl: 'https://api.openai.com/v1', model: openaiModel, key: openaiKey }]
      : provider === 'gemini'
        ? [{ baseUrl: geminiBase, model: geminiModel, key: geminiKey }]
        : [
            { baseUrl: 'https://api.openai.com/v1', model: openaiModel, key: openaiKey },
            { baseUrl: geminiBase, model: geminiModel, key: geminiKey },
          ];

  const system = `You verify Thailand local survival intel for 2026 "Living in Thai" (태국에, 살자) community standards.
Return JSON only:
{"ok":boolean,"normalized_name":"string","normalized_summary":"string","category":"hospital|pharmacy|mart|info|real-estate|job","region":"string","slug":"string","confidence":"high|medium|low","reason":"string"}
Rules:
- Cross-check plausibility from title/raw text only. If uncertain set ok=false with reason.
- Normalize Korean copy concise and practical.
- No phone numbers hallucination.
- category must be one of allowed values.`;
  const user = `title=${item.title}
url=${item.external_url}
category_hint=${item.category_hint}
raw=${item.raw_body}`;

  for (const target of targets) {
    if (!target.key) continue;
    try {
      const res = await fetch(`${target.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${target.key}`,
        },
        body: JSON.stringify({
          model: target.model,
          response_format: { type: 'json_object' },
          temperature: 0,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) continue;
      const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) continue;
      const parsed = JSON.parse(content) as VerifiedIntel;
      if (typeof parsed.ok === 'boolean') {
        return parsed;
      }
    } catch {
      // try next provider
    }
  }

  return {
    ok: item.source !== 'visa',
    normalized_name: item.title,
    normalized_summary: `${item.category_hint} 로컬 인텔 자동 수집 항목`,
    category: item.category_hint as VerifiedIntel['category'],
    region: 'bangkok',
    slug: sanitizeSlug(item.title),
    confidence: 'low',
    reason: 'LLM unavailable: fallback verification',
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const force = new URL(req.url).searchParams.get('force') === '1';
  const key = new URL(req.url).searchParams.get('key')?.trim() || '';
  const secret = cronSecret();
  const authOk = isCronAuthorized(req.headers.get('authorization'));
  const keyOk = Boolean(secret) && key === secret;
  const manualAllowed = force && (authOk || keyOk || !secret);

  if (!authOk && !manualAllowed) {
    return NextResponse.json(
      { status: 'error', error: 'Unauthorized', hint: 'Use Authorization or ?force=1&key=<CRON_SECRET>' },
      { status: 401 },
    );
  }

  const admin = createServiceRoleClient();
  const collected = await collectLocalIntel();
  const verified: Array<{ rawId: string; item: IntelItem; ai: VerifiedIntel }> = [];
  let insertedRaw = 0;

  for (const item of collected) {
    const { data, error } = await admin
      .from('raw_knowledge')
      .upsert(
        {
          external_url: item.external_url,
          title_original: item.title,
          raw_body: item.raw_body,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'external_url' },
      )
      .select('id')
      .single();
    if (error || !data?.id) continue;
    insertedRaw += 1;
    const ai = await verifyLocalIntelWithLlm(item);
    if (!ai.ok) continue;
    verified.push({ rawId: String(data.id), item, ai });
  }

  let processedCount = 0;
  let tipsCount = 0;
  let businessesCount = 0;

  for (const row of verified) {
    const { rawId, item, ai } = row;
    const { data: rawRow } = await admin
      .from('raw_knowledge')
      .select('id,title_original,raw_body,external_url,fetched_at')
      .eq('id', rawId)
      .maybeSingle();
    if (!rawRow) continue;

    const result = await processKnowledgeFromResolvedRaw(
      admin as Parameters<typeof processKnowledgeFromResolvedRaw>[0],
      rawRow,
    );
    if (result.ok) processedCount += 1;

    if (ai.category === 'info') {
      const { error } = await upsertTipsArticleBySourceUrl(admin, {
        source_url: item.external_url,
        title: ai.normalized_name ?? item.title,
        excerpt: ai.normalized_summary ?? '비자/생활 인텔 자동 검증 항목',
        body_preview: item.raw_body.slice(0, 900),
        title_kr: ai.normalized_name ?? item.title,
        content_kr: ai.normalized_summary ?? '자동 검증 완료',
        title_th: ai.normalized_name ?? item.title,
        content_th: ai.normalized_summary ?? 'Auto verified',
        status: 'draft',
      });
      if (!error) tipsCount += 1;
      continue;
    }

    if (ai.category === 'hospital' || ai.category === 'pharmacy' || ai.category === 'mart' || ai.category === 'real-estate') {
      const name = (ai.normalized_name || item.title).trim();
      const slug = sanitizeSlug(ai.slug || name || item.title);
      const { error } = await admin.from('local_businesses').upsert(
        {
          slug,
          name,
          category: ai.category === 'real-estate' ? 'real-estate' : ai.category,
          region: ai.region || 'bangkok',
          description: ai.normalized_summary || `${ai.category} 자동 수집 항목`,
          emoji: ai.category === 'hospital' ? '🏥' : ai.category === 'pharmacy' ? '💊' : ai.category === 'mart' ? '🛒' : '🏢',
          tags: ['auto', 'verified', '2026'],
          is_active: true,
          is_recommended: ai.confidence === 'high',
        },
        { onConflict: 'slug' },
      );
      if (!error) businessesCount += 1;
    }
  }

  return NextResponse.json({
    status: 'success',
    collected: collected.length,
    inserted_raw_knowledge: insertedRaw,
    verified_passed: verified.length,
    processed_knowledge: processedCount,
    tips_articles_upserted: tipsCount,
    local_businesses_upserted: businessesCount,
  });
}
