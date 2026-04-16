import { createServiceRoleClient } from '@/lib/supabase/admin';
import { type LocalSpotTemplateJson, validateTemplateJson } from './templateSchema';

type AssetStatus = 'uploaded' | 'queued' | 'processing' | 'processed' | 'failed';
type AssetType = 'menu_board' | 'price_list' | 'treatment_sheet' | 'shop_scene';
type Provider = 'auto' | 'heuristic' | 'openai' | 'gemini';

type MenuAssetRow = {
  id: string;
  local_spot_id: string;
  asset_type: AssetType;
  status: AssetStatus;
  public_url: string;
  storage_path: string;
};

type SpotRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  minihome_intro: string | null;
  minihome_theme: unknown;
  minihome_menu: unknown;
  minihome_layout_modules: unknown;
  photo_urls: unknown;
};

type PipelineResult = {
  picked: number;
  processed: number;
  failed: number;
};

type VisionDraftResult = {
  template: LocalSpotTemplateJson;
  styleProfile: Record<string, unknown>;
  confidence: number;
  source: string;
};

function normalizeProvider(): Provider {
  const raw = (process.env.LOCAL_SHOP_TEMPLATE_PROVIDER ?? 'auto').trim().toLowerCase();
  if (raw === 'heuristic' || raw === 'openai' || raw === 'gemini' || raw === 'auto') return raw;
  return 'auto';
}

function categoryAccent(category: string): string {
  if (category === 'massage') return '#22c55e';
  if (category === 'cafe') return '#a16207';
  if (category === 'night_market') return '#f97316';
  if (category === 'service') return '#0ea5e9';
  if (category === 'shopping') return '#ec4899';
  return '#7c3aed';
}

function defaultMenuByCategory(category: string): Array<{ name: string; price: string; description: string }> {
  if (category === 'massage') {
    return [
      { name: '타이 마사지 60분', price: '400฿', description: '압 조절 가능, 예약 우선' },
      { name: '오일 마사지 90분', price: '900฿', description: '커플룸 문의 가능' },
    ];
  }
  if (category === 'cafe') {
    return [
      { name: '아메리카노', price: '90฿', description: '원두 선택 가능' },
      { name: '시그니처 라떼', price: '120฿', description: '당도 조절 가능' },
    ];
  }
  return [
    { name: '대표 메뉴', price: '문의', description: '이미지 기반 초안 — 점주 확인 필요' },
    { name: '추천 메뉴', price: '문의', description: '실제 가격표로 수정해 주세요' },
  ];
}

function asMenuArray(raw: unknown): LocalSpotTemplateJson['minihome_menu'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, idx) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const obj = item as Record<string, unknown>;
      const name = typeof obj.name === 'string' ? obj.name.trim() : '';
      if (!name) return null;
      return {
        name,
        price: typeof obj.price === 'string' ? obj.price.trim() : '',
        description: typeof obj.description === 'string' ? obj.description.trim() : '',
        image_url: typeof obj.image_url === 'string' ? obj.image_url.trim() : '',
        sort_order: Number.isFinite(Number(obj.sort_order)) ? Number(obj.sort_order) : idx,
      };
    })
    .filter((x): x is LocalSpotTemplateJson['minihome_menu'][number] => x !== null);
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function splitImageSources(spot: SpotRow, assets: MenuAssetRow[]) {
  const menuImageUrls = uniqueUrls(
    assets
      .filter((a) => a.asset_type !== 'shop_scene')
      .map((a) => a.public_url?.trim() ?? '')
      .filter(Boolean),
  );
  const uploadedSceneUrls = assets
    .filter((a) => a.asset_type === 'shop_scene')
    .map((a) => a.public_url?.trim() ?? '')
    .filter(Boolean);
  const spotPhotoUrls = asStringArray(spot.photo_urls);
  const sceneImageUrls = uniqueUrls([...uploadedSceneUrls, ...spotPhotoUrls]);
  const allImageUrls = uniqueUrls([...menuImageUrls, ...sceneImageUrls]).slice(0, 8);
  return {
    menuImageUrls,
    sceneImageUrls,
    allImageUrls,
  };
}

function buildHeuristicTemplate(
  spot: SpotRow,
  assets: MenuAssetRow[],
): { template: LocalSpotTemplateJson; confidence: number; styleProfile: Record<string, unknown> } {
  const currentMenu = asMenuArray(spot.minihome_menu);
  const { menuImageUrls, sceneImageUrls } = splitImageSources(spot, assets);
  const seededMenuBase =
    currentMenu.length > 0
      ? currentMenu
      : defaultMenuByCategory(spot.category).map((row, idx) => ({
          ...row,
          image_url: '',
          sort_order: idx,
        }));
  const seededMenu = seededMenuBase.map((item, idx) => ({
    ...item,
    image_url: item.image_url || menuImageUrls[idx % (menuImageUrls.length || 1)] || '',
  }));

  const existingLayout = asStringArray(spot.minihome_layout_modules);
  const layoutModules = existingLayout.length > 0 ? existingLayout : ['intro', 'menu', 'photos', 'line'];
  const accent = categoryAccent(spot.category);
  const conceptSummary = `${spot.name}의 톤을 유지하면서 메뉴/가격 정보가 한눈에 보이는 실사용형 미니홈`;
  const intro =
    spot.minihome_intro?.trim() ||
    `${spot.name} 메뉴판/현장 이미지를 바탕으로 정리한 안내 초안입니다. 최신 가격/구성은 점주 확인 후 확정됩니다.`;

  const prevTheme =
    spot.minihome_theme && typeof spot.minihome_theme === 'object' && !Array.isArray(spot.minihome_theme)
      ? (spot.minihome_theme as Record<string, unknown>)
      : {};
  const theme: Record<string, unknown> = {
    ...prevTheme,
    accent,
  };
  if (!theme.wallpaper && sceneImageUrls[0]) theme.wallpaper = sceneImageUrls[0];
  if (!theme.room_skin && sceneImageUrls[1]) theme.room_skin = sceneImageUrls[1];

  const template: LocalSpotTemplateJson = {
    minihome_intro: intro,
    minihome_theme: theme,
    minihome_layout_modules: layoutModules,
    minihome_menu: seededMenu,
    recommendations: {
      concept_summary: conceptSummary,
      tone_keywords: [spot.category, '실사용', '가격명확', '예약동선'],
      primary_cta: 'LINE으로 가격·예약 문의',
    },
  };

  let confidence = 0.42;
  if (currentMenu.length > 0) confidence += 0.22;
  if (menuImageUrls.length > 0) confidence += 0.16;
  if (sceneImageUrls.length > 0) confidence += 0.1;
  if (spot.minihome_intro?.trim()) confidence += 0.06;
  if (spot.description?.trim()) confidence += 0.04;
  confidence = Math.min(0.92, Number(confidence.toFixed(2)));

  const styleProfile = {
    inferred_concept: conceptSummary,
    inferred_accent: accent,
    source: 'heuristic_fallback',
    menu_image_count: menuImageUrls.length,
    scene_image_count: sceneImageUrls.length,
  };

  return { template, confidence, styleProfile };
}

function reviewThreshold(): number {
  const raw = Number(process.env.LOCAL_SHOP_TEMPLATE_REVIEW_THRESHOLD ?? '0.72');
  if (!Number.isFinite(raw) || raw <= 0 || raw >= 1) return 0.72;
  return raw;
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

async function callVisionModel(params: {
  baseUrl: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  imageUrls: string[];
  jsonObjectMode: boolean;
}): Promise<string> {
  const url = chatCompletionsUrl(params.baseUrl);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  headers.Authorization = `Bearer ${params.apiKey.trim()}`;
  const body: Record<string, unknown> = {
    model: params.model,
    temperature: 0.2,
    max_tokens: 2500,
    messages: [
      { role: 'system', content: params.systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: params.userPrompt },
          ...params.imageUrls.map((imageUrl) => ({
            type: 'image_url',
            image_url: { url: imageUrl },
          })),
        ],
      },
    ],
  };
  if (params.jsonObjectMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`vision model ${response.status}: ${text.slice(0, 400)}`);
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error('vision model returned empty content');
  return content;
}

function parseVisionDraft(content: string): { templateJson: unknown; styleProfile: unknown; confidence: number } {
  const clean = stripMarkdownFence(content);
  const parsed = JSON.parse(clean) as Record<string, unknown>;
  const confidenceRaw = Number(parsed.confidence ?? 0.55);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0, Math.min(1, confidenceRaw))
    : 0.55;
  return {
    templateJson: parsed.template_json ?? parsed.template ?? {},
    styleProfile: parsed.style_profile ?? {},
    confidence,
  };
}

function buildVisionPrompts(spot: SpotRow) {
  const systemPrompt = `You are a Korean/Thai local-shop branding assistant.
Given menu board and shop atmosphere images, produce a concise minihome template draft.
Output JSON only.
Never invent unsafe claims. Keep copy practical, non-generic, and human sounding.
Return fields:
{
  "template_json": {
    "minihome_intro": "string|null",
    "minihome_theme": { "accent"?: string, "wallpaper"?: string, "room_skin"?: string, "bgm_title"?: string, "bgm_url"?: string },
    "minihome_layout_modules": ["intro","menu","photos","line"],
    "minihome_menu": [{ "name":"", "price":"", "description":"", "image_url":"", "sort_order":0 }],
    "recommendations": {
      "concept_summary":"string",
      "tone_keywords":["string"],
      "primary_cta":"string"
    }
  },
  "style_profile": { "vibe":"", "palette":[], "evidence":[] },
  "confidence": 0.0
}`;
  const userPrompt = [
    `Shop name: ${spot.name}`,
    `Category: ${spot.category}`,
    `Description: ${spot.description ?? ''}`,
    '',
    'Use menu images to infer menu/prices, and scene images to infer tone/palette.',
    'If text is unclear, keep uncertain price as "문의" and add short caution in intro tone.',
    'Prefer realistic CTA for local customers.',
  ].join('\n');
  return { systemPrompt, userPrompt };
}

async function tryVisionDraft(
  spot: SpotRow,
  assets: MenuAssetRow[],
  heuristic: { template: LocalSpotTemplateJson; styleProfile: Record<string, unknown>; confidence: number },
): Promise<VisionDraftResult | null> {
  const provider = normalizeProvider();
  if (provider === 'heuristic') return null;
  const { allImageUrls } = splitImageSources(spot, assets);
  if (allImageUrls.length === 0) return null;

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const openaiModel = process.env.LOCAL_SHOP_TEMPLATE_OPENAI_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiModel = process.env.LOCAL_SHOP_TEMPLATE_GEMINI_MODEL?.trim() || process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';
  const geminiBase = process.env.GEMINI_OPENAI_BASE_URL?.trim() || 'https://generativelanguage.googleapis.com/v1beta/openai';

  const { systemPrompt, userPrompt } = buildVisionPrompts(spot);
  const imageUrls = allImageUrls.slice(0, 6);

  const runOpenAi = async (): Promise<VisionDraftResult> => {
    if (!openaiKey) throw new Error('OPENAI_API_KEY missing');
    const content = await callVisionModel({
      baseUrl: 'https://api.openai.com/v1',
      model: openaiModel,
      apiKey: openaiKey,
      systemPrompt,
      userPrompt,
      imageUrls,
      jsonObjectMode: true,
    });
    const parsed = parseVisionDraft(content);
    const validated = validateTemplateJson(parsed.templateJson);
    if (!validated.ok) throw new Error(`vision template validation failed: ${validated.errors.join(', ')}`);
    return {
      template: validated.data,
      confidence: Math.max(heuristic.confidence, parsed.confidence),
      styleProfile:
        parsed.styleProfile && typeof parsed.styleProfile === 'object' && !Array.isArray(parsed.styleProfile)
          ? (parsed.styleProfile as Record<string, unknown>)
          : {},
      source: 'vision_openai',
    };
  };

  const runGemini = async (): Promise<VisionDraftResult> => {
    if (!geminiKey) throw new Error('GEMINI_API_KEY missing');
    const content = await callVisionModel({
      baseUrl: geminiBase,
      model: geminiModel,
      apiKey: geminiKey,
      systemPrompt,
      userPrompt,
      imageUrls,
      jsonObjectMode: false,
    });
    const parsed = parseVisionDraft(content);
    const validated = validateTemplateJson(parsed.templateJson);
    if (!validated.ok) throw new Error(`vision template validation failed: ${validated.errors.join(', ')}`);
    return {
      template: validated.data,
      confidence: Math.max(heuristic.confidence, parsed.confidence),
      styleProfile:
        parsed.styleProfile && typeof parsed.styleProfile === 'object' && !Array.isArray(parsed.styleProfile)
          ? (parsed.styleProfile as Record<string, unknown>)
          : {},
      source: 'vision_gemini',
    };
  };

  if (provider === 'openai') return runOpenAi();
  if (provider === 'gemini') return runGemini();

  if (openaiKey) {
    try {
      return await runOpenAi();
    } catch {
      if (geminiKey) return runGemini();
      throw new Error('vision draft generation failed for openai');
    }
  }
  if (geminiKey) return runGemini();
  return null;
}

async function logAudit(params: {
  localSpotId: string;
  draftId?: string | null;
  action: 'create_draft' | 'pipeline_error';
  payload?: Record<string, unknown>;
}) {
  const admin = createServiceRoleClient();
  await admin.from('local_spot_template_audits').insert({
    local_spot_id: params.localSpotId,
    draft_id: params.draftId ?? null,
    action: params.action,
    payload: params.payload ?? {},
  });
}

export async function runLocalShopTemplatePipeline(limit = 12): Promise<PipelineResult> {
  const admin = createServiceRoleClient();
  const cap = Math.max(1, Math.min(limit, 50));
  const { data: assets, error } = await admin
    .from('local_spot_menu_assets')
    .select('id, local_spot_id, asset_type, status, public_url, storage_path')
    .in('status', ['uploaded', 'queued'])
    .order('created_at', { ascending: true })
    .limit(cap);

  if (error) {
    throw new Error(`[template-pipeline] assets load failed: ${error.message}`);
  }

  const rows = (assets ?? []) as MenuAssetRow[];
  if (rows.length === 0) return { picked: 0, processed: 0, failed: 0 };

  const grouped = new Map<string, MenuAssetRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.local_spot_id) ?? [];
    list.push(row);
    grouped.set(row.local_spot_id, list);
  }

  let processed = 0;
  let failed = 0;
  const threshold = reviewThreshold();

  for (const [spotId, spotAssets] of grouped) {
    const assetIds = spotAssets.map((a) => a.id);
    try {
      await admin.from('local_spot_menu_assets').update({ status: 'processing' }).in('id', assetIds);

      const { data: spot, error: spotErr } = await admin
        .from('local_spots')
        .select(
          'id, name, category, description, minihome_intro, minihome_theme, minihome_menu, minihome_layout_modules, photo_urls',
        )
        .eq('id', spotId)
        .maybeSingle();

      if (spotErr || !spot) {
        throw new Error(spotErr?.message ?? 'local_spot not found');
      }

      const heuristic = buildHeuristicTemplate(spot as SpotRow, spotAssets);
      let generated: VisionDraftResult = {
        template: heuristic.template,
        styleProfile: heuristic.styleProfile,
        confidence: heuristic.confidence,
        source: 'heuristic_fallback',
      };

      try {
        const vision = await tryVisionDraft(spot as SpotRow, spotAssets, heuristic);
        if (vision) generated = vision;
      } catch {
        // Keep heuristic fallback; source remains heuristic_fallback.
      }

      const validated = validateTemplateJson(generated.template);
      if (!validated.ok) {
        throw new Error(`template validation failed: ${validated.errors.join(', ')}`);
      }

      const queueReason =
        generated.confidence < threshold ? 'low_confidence_manual_recheck' : 'manual_review';

      const { data: insertedDraft, error: insErr } = await admin
        .from('local_spot_template_drafts')
        .insert({
          local_spot_id: spotId,
          source_asset_ids: assetIds,
          style_profile_json: generated.styleProfile,
          template_json: validated.data,
          confidence: generated.confidence,
          status: 'draft',
          pipeline_meta: {
            source_asset_types: spotAssets.map((asset) => asset.asset_type),
            queue_reason: queueReason,
            review_threshold: threshold,
            generation_source: generated.source,
          },
        })
        .select('id')
        .single();

      if (insErr || !insertedDraft?.id) {
        throw new Error(insErr?.message ?? 'draft insert failed');
      }

      await admin
        .from('local_spot_menu_assets')
        .update({
          status: 'processed',
          extracted_menu: validated.data.minihome_menu,
          style_profile: generated.styleProfile,
          pipeline_meta: {
            generated_confidence: generated.confidence,
            queue_reason: queueReason,
            source: 'local_shop_template_pipeline',
            generation_source: generated.source,
          },
          processed_at: new Date().toISOString(),
          error_message: null,
        })
        .in('id', assetIds);

      await logAudit({
        localSpotId: spotId,
        draftId: insertedDraft.id,
        action: 'create_draft',
        payload: {
          asset_ids: assetIds,
          confidence: generated.confidence,
          queue_reason: queueReason,
          generation_source: generated.source,
        },
      });
      processed += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await admin
        .from('local_spot_menu_assets')
        .update({
          status: 'failed',
          error_message: message.slice(0, 500),
          processed_at: new Date().toISOString(),
        })
        .in('id', assetIds);
      await logAudit({
        localSpotId: spotId,
        action: 'pipeline_error',
        payload: { asset_ids: assetIds, error: message },
      });
      failed += 1;
    }
  }

  return { picked: rows.length, processed, failed };
}
