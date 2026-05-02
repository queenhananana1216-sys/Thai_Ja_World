import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Quad = { ko: string; th: string; en: string; zh: string };

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

function isQuad(v: unknown): v is Quad {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.ko === 'string' &&
    typeof o.th === 'string' &&
    typeof o.en === 'string' &&
    typeof o.zh === 'string'
  );
}

function parseTranslatePayload(content: string): { name: Quad; description: Quad } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripMarkdownFence(content));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const o = parsed as Record<string, unknown>;
  if (!isQuad(o.name) || !isQuad(o.description)) return null;
  return { name: o.name, description: o.description };
}

async function resolveTranslateAccess(localSpotId: string): Promise<boolean> {
  const adminGate = await resolveAdminAccess();
  if (adminGate) return true;

  const trimmed = localSpotId.trim();
  if (!trimmed) return false;

  const authSb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await authSb.auth.getUser();
  if (!user?.id) return false;

  const admin = createServiceRoleClient();
  const { data: owned, error } = await admin
    .from('local_spots')
    .select('id')
    .eq('id', trimmed)
    .eq('owner_profile_id', user.id)
    .maybeSingle();

  return !error && Boolean(owned);
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const localSpotId = typeof rec.localSpotId === 'string' ? rec.localSpotId : '';

  const allowed = await resolveTranslateAccess(localSpotId);
  if (!allowed) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 });
  }

  const model =
    process.env.MENU_TRANSLATE_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    'gpt-4o';

  const name = typeof rec.name === 'string' ? rec.name.trim() : '';
  const description =
    typeof rec.description === 'string'
      ? rec.description.trim()
      : rec.description === null || rec.description === undefined
        ? ''
        : '';
  const sourceLocale =
    typeof rec.sourceLocale === 'string' && rec.sourceLocale.trim()
      ? rec.sourceLocale.trim()
      : undefined;

  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const systemPrompt = [
    '너는 미슐랭 3스타 레스토랑의 다국어 메뉴판 번역가야. 기계적인 번역이 아니라, 각 국가의 관광객이 보았을 때 가장 자연스럽고 식욕을 돋우는 요리명/시술명으로 번역해줘.',
    '',
    '출력은 반드시 JSON 한 개뿐이며, 다음 키만 포함한다:',
    '{ "name": { "ko": "...", "th": "...", "en": "...", "zh": "..." }, "description": { "ko": "...", "th": "...", "en": "...", "zh": "..." } }',
    '- zh: 간체 중국어.',
    '- 입력 설명이 비어 있으면 description 네 언어 모두 빈 문자열 "".',
    '- 입력 설명이 있으면 각 언어로 같은 톤으로 매력적으로 번역한다.',
    '- 불필요한 키·설명 문장·마크다운 코드펜스를 넣지 마라.',
  ].join('\n');

  const userPayload = [
    `메뉴명(원문): ${name}`,
    description ? `설명(원문): ${description}` : '설명(원문): (없음)',
    sourceLocale ? `원문 언어 힌트(선택): ${sourceLocale}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await fetch(chatCompletionsUrl('https://api.openai.com/v1'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPayload },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      return NextResponse.json(
        { error: `openai_${response.status}`, detail: t.slice(0, 400) },
        { status: 502 },
      );
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      return NextResponse.json({ error: 'openai_empty_content' }, { status: 502 });
    }

    const parsed = parseTranslatePayload(content);
    if (!parsed) {
      return NextResponse.json({ error: 'invalid_model_json' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, ...parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
