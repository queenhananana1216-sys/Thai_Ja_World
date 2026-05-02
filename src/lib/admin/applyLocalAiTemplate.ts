import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { parsePriceToThb } from '@/lib/local/parseMenuPriceThb';
import { parseVisionMenuItems, type VisionMenuItem } from '@/lib/admin/generateLocalTemplateFromVision';

export type VisionApplyPayload = {
  vibe_summary: string;
  vibe_tags: string[];
  selected_skin_basic_id: string;
  selected_skin_special_id: string | null;
  selected_bgm_id: string;
  /** 비전 JSON 또는 레거시 `{ name, price }` 혼합 — 적용 시 4개국어로 보정 */
  menu_items: unknown[];
  notes: string;
};

function isHexColor(s: string | null | undefined): s is string {
  if (!s || typeof s !== 'string') return false;
  return /^#[0-9a-fA-F]{3,8}$/.test(s.trim());
}

export async function applyLocalAiTemplate(params: {
  localSpotId: string;
  vision: VisionApplyPayload;
}): Promise<{ menusInserted: number }> {
  const admin = createServiceRoleClient();
  const spotId = params.localSpotId.trim();
  if (!spotId) throw new Error('invalid_local_spot_id');

  const { data: spot, error: spotErr } = await admin.from('local_spots').select('id').eq('id', spotId).maybeSingle();
  if (spotErr || !spot) throw new Error('local_spot_not_found');

  const ids = [
    params.vision.selected_skin_basic_id,
    params.vision.selected_skin_special_id,
    params.vision.selected_bgm_id,
  ].filter(Boolean) as string[];

  const { data: assets, error: assetErr } = await admin
    .from('decoration_assets')
    .select('id, type, name, color_code, audio_embed_url')
    .in('id', ids);
  if (assetErr) throw new Error(assetErr.message);

  const byId = new Map((assets ?? []).map((r) => [String((r as { id: string }).id), r as Record<string, unknown>]));

  const basic = byId.get(params.vision.selected_skin_basic_id);
  const special = params.vision.selected_skin_special_id ? byId.get(params.vision.selected_skin_special_id) : null;
  const bgm = byId.get(params.vision.selected_bgm_id);

  if (!basic || String(basic.type) !== 'skin_basic') throw new Error('skin_basic_asset_missing');
  if (!bgm || String(bgm.type) !== 'bgm') throw new Error('bgm_asset_missing');
  if (params.vision.selected_skin_special_id) {
    const sp = byId.get(params.vision.selected_skin_special_id);
    if (!sp || String(sp.type) !== 'skin_special') throw new Error('skin_special_asset_missing');
  }

  const bgHex = isHexColor(basic.color_code as string) ? (basic.color_code as string).trim() : '#0b0f19';
  const accentHex =
    special && isHexColor(special.color_code as string)
      ? (special.color_code as string).trim()
      : isHexColor(basic.color_code as string)
        ? (basic.color_code as string).trim()
        : '#a855f7';

  const embedRaw = typeof bgm.audio_embed_url === 'string' ? bgm.audio_embed_url.trim() : '';
  const minihome_bgm_url = embedRaw || null;

  const theme = {
    accent: accentHex,
    menu_board_bg: bgHex,
    ai_decoration: {
      skin_basic_id: params.vision.selected_skin_basic_id,
      skin_special_id: params.vision.selected_skin_special_id,
      bgm_id: params.vision.selected_bgm_id,
    },
  };

  const menuItems = parseVisionMenuItems(params.vision.menu_items);

  function primaryDbName(m: VisionMenuItem): string {
    const pick = m.name_ko || m.name_th || m.name_en || m.name_zh;
    return pick.trim().slice(0, 200);
  }

  const intro = params.vision.vibe_summary.trim().slice(0, 2000);
  const legacyMenu = menuItems.map((m, idx) => ({
    name: primaryDbName(m),
    name_ko: m.name_ko,
    name_th: m.name_th,
    name_en: m.name_en,
    name_zh: m.name_zh,
    price: m.price.trim().slice(0, 80),
    description: '',
    image_url: '',
    sort_order: idx,
  }));

  const { error: upSpotErr } = await admin
    .from('local_spots')
    .update({
      minihome_theme: theme,
      minihome_bgm_url: minihome_bgm_url,
      minihome_intro: intro.length > 0 ? intro : null,
      minihome_menu: legacyMenu,
    })
    .eq('id', spotId);
  if (upSpotErr) throw new Error(upSpotErr.message);

  const { error: mhErr } = await admin.from('local_minihomes').upsert(
    {
      local_spot_id: spotId,
      decoration_skin_basic_id: params.vision.selected_skin_basic_id,
      decoration_skin_special_id: params.vision.selected_skin_special_id,
      decoration_bgm_id: params.vision.selected_bgm_id,
      vibe_summary: params.vision.vibe_summary.trim().slice(0, 4000) || null,
      vibe_tags: params.vision.vibe_tags.filter(Boolean),
      ai_notes: params.vision.notes.trim().slice(0, 4000) || null,
    },
    { onConflict: 'local_spot_id' },
  );
  if (mhErr) throw new Error(mhErr.message);

  const { error: delErr } = await admin.from('local_menus').delete().eq('local_spot_id', spotId);
  if (delErr) throw new Error(delErr.message);

  const rows = menuItems.map((m, idx) => ({
    local_spot_id: spotId,
    name: primaryDbName(m),
    name_i18n: {
      ko: m.name_ko,
      th: m.name_th,
      en: m.name_en,
      zh: m.name_zh,
    },
    description: null as string | null,
    price_thb: parsePriceToThb(m.price),
    image_url: null as string | null,
    is_sold_out: false,
    is_special: false,
    sort_order: idx,
  }));

  if (rows.length > 0) {
    const { error: insErr } = await admin.from('local_menus').insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  return { menusInserted: rows.length };
}
