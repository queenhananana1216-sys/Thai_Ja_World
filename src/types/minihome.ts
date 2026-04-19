export type MinihomeTheme = {
  accent?: string;
  wallpaper?: string;
  /** 스타일 상점 미니미(이모지 등) */
  minimi?: string;
};

export type MinihomePublicRow = {
  owner_id: string;
  public_slug: string;
  title: string | null;
  tagline: string | null;
  intro_body: string | null;
  theme: unknown;
  layout_modules: unknown;
  is_public: boolean;
};

export const DEFAULT_MINIHOME_MODULES = ['intro', 'guestbook', 'photos'] as const;

export function parseLayoutModules(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_MINIHOME_MODULES];
  const ids = raw.filter((x): x is string => typeof x === 'string' && x.length > 0);
  return ids.length > 0 ? ids : [...DEFAULT_MINIHOME_MODULES];
}

export function parseTheme(raw: unknown): MinihomeTheme {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const accent = o.accent;
  const wallpaper = o.wallpaper;
  const minimi = o.minimi;
  return {
    accent: typeof accent === 'string' ? accent : undefined,
    wallpaper: typeof wallpaper === 'string' ? wallpaper : undefined,
    minimi: typeof minimi === 'string' && minimi.trim() ? minimi.trim().slice(0, 32) : undefined,
  };
}

export function safeAccent(hex: string | undefined, fallback: string): string {
  if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  return fallback;
}
