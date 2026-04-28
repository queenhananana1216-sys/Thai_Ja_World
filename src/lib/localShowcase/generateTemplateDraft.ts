import { createServiceRoleClient } from '@/lib/supabase/admin';
import { validateTemplateJson } from '@/lib/localShopTemplates/templateSchema';

type VisionExtraction = {
  menu_items: Array<{ name: string; price: string; description?: string }>;
  mood: string;
  tone_keywords: string[];
  bgm_hint?: string;
};

function chatCompletionsUrl(baseUrl: string): string {
  const b = baseUrl.trim().replace(/\/+$/, '');
  if (b.endsWith('/v1/chat/completions')) return b;
  if (b.endsWith('/chat/completions')) return b;
  if (/\/openai$/i.test(b)) return `${b}/chat/completions`;
  if (b.endsWith('/v1')) return `${b}/chat/completions`;
  return `${b}/v1/chat/completions`;
}

async function runVisionExtraction(imageUrls: string[], spotName: string, category: string): Promise<VisionExtraction> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.LOCAL_SHOWCASE_VISION_MODEL?.trim() || 'gpt-4o-mini';
  if (!openaiKey) {
    return {
      menu_items: [{ name: '대표 메뉴', price: '문의', description: '이미지 텍스트 확인 필요' }],
      mood: `${category} 로컬 매장`,
      tone_keywords: [category, '로컬', '실매장'],
    };
  }

  const response = await fetch(chatCompletionsUrl('https://api.openai.com/v1'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Extract menu rows(name/price/description) and store mood keywords from images. Return JSON with menu_items,mood,tone_keywords,bgm_hint.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Shop: ${spotName}, category: ${category}. Output Korean-friendly concise fields.` },
            ...imageUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
          ],
        },
      ],
    }),
  });
  if (!response.ok) throw new Error(`vision_extract_failed_${response.status}`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('vision_extract_empty');
  const parsed = JSON.parse(content) as VisionExtraction;
  return parsed;
}

async function pickStyleItems(keywords: string[]) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('style_shop_items')
    .select('item_key, category, label_ko, payload, source_type, sponsor_region')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);

  const text = keywords.join(' ').toLowerCase();
  const byCategory = new Map<string, Array<Record<string, unknown>>>();
  for (const item of data ?? []) {
    const category = String(item.category ?? 'misc');
    const list = byCategory.get(category) ?? [];
    list.push(item as unknown as Record<string, unknown>);
    byCategory.set(category, list);
  }

  const categories = ['wallpaper', 'room_skin', 'bgm', 'font'];
  const mapped: Array<Record<string, unknown>> = [];
  for (const category of categories) {
    const candidates = byCategory.get(category) ?? [];
    const picked = candidates.find((row) => {
      const label = String(row.label_ko ?? '').toLowerCase();
      const region = String(row.sponsor_region ?? '').toLowerCase();
      return label.includes(text) || text.includes(region);
    }) ?? candidates[0];
    if (picked) mapped.push(picked);
  }
  return mapped;
}

export async function generateLocalShowcaseDraft(params: { localSpotId: string }) {
  const admin = createServiceRoleClient();
  const { data: spot, error: spotError } = await admin
    .from('local_spots')
    .select('id, name, category, minihome_intro')
    .eq('id', params.localSpotId)
    .maybeSingle();
  if (spotError || !spot) throw new Error(spotError?.message ?? 'local_spot_not_found');

  const { data: assets, error: assetsError } = await admin
    .from('local_spot_menu_assets')
    .select('id, public_url, asset_type')
    .eq('local_spot_id', params.localSpotId)
    .in('asset_type', ['menu_board', 'price_list', 'shop_scene'])
    .order('created_at', { ascending: false })
    .limit(8);
  if (assetsError) throw new Error(assetsError.message);
  const urls = (assets ?? []).map((a) => a.public_url).filter(Boolean);
  if (urls.length === 0) throw new Error('showcase_assets_required');

  const extraction = await runVisionExtraction(urls, spot.name, spot.category);
  const mappedItems = await pickStyleItems([extraction.mood, ...extraction.tone_keywords]);

  const minihomeTheme = mappedItems.reduce<Record<string, unknown>>((acc, item) => {
    const category = String(item.category ?? '');
    acc[category] = item.item_key;
    return acc;
  }, {});

  const template = {
    minihome_intro: spot.minihome_intro ?? `${spot.name} 로컬 쇼케이스`,
    minihome_theme: minihomeTheme,
    minihome_layout_modules: ['intro', 'menu', 'photos', 'line'],
    minihome_menu: extraction.menu_items.map((row, idx) => ({
      name: row.name || '메뉴',
      price: row.price || '문의',
      description: row.description || '',
      image_url: urls[idx % urls.length] || '',
      sort_order: idx,
    })),
    recommendations: {
      concept_summary: extraction.mood,
      tone_keywords: extraction.tone_keywords,
      primary_cta: '전화/LINE으로 예약 문의',
    },
  };

  const validated = validateTemplateJson(template);
  if (!validated.ok) throw new Error(`template_invalid_${validated.errors.join('_')}`);

  const { data: draft, error: draftError } = await admin
    .from('local_spot_template_drafts')
    .insert({
      local_spot_id: params.localSpotId,
      source_asset_ids: (assets ?? []).map((a) => a.id),
      confidence: 0.84,
      style_profile_json: {
        mood: extraction.mood,
        tone_keywords: extraction.tone_keywords,
        mapped_style_items: mappedItems,
      },
      template_json: validated.data,
      pipeline_meta: {
        event: 'local_showcase_generate',
        provider: process.env.LOCAL_SHOWCASE_VISION_MODEL ? 'openai' : 'heuristic',
      },
      status: 'draft',
    })
    .select('id, local_spot_id, template_json, style_profile_json, confidence, created_at')
    .single();
  if (draftError) throw new Error(draftError.message);

  return draft;
}
