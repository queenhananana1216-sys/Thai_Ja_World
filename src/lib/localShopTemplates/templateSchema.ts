export type LocalSpotTemplateJson = {
  minihome_intro: string | null;
  minihome_theme: Record<string, unknown>;
  minihome_layout_modules: string[];
  minihome_menu: Array<{
    name: string;
    price: string;
    description: string;
    image_url: string;
    sort_order: number;
  }>;
  recommendations: {
    concept_summary: string;
    tone_keywords: string[];
    primary_cta: string;
  };
};

export type TemplateValidationResult =
  | { ok: true; data: LocalSpotTemplateJson }
  | { ok: false; errors: string[] };

function asPlainObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => asString(item)).filter(Boolean);
}

function sanitizeTheme(input: unknown): Record<string, unknown> {
  const obj = asPlainObject(input);
  if (!obj) return {};
  const out: Record<string, unknown> = {};
  if (typeof obj.accent === 'string' && obj.accent.trim()) out.accent = obj.accent.trim();
  if (typeof obj.wallpaper === 'string' && obj.wallpaper.trim()) out.wallpaper = obj.wallpaper.trim();
  if (typeof obj.room_skin === 'string' && obj.room_skin.trim()) out.room_skin = obj.room_skin.trim();
  if (typeof obj.bgm_url === 'string' && obj.bgm_url.trim()) out.bgm_url = obj.bgm_url.trim();
  if (typeof obj.bgm_title === 'string' && obj.bgm_title.trim()) out.bgm_title = obj.bgm_title.trim();
  return out;
}

function sanitizeMenu(input: unknown): LocalSpotTemplateJson['minihome_menu'] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw, idx) => {
      const obj = asPlainObject(raw);
      if (!obj) return null;
      const name = asString(obj.name);
      if (!name) return null;
      const price = asString(obj.price);
      const description = asString(obj.description);
      const imageUrl = asString(obj.image_url);
      const sortOrderRaw = Number(obj.sort_order);
      return {
        name,
        price,
        description,
        image_url: imageUrl,
        sort_order: Number.isFinite(sortOrderRaw) ? Math.floor(sortOrderRaw) : idx,
      };
    })
    .filter((x): x is LocalSpotTemplateJson['minihome_menu'][number] => x !== null)
    .slice(0, 40);
}

export function validateTemplateJson(raw: unknown): TemplateValidationResult {
  const obj = asPlainObject(raw);
  if (!obj) return { ok: false, errors: ['template_json 은 객체여야 합니다.'] };

  const errors: string[] = [];
  const introRaw = obj.minihome_intro;
  const intro = introRaw === null ? null : asString(introRaw);
  const theme = sanitizeTheme(obj.minihome_theme);
  const layout = asStringArray(obj.minihome_layout_modules);
  const menu = sanitizeMenu(obj.minihome_menu);
  const recObj = asPlainObject(obj.recommendations) ?? {};
  const rec = {
    concept_summary: asString(recObj.concept_summary),
    tone_keywords: asStringArray(recObj.tone_keywords).slice(0, 8),
    primary_cta: asString(recObj.primary_cta),
  };

  if (intro !== null && intro.length > 4000) errors.push('minihome_intro 길이가 너무 깁니다.');
  if (layout.length === 0) errors.push('minihome_layout_modules 는 최소 1개 이상 필요합니다.');
  if (menu.length === 0) errors.push('minihome_menu 는 최소 1개 이상 필요합니다.');
  if (!rec.concept_summary) errors.push('recommendations.concept_summary 가 비어 있습니다.');

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      minihome_intro: intro,
      minihome_theme: theme,
      minihome_layout_modules: layout,
      minihome_menu: menu,
      recommendations: rec,
    },
  };
}
