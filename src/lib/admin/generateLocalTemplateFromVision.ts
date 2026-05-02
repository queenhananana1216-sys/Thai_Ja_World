import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';

export type DecorationCatalogRow = {
  id: string;
  type: string;
  name: string;
  tags: string[];
  color_code?: string | null;
  audio_embed_url?: string | null;
};

export type VisionTemplateImage = {
  role: 'exterior' | 'interior' | 'menu';
  dataUrl: string;
};

export type GenerateLocalTemplateVisionResult = {
  vibe_summary: string;
  vibe_tags: string[];
  selected_skin_basic_id: string;
  selected_skin_special_id: string | null;
  selected_bgm_id: string;
  menu_items: Array<{ name: string; price: string }>;
  notes: string;
  catalog_snapshot: DecorationCatalogRow[];
  resolved: {
    skin_basic: DecorationCatalogRow | null;
    skin_special: DecorationCatalogRow | null;
    bgm: DecorationCatalogRow | null;
  };
};

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

async function loadDecorationCatalog(): Promise<DecorationCatalogRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('decoration_assets')
    .select('id, type, name, tags, color_code, audio_embed_url')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(`decoration_assets: ${error.message}`);
  const rows = (data ?? []) as Array<{
    id: string;
    type: string;
    name: string;
    tags: string[] | null;
    color_code: string | null;
    audio_embed_url: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    name: r.name,
    tags: Array.isArray(r.tags) ? r.tags : [],
    color_code: r.color_code ?? null,
    audio_embed_url: r.audio_embed_url ?? null,
  }));
}

function buildSystemPrompt(): string {
  return [
    'You are a vision AI for Thai/Korea local shop digitization.',
    'Analyze store photos for atmosphere (vibe) and read menu boards with OCR.',
    'You MUST choose decoration asset ids ONLY from the catalog JSON provided in the user message.',
    'Rules:',
    '- selected_skin_basic_id: must be type "skin_basic".',
    '- selected_skin_special_id: type "skin_special" or null if none fits.',
    '- selected_bgm_id: must be type "bgm".',
    '- Match vibe using overlap between your inferred vibe_tags and each asset tags.',
    '- menu_items: extract ONLY from images marked as menu board region; name and price as printed (keep currency symbols).',
    '- Output JSON only, no markdown fences.',
  ].join('\n');
}

function buildUserPrompt(params: { businessName: string; catalog: DecorationCatalogRow[] }): string {
  const slimCatalog = params.catalog.map((c) => ({
    id: c.id,
    type: c.type,
    name: c.name,
    tags: c.tags,
  }));
  return [
    `업체명: ${params.businessName}`,
    '',
    'decoration_assets 카탈로그 (id/type/name/tags):',
    JSON.stringify(slimCatalog, null, 0),
    '',
    '이미지 순서는 사용자 메시지 블록에서 구역 라벨 직후에 이어집니다.',
    '가게 전경·내부 사진으로 분위기를 추론하고, 메뉴판 구역에서만 메뉴명·가격을 읽으세요.',
    '',
    '반드시 이 키만 갖는 JSON 객체 하나를 반환하세요:',
    JSON.stringify(
      {
        vibe_summary: 'string',
        vibe_tags: ['string'],
        selected_skin_basic_id: 'uuid',
        selected_skin_special_id: 'uuid|null',
        selected_bgm_id: 'uuid',
        menu_items: [{ name: 'string', price: 'string' }],
        notes: 'string',
      },
      null,
      2,
    ),
  ].join('\n');
}

function visionContentBlocks(images: VisionTemplateImage[]): Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }
> {
  const out: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }
  > = [];
  const byRole = (role: VisionTemplateImage['role']) => images.filter((i) => i.role === role);
  const label: Record<VisionTemplateImage['role'], string> = {
    exterior: '--- 구역: 가게 전경 (분위기 분석) ---',
    interior: '--- 구역: 매장 내부 (분위기 분석) ---',
    menu: '--- 구역: 메뉴판 (OCR 로 메뉴명·가격 추출) ---',
  };
  for (const role of ['exterior', 'interior', 'menu'] as const) {
    const list = byRole(role);
    if (list.length === 0) continue;
    out.push({ type: 'text', text: label[role] });
    for (const img of list) {
      out.push({ type: 'image_url', image_url: { url: img.dataUrl, detail: 'auto' } });
    }
  }
  return out;
}

function parseVisionJson(raw: string): Record<string, unknown> {
  const clean = stripMarkdownFence(raw);
  return JSON.parse(clean) as Record<string, unknown>;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

function asMenuItems(v: unknown): Array<{ name: string; price: string }> {
  if (!Array.isArray(v)) return [];
  const out: Array<{ name: string; price: string }> = [];
  for (const row of v) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const o = row as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    if (!name) continue;
    const price = typeof o.price === 'string' ? o.price.trim() : String(o.price ?? '').trim();
    out.push({ name, price: price || '문의' });
  }
  return out;
}

function validateSelection(
  catalogById: Map<string, DecorationCatalogRow>,
  basicId: string,
  specialId: string | null,
  bgmId: string,
): void {
  const basic = catalogById.get(basicId);
  if (!basic || basic.type !== 'skin_basic') throw new Error('invalid_selected_skin_basic_id');
  const bgm = catalogById.get(bgmId);
  if (!bgm || bgm.type !== 'bgm') throw new Error('invalid_selected_bgm_id');
  if (specialId) {
    const sp = catalogById.get(specialId);
    if (!sp || sp.type !== 'skin_special') throw new Error('invalid_selected_skin_special_id');
  }
}

export async function generateLocalTemplateFromVision(params: {
  businessName: string;
  images: VisionTemplateImage[];
}): Promise<GenerateLocalTemplateVisionResult> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const model =
    process.env.LOCAL_TEMPLATE_VISION_MODEL?.trim() ||
    process.env.OPENAI_VISION_MODEL?.trim() ||
    'gpt-4o';

  const catalog = await loadDecorationCatalog();
  if (catalog.length === 0) {
    throw new Error('decoration_assets_catalog_empty — DB 마이그레이션·시드 확인');
  }

  const catalogById = new Map(catalog.map((c) => [c.id, c]));

  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY 가 설정되지 않았습니다.');
  }

  const userText = buildUserPrompt({ businessName: params.businessName.trim(), catalog });
  const blocks: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }
  > = [{ type: 'text', text: userText }, ...visionContentBlocks(params.images)];

  const response = await fetch(chatCompletionsUrl('https://api.openai.com/v1'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: blocks },
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`openai_vision_${response.status}: ${t.slice(0, 400)}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error('openai_vision_empty_content');

  const parsed = parseVisionJson(content);
  const vibe_summary = typeof parsed.vibe_summary === 'string' ? parsed.vibe_summary.trim() : '';
  const vibe_tags = asStringArray(parsed.vibe_tags);
  const basicId = typeof parsed.selected_skin_basic_id === 'string' ? parsed.selected_skin_basic_id.trim() : '';
  const bgmId = typeof parsed.selected_bgm_id === 'string' ? parsed.selected_bgm_id.trim() : '';
  const specialRaw = parsed.selected_skin_special_id;
  const specialId =
    specialRaw === null || specialRaw === undefined
      ? null
      : typeof specialRaw === 'string' && specialRaw.trim()
        ? specialRaw.trim()
        : null;
  const menu_items = asMenuItems(parsed.menu_items);
  const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : '';

  if (!basicId || !bgmId) throw new Error('vision_missing_required_ids');

  validateSelection(catalogById, basicId, specialId, bgmId);

  return {
    vibe_summary: vibe_summary || '—',
    vibe_tags,
    selected_skin_basic_id: basicId,
    selected_skin_special_id: specialId,
    selected_bgm_id: bgmId,
    menu_items,
    notes,
    catalog_snapshot: catalog,
    resolved: {
      skin_basic: catalogById.get(basicId) ?? null,
      skin_special: specialId ? catalogById.get(specialId) ?? null : null,
      bgm: catalogById.get(bgmId) ?? null,
    },
  };
}
