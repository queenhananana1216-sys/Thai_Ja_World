'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import SocialAuthButtons from '@app/auth/_components/SocialAuthButtons';
import QRCodeGenerator from '@/components/local/QRCodeGenerator';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';

export type MenuLang = 'ko' | 'th' | 'en' | 'zh';

export type LocalMenuRow = {
  id: string;
  local_spot_id: string;
  name: string;
  /** Vision 파이프라인·DB `name_i18n` — 로케일별 메뉴명 */
  name_i18n?: Record<string, unknown> | null;
  description: string | null;
  description_i18n?: Record<string, unknown> | null;
  price_thb: number | string | null;
  image_url: string | null;
  is_sold_out: boolean;
  is_special: boolean;
  sort_order: number;
};

type SpotLite = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_profile_id: string | null;
  minihome_theme: unknown;
  minihome_menu: unknown;
  minihome_bgm_url?: string | null;
  minihome_intro?: string | null;
  is_published: boolean;
};

type QuadStrings = Record<MenuLang, string>;

const MENU_IMG_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MENU_IMG_MAX_BYTES = 5 * 1024 * 1024;

function bgmAutoplaySrc(raw: string | null | undefined): string | null {
  const u = raw?.trim();
  if (!u) return null;
  try {
    const url = new URL(u);
    if (url.hostname.includes('youtube.com')) {
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('mute', '1');
      url.searchParams.set('playsinline', '1');
    }
    return url.toString();
  } catch {
    return u;
  }
}

function themeRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

type LegacyMenuItem = {
  name: string;
  price: string;
  description?: string;
  image_url?: string;
  name_i18n?: Partial<Record<MenuLang, string>>;
};

function trimLocaleMap(o: Record<string, unknown>): Partial<Record<MenuLang, string>> | undefined {
  const out: Partial<Record<MenuLang, string>> = {};
  for (const k of ['ko', 'th', 'en', 'zh'] as MenuLang[]) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

function legacyMenuItems(raw: unknown): LegacyMenuItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((o) => {
      const name = String(o!.name ?? '').trim() || 'Menu';
      const nk = typeof o!.name_ko === 'string' ? o!.name_ko.trim() : '';
      const nt = typeof o!.name_th === 'string' ? o!.name_th.trim() : '';
      const ne = typeof o!.name_en === 'string' ? o!.name_en.trim() : '';
      const nz = typeof o!.name_zh === 'string' ? o!.name_zh.trim() : '';
      const name_i18n: Partial<Record<MenuLang, string>> | undefined =
        nk || nt || ne || nz
          ? {
              ...(nk ? { ko: nk } : {}),
              ...(nt ? { th: nt } : {}),
              ...(ne ? { en: ne } : {}),
              ...(nz ? { zh: nz } : {}),
            }
          : undefined;
      return {
        name,
        price: String(o!.price ?? ''),
        description: o!.description != null ? String(o!.description) : undefined,
        image_url: o!.image_url != null ? String(o!.image_url) : undefined,
        name_i18n,
      };
    })
    .filter((x) => x.name.length > 0);
}

function nameI18nFromRow(raw: LocalMenuRow['name_i18n']): Partial<Record<MenuLang, string>> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return trimLocaleMap(raw as Record<string, unknown>);
}

function descriptionI18nFromRow(
  raw: LocalMenuRow['description_i18n'],
): Partial<Record<MenuLang, string>> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  return trimLocaleMap(raw as Record<string, unknown>);
}

function dishLabel(row: LocalMenuRow, lang: MenuLang): string {
  const map = nameI18nFromRow(row.name_i18n);
  const hit = map?.[lang];
  if (hit) return hit;
  return row.name;
}

function dishDescription(row: LocalMenuRow, lang: MenuLang): string | null {
  const map = descriptionI18nFromRow(row.description_i18n);
  const hit = map?.[lang]?.trim();
  if (hit) return hit;
  const fb = row.description?.trim();
  return fb || null;
}

function legacyDishLabel(it: LegacyMenuItem, lang: MenuLang): string {
  const hit = it.name_i18n?.[lang];
  if (hit) return hit;
  return it.name;
}

function emptyQuad(): QuadStrings {
  return { ko: '', th: '', en: '', zh: '' };
}

function extFromMime(ct: string): string {
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return 'bin';
}

function localeAria(lang: MenuLang): string {
  switch (lang) {
    case 'ko':
      return '한국어';
    case 'th':
      return 'ไทย';
    case 'en':
      return 'English';
    case 'zh':
      return '中文';
    default:
      return lang;
  }
}

function flagEmoji(lang: MenuLang): string {
  switch (lang) {
    case 'ko':
      return '🇰🇷';
    case 'th':
      return '🇹🇭';
    case 'en':
      return '🇺🇸';
    case 'zh':
      return '🇨🇳';
    default:
      return '';
  }
}

function primaryNameFromQuad(q: QuadStrings): string {
  const order: MenuLang[] = ['ko', 'th', 'en', 'zh'];
  for (const k of order) {
    const t = q[k].trim();
    if (t) return t;
  }
  return '';
}

function buildI18nPayload(q: QuadStrings): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const k of ['ko', 'th', 'en', 'zh'] as MenuLang[]) {
    const t = q[k].trim();
    if (t) out[k] = t;
  }
  return Object.keys(out).length ? out : null;
}

function canonicalDescription(q: QuadStrings): string | null {
  const order: MenuLang[] = ['ko', 'th', 'en', 'zh'];
  for (const k of order) {
    const t = q[k].trim();
    if (t) return t;
  }
  return null;
}

const MENU_SECTION_COPY: Record<
  MenuLang,
  { kicker: string; sectionTitle: string; sectionSub: string; soldOut: string; empty: string; legacyHint: string }
> = {
  ko: {
    kicker: 'Digital Menu',
    sectionTitle: '메뉴 · 시술',
    sectionSub: '매장 테이블 QR로 접속한 화면에 맞춘 세로 레이아웃입니다.',
    soldOut: '품절',
    empty: '등록된 메뉴가 없습니다.',
    legacyHint: '아직 DB 메뉴가 없어 예전 미니홈 JSON 메뉴만 표시합니다.',
  },
  th: {
    kicker: 'Digital Menu',
    sectionTitle: 'เมนู · บริการ',
    sectionSub: 'เลย์เอาต์แนวตั้งสำหรับ QR บนโต๊ะ',
    soldOut: 'หมด',
    empty: 'ยังไม่มีเมนู',
    legacyHint: 'ยังไม่มีเมนูในระบบ — แสดงเมนู JSON เดิมเท่านั้น',
  },
  en: {
    kicker: 'Digital Menu',
    sectionTitle: 'Menu · Services',
    sectionSub: 'Optimized for table QR — vertical layout.',
    soldOut: 'Sold out',
    empty: 'No menu items yet.',
    legacyHint: 'Showing legacy minihome JSON only — DB menu not synced yet.',
  },
  zh: {
    kicker: 'Digital Menu',
    sectionTitle: '菜单 · 项目',
    sectionSub: '针对桌面二维码扫码的纵向排版。',
    soldOut: '售罄',
    empty: '暂无菜品。',
    legacyHint: '暂无数据库菜单，仅显示旧版 JSON。',
  },
};

function formatThb(n: number | string | null): string {
  const num = typeof n === 'number' ? n : Number(String(n ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(num)) return '—';
  return `${num.toFixed(0)} THB`;
}

function glassPanel(extra = '') {
  return `rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150 ${extra}`;
}

function menuCardShell(extra = '') {
  return `overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.07] shadow-[0_20px_56px_rgba(0,0,0,0.5)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/[0.06] transition hover:ring-white/12 ${extra}`;
}

export default function LocalDigitalMenuClient(props: {
  spot: SpotLite;
  menus: LocalMenuRow[];
  canonicalMenuUrl: string;
  isOwner: boolean;
  viewerId: string | null;
}) {
  const { d } = useClientLocaleDictionary();
  const { spot, canonicalMenuUrl, isOwner, viewerId } = props;
  const [menus, setMenus] = useState<LocalMenuRow[]>(props.menus);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [visitAt, setVisitAt] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState('');
  const [orderBusy, setOrderBusy] = useState(false);
  const [menuLang, setMenuLang] = useState<MenuLang>('ko');
  const [guestContactPhone, setGuestContactPhone] = useState('');
  const theme = useMemo(() => themeRecord(spot.minihome_theme), [spot.minihome_theme]);
  const accent =
    typeof theme.accent === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(theme.accent.trim())
      ? theme.accent.trim()
      : '#a855f7';
  const pageBg =
    typeof theme.menu_board_bg === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(theme.menu_board_bg.trim())
      ? theme.menu_board_bg.trim()
      : '#0b0f19';

  const [accentDraft, setAccentDraft] = useState(accent);
  const [bgDraft, setBgDraft] = useState(pageBg);

  const legacy = useMemo(() => legacyMenuItems(spot.minihome_menu), [spot.minihome_menu]);
  const showLegacyFallback = menus.length === 0 && legacy.length > 0;

  const sb = useMemo(() => createBrowserClient(), []);

  const bgmSrc = useMemo(() => bgmAutoplaySrc(spot.minihome_bgm_url ?? null), [spot.minihome_bgm_url]);

  const [expandedMenuId, setExpandedMenuId] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [editNames, setEditNames] = useState<QuadStrings>(emptyQuad);
  const [editDescs, setEditDescs] = useState<QuadStrings>(emptyQuad);
  const [sourceLang, setSourceLang] = useState<MenuLang>('th');
  const [sourceName, setSourceName] = useState('');
  const [sourceDesc, setSourceDesc] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editSpecial, setEditSpecial] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetMenuId = useRef<string | null>(null);

  const [newDraftKey, setNewDraftKey] = useState(0);
  const [newNames, setNewNames] = useState<QuadStrings>(emptyQuad);
  const [newDescs, setNewDescs] = useState<QuadStrings>(emptyQuad);
  const [newSourceLang, setNewSourceLang] = useState<MenuLang>('th');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceDesc, setNewSourceDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newSpecial, setNewSpecial] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [newTranslating, setNewTranslating] = useState(false);
  const newFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loc = readLocaleCookie();
    if (loc === 'ko' || loc === 'th' || loc === 'en' || loc === 'zh') setMenuLang(loc);
  }, []);

  const mc = MENU_SECTION_COPY[menuLang];

  useEffect(() => {
    if (!orderOpen) return;
    const init: Record<string, number> = {};
    for (const m of menus) init[m.id] = 0;
    setQtyById(init);
    setOrderNotes('');
  }, [orderOpen, menus]);

  const notify = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const refreshMenus = useCallback(async () => {
    const { data, error } = await sb
      .from('local_menus')
      .select('*')
      .eq('local_spot_id', spot.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (!error && data) setMenus(data as LocalMenuRow[]);
  }, [sb, spot.id]);

  const hydrateEditorFromRow = useCallback((row: LocalMenuRow) => {
    const nMap = nameI18nFromRow(row.name_i18n);
    const dMap = descriptionI18nFromRow(row.description_i18n);
    const hasNameMap = nMap && Object.keys(nMap).length > 0;
    setEditNames({
      ko: (hasNameMap ? nMap?.ko : undefined)?.trim() || (!hasNameMap ? row.name.trim() : '') || '',
      th: nMap?.th?.trim() ?? '',
      en: nMap?.en?.trim() ?? '',
      zh: nMap?.zh?.trim() ?? '',
    });
    const hasDescMap = dMap && Object.keys(dMap).length > 0;
    setEditDescs({
      ko: (hasDescMap ? dMap?.ko : undefined)?.trim() || (!hasDescMap ? row.description?.trim() : '') || '',
      th: dMap?.th?.trim() ?? '',
      en: dMap?.en?.trim() ?? '',
      zh: dMap?.zh?.trim() ?? '',
    });
    setEditPrice(String(row.price_thb ?? ''));
    setEditSpecial(row.is_special);
    setSourceName('');
    setSourceDesc('');
  }, []);

  useEffect(() => {
    if (!expandedMenuId) return;
    const row = menus.find((m) => m.id === expandedMenuId);
    if (row) hydrateEditorFromRow(row);
    // 편집 중 menus 갱신(예: 사진 업로드)으로 폼이 리셋되지 않도록 — 행을 펼칠 때만 동기화
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [expandedMenuId]);

  const saveTheme = async () => {
    if (!isOwner) return;
    setBusy(true);
    const nextTheme = {
      ...theme,
      accent: accentDraft,
      menu_board_bg: bgDraft,
    };
    const { error } = await sb.from('local_spots').update({ minihome_theme: nextTheme }).eq('id', spot.id);
    setBusy(false);
    if (error) {
      notify(error.message);
      return;
    }
    notify('테마 색상을 저장했습니다.');
  };

  const toggleSoldOut = async (row: LocalMenuRow) => {
    if (!isOwner) return;
    setBusy(true);
    const { error } = await sb.from('local_menus').update({ is_sold_out: !row.is_sold_out }).eq('id', row.id);
    setBusy(false);
    if (error) notify(error.message);
    else {
      setMenus((prev) => prev.map((m) => (m.id === row.id ? { ...m, is_sold_out: !m.is_sold_out } : m)));
      notify(row.is_sold_out ? '판매 재개' : '품절 처리했습니다.');
    }
  };

  const runTranslateExisting = useCallback(async () => {
    const src = sourceName.trim();
    if (!src) {
      notify('원문 메뉴명을 입력한 뒤, 입력칸에서 포커스를 빼면 자동 번역됩니다.');
      return;
    }
    setTranslating(true);
    try {
      const res = await fetch('/api/admin/translate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localSpotId: spot.id,
          name: src,
          description: sourceDesc.trim(),
          sourceLocale: sourceLang,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; name?: QuadStrings; description?: QuadStrings };
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : '번역 실패');
      if (data.name && data.description) {
        setEditNames(data.name);
        setEditDescs(data.description);
        notify('✨ AI가 4개 언어로 메뉴명·설명을 채웠습니다.');
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : '번역 실패');
    } finally {
      setTranslating(false);
    }
  }, [notify, sourceDesc, sourceLang, sourceName, spot.id]);

  const runTranslateNew = useCallback(async () => {
    const src = newSourceName.trim();
    if (!src) {
      notify('원문 메뉴명을 입력한 뒤, 입력칸에서 포커스를 빼면 자동 번역됩니다.');
      return;
    }
    setNewTranslating(true);
    try {
      const res = await fetch('/api/admin/translate-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localSpotId: spot.id,
          name: src,
          description: newSourceDesc.trim(),
          sourceLocale: newSourceLang,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; name?: QuadStrings; description?: QuadStrings };
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : '번역 실패');
      if (data.name && data.description) {
        setNewNames(data.name);
        setNewDescs(data.description);
        notify('✨ AI가 4개 언어로 메뉴명·설명을 채웠습니다.');
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : '번역 실패');
    } finally {
      setNewTranslating(false);
    }
  }, [newSourceDesc, newSourceLang, newSourceName, notify, spot.id]);

  const saveMenuRow = async (row: LocalMenuRow) => {
    if (!isOwner) return;
    const primary = primaryNameFromQuad(editNames);
    if (!primary) {
      notify('메뉴명을 최소 한 언어 이상 입력해 주세요.');
      return;
    }
    const priceNum = Number(String(editPrice).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      notify('가격(THB)을 숫자로 입력해 주세요.');
      return;
    }
    const name_i18n = buildI18nPayload(editNames);
    const description_i18n = buildI18nPayload(editDescs);
    const description = canonicalDescription(editDescs);
    setBusy(true);
    const { error } = await sb
      .from('local_menus')
      .update({
        name: primary,
        name_i18n,
        description,
        description_i18n,
        price_thb: priceNum,
        is_special: editSpecial,
      })
      .eq('id', row.id);
    setBusy(false);
    if (error) {
      notify(error.message);
      return;
    }
    notify('메뉴를 저장했습니다.');
    await refreshMenus();
    setExpandedMenuId(null);
  };

  const insertNewMenu = async () => {
    if (!isOwner) return;
    const primary = primaryNameFromQuad(newNames);
    if (!primary) {
      notify('메뉴명을 최소 한 언어 이상 입력해 주세요.');
      return;
    }
    const priceNum = Number(String(newPrice).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      notify('가격(THB)을 숫자로 입력해 주세요.');
      return;
    }
    const name_i18n = buildI18nPayload(newNames);
    const description_i18n = buildI18nPayload(newDescs);
    const description = canonicalDescription(newDescs);
    setBusy(true);
    const nextOrder = menus.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;
    const { error } = await sb.from('local_menus').insert({
      local_spot_id: spot.id,
      name: primary,
      name_i18n,
      description,
      description_i18n,
      price_thb: priceNum,
      is_special: newSpecial,
      is_sold_out: false,
      sort_order: nextOrder,
      image_url: newImageUrl,
    });
    setBusy(false);
    if (error) {
      notify(error.message);
      return;
    }
    setNewNames(emptyQuad());
    setNewDescs(emptyQuad());
    setNewSourceName('');
    setNewSourceDesc('');
    setNewPrice('');
    setNewSpecial(true);
    setNewImageUrl(null);
    setNewDraftKey((k) => k + 1);
    await refreshMenus();
    notify('새 메뉴를 등록했습니다.');
  };

  const pickMenuImage = (row: LocalMenuRow) => {
    uploadTargetMenuId.current = row.id;
    fileInputRef.current?.click();
  };

  const onMenuImageSelected = async (list: FileList | null) => {
    const file = list?.item(0);
    const menuId = uploadTargetMenuId.current;
    uploadTargetMenuId.current = null;
    if (!file || !menuId || !viewerId) return;
    if (!MENU_IMG_TYPES.has(file.type)) {
      notify('JPEG, PNG, WebP, GIF만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MENU_IMG_MAX_BYTES) {
      notify('이미지는 5MB 이하만 가능합니다.');
      return;
    }
    setBusy(true);
    const path = `${viewerId}/shops/${spot.id}/menu-items/${menuId}/${crypto.randomUUID()}.${extFromMime(file.type)}`;
    const { error: upErr } = await sb.storage.from('local-spots').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) {
      setBusy(false);
      notify(upErr.message);
      return;
    }
    const { data: pub } = sb.storage.from('local-spots').getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: dbErr } = await sb.from('local_menus').update({ image_url: url }).eq('id', menuId);
    setBusy(false);
    if (dbErr) {
      notify(dbErr.message);
      return;
    }
    setMenus((prev) => prev.map((m) => (m.id === menuId ? { ...m, image_url: url } : m)));
    notify('📷 사진을 저장했습니다.');
  };

  const onNewMenuImageSelected = async (list: FileList | null) => {
    const file = list?.item(0);
    if (!file || !viewerId) return;
    if (!MENU_IMG_TYPES.has(file.type)) {
      notify('JPEG, PNG, WebP, GIF만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > MENU_IMG_MAX_BYTES) {
      notify('이미지는 5MB 이하만 가능합니다.');
      return;
    }
    setBusy(true);
    const path = `${viewerId}/shops/${spot.id}/menu-drafts/${newDraftKey}/${crypto.randomUUID()}.${extFromMime(file.type)}`;
    const { error: upErr } = await sb.storage.from('local-spots').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) {
      setBusy(false);
      notify(upErr.message);
      return;
    }
    const { data: pub } = sb.storage.from('local-spots').getPublicUrl(path);
    setBusy(false);
    setNewImageUrl(pub.publicUrl);
    notify('📷 사진이 첨부되었습니다. 메뉴 등록 시 함께 저장됩니다.');
  };

  const shellStyle = useMemo(
    (): CSSProperties => ({
      minHeight: '100vh',
      backgroundColor: bgDraft,
      backgroundImage: `radial-gradient(ellipse 120% 80% at 50% -20%, ${accentDraft}33, transparent 55%)`,
    }),
    [accentDraft, bgDraft],
  );

  const submitReservationOrder = async () => {
    if (!viewerId) return;
    if (!visitAt.trim()) {
      notify('방문 시간을 선택해 주세요.');
      return;
    }
    const items = menus
      .filter((m) => !m.is_sold_out && (qtyById[m.id] ?? 0) > 0)
      .map((m) => ({ menu_id: m.id, qty: Math.floor(qtyById[m.id] ?? 0) }));
    if (items.length === 0) {
      notify('주문할 메뉴 수량을 1개 이상 선택해 주세요.');
      return;
    }
    setOrderBusy(true);
    try {
      const res = await fetch('/api/local/minihome-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local_spot_id: spot.id,
          visit_at: new Date(visitAt).toISOString(),
          party_size: partySize,
          items,
          notes: orderNotes.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? '주문 실패');
      notify('예약·주문 요청이 접수되었습니다. 매장에서 확인 후 연락드릴 수 있습니다.');
      setOrderOpen(false);
    } catch (e) {
      notify(e instanceof Error ? e.message : '주문 실패');
    } finally {
      setOrderBusy(false);
    }
  };

  const langPicker = (
    <div
      className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/85"
      role="group"
      aria-label="Menu language"
    >
      {(['ko', 'th', 'en', 'zh'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setMenuLang(code)}
          aria-label={localeAria(code)}
          aria-pressed={menuLang === code}
          className={`flex min-h-[40px] min-w-[44px] items-center justify-center rounded-xl border px-2 py-2 text-lg transition ${
            menuLang === code
              ? 'border-white/45 bg-white/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
              : 'border-white/14 bg-black/25 text-white/80 hover:border-white/28 hover:bg-black/35'
          }`}
        >
          <span className="leading-none">{flagEmoji(code)}</span>
        </button>
      ))}
    </div>
  );

  const smartFieldsClass =
    'rounded-xl border border-white/14 bg-black/35 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-violet-500/35';

  return (
    <div style={shellStyle} className="pb-28 text-slate-50">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onMenuImageSelected(e.target.files)}
      />
      <input
        ref={newFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onNewMenuImageSelected(e.target.files)}
      />

      {bgmSrc ? (
        <iframe
          title="매장 BGM"
          src={bgmSrc}
          className="pointer-events-none fixed bottom-24 left-4 z-[35] h-[72px] w-[128px] rounded-lg opacity-35 shadow-lg ring-1 ring-white/15"
          allow="autoplay; encrypted-media; fullscreen"
        />
      ) : null}
      <header className={`sticky top-0 z-20 ${glassPanel('border-b border-white/10 px-4 py-4')}`}>
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          {langPicker}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">{mc.kicker}</p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-white" style={{ color: accentDraft }}>
                {spot.name}
              </h1>
              {spot.minihome_intro?.trim() ? (
                <p className="mt-2 text-sm leading-relaxed text-amber-100/90">{spot.minihome_intro}</p>
              ) : null}
              {spot.description?.trim() ? (
                <p className="mt-2 text-sm leading-relaxed text-white/75">{spot.description}</p>
              ) : null}
            </div>
            <Link
              href={`/local/${encodeURIComponent(spot.slug)}`}
              className="shrink-0 rounded-xl border border-white/15 bg-white/[0.07] px-3 py-2 text-[11px] font-semibold text-white no-underline hover:bg-white/10"
            >
              미니홈
            </Link>
          </div>
          {!viewerId ? (
            <p className="text-[11px] text-amber-200/90">
              주문·예약 연동은 로그인 후 이용할 수 있습니다. 지금은 메뉴 확인용입니다.
            </p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 pt-5">
        {toast ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-950/50 px-3 py-2 text-xs text-amber-50">{toast}</div>
        ) : null}

        {isOwner ? (
          <section className={glassPanel('p-4')}>
            <h2 className="text-sm font-bold text-white">광고주 · 테마 색</h2>
            <p className="mt-1 text-[11px] text-white/50">컨셉에 맞춰 포인트·배경색을 바꿀 수 있습니다.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-white/80">
                포인트
                <input
                  type="color"
                  value={accentDraft}
                  disabled={busy}
                  onChange={(e) => setAccentDraft(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-white/20 bg-transparent"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-white/80">
                배경
                <input
                  type="color"
                  value={bgDraft}
                  disabled={busy}
                  onChange={(e) => setBgDraft(e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-white/20 bg-transparent"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveTheme()}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
              >
                색 저장
              </button>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-sm font-bold text-white">스마트 메뉴 추가</h3>
              <p className="mt-1 text-[11px] text-white/50">
                원문 언어·메뉴명을 입력한 뒤 포커스를 빼면 AI가 4개 언어를 채웁니다. 세부 수정 후 등록하세요.
              </p>
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-white/55">원문 언어</span>
                  <select
                    value={newSourceLang}
                    disabled={busy || newTranslating}
                    onChange={(e) => setNewSourceLang(e.target.value as MenuLang)}
                    className={`${smartFieldsClass} max-w-[160px]`}
                  >
                    <option value="ko">한국어</option>
                    <option value="th">ไทย</option>
                    <option value="en">English</option>
                    <option value="zh">中文</option>
                  </select>
                </div>
                <input
                  value={newSourceName}
                  disabled={busy || newTranslating}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  onBlur={() => void runTranslateNew()}
                  placeholder="원문 메뉴명 (예: ส้มตำ)"
                  className={`${smartFieldsClass} w-full`}
                />
                <textarea
                  value={newSourceDesc}
                  disabled={busy || newTranslating}
                  onChange={(e) => setNewSourceDesc(e.target.value)}
                  onBlur={() => {
                    if (newSourceName.trim()) void runTranslateNew();
                  }}
                  placeholder="원문 설명 (선택)"
                  rows={2}
                  className={`${smartFieldsClass} w-full resize-none`}
                />
                {newTranslating ? (
                  <p className="text-[11px] text-violet-200/90">번역 중…</p>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  {(['ko', 'th', 'en', 'zh'] as const).map((lang) => (
                    <label key={`new-n-${lang}`} className="block text-[11px] text-white/60">
                      메뉴명 · {localeAria(lang)}
                      <input
                        value={newNames[lang]}
                        disabled={busy || newTranslating}
                        onChange={(e) => setNewNames((p) => ({ ...p, [lang]: e.target.value }))}
                        className={`${smartFieldsClass} mt-1 w-full`}
                      />
                    </label>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(['ko', 'th', 'en', 'zh'] as const).map((lang) => (
                    <label key={`new-d-${lang}`} className="block text-[11px] text-white/60">
                      설명 · {localeAria(lang)}
                      <textarea
                        value={newDescs[lang]}
                        disabled={busy || newTranslating}
                        onChange={(e) => setNewDescs((p) => ({ ...p, [lang]: e.target.value }))}
                        rows={2}
                        className={`${smartFieldsClass} mt-1 w-full resize-none`}
                      />
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-[11px] text-white/60">
                    가격 THB
                    <input
                      value={newPrice}
                      disabled={busy}
                      onChange={(e) => setNewPrice(e.target.value)}
                      inputMode="decimal"
                      placeholder="120"
                      className={`${smartFieldsClass} mt-1 w-28`}
                    />
                  </label>
                  <label className="flex items-center gap-2 pb-2 text-xs text-white/75">
                    <input type="checkbox" checked={newSpecial} onChange={(e) => setNewSpecial(e.target.checked)} />
                    스페셜
                  </label>
                  <button
                    type="button"
                    disabled={busy || !viewerId}
                    onClick={() => newFileRef.current?.click()}
                    className="rounded-xl border border-white/20 bg-white/[0.08] px-3 py-2 text-xs font-semibold text-white hover:bg-white/12 disabled:opacity-45"
                  >
                    📷 사진 업로드
                  </button>
                  {newImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={newImageUrl} alt="" className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/15" />
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void insertNewMenu()}
                    className="ml-auto rounded-xl px-4 py-2 text-xs font-bold text-black disabled:opacity-50"
                    style={{ backgroundColor: accentDraft }}
                  >
                    메뉴 등록
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className={glassPanel('overflow-hidden')}>
          <div className="border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md">
            <h2 className="text-sm font-bold text-white">{mc.sectionTitle}</h2>
            <p className="text-[11px] text-white/45">{mc.sectionSub}</p>
          </div>
          <div className="space-y-4 p-4">
            {menus.map((row) => {
              const desc = dishDescription(row, menuLang);
              const label = dishLabel(row, menuLang);
              const expanded = expandedMenuId === row.id;
              return (
                <article key={row.id} className={menuCardShell('flex flex-col sm:flex-row')}>
                  <div className="relative aspect-[5/4] w-full overflow-hidden rounded-t-2xl sm:aspect-auto sm:h-auto sm:w-[42%] sm:max-w-[220px] sm:shrink-0 sm:rounded-l-2xl sm:rounded-tr-none">
                    {row.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.image_url}
                        alt=""
                        className="h-full w-full object-cover sm:absolute sm:inset-0 sm:min-h-[148px]"
                      />
                    ) : (
                      <div
                        className="flex h-full min-h-[140px] items-center justify-center text-3xl font-black text-white/90 sm:min-h-[148px]"
                        style={{ background: `linear-gradient(145deg, ${accentDraft}55, rgba(0,0,0,0.45))` }}
                      >
                        {label.slice(0, 1)}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 rounded-none bg-gradient-to-t from-black/55 via-transparent to-black/10 sm:rounded-l-2xl" />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4 sm:py-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-snug text-white">
                          {label}
                          {row.is_special ? (
                            <span className="ml-2 inline-flex rounded-full bg-amber-400/22 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 ring-1 ring-amber-400/35">
                              Special
                            </span>
                          ) : null}
                        </p>
                        {desc ? (
                          <p className="mt-1.5 text-sm leading-relaxed text-white/68">{desc}</p>
                        ) : null}
                      </div>
                      <p
                        className={`shrink-0 text-base font-bold tabular-nums ${
                          row.is_sold_out ? 'text-rose-300 line-through' : 'text-sky-200'
                        }`}
                      >
                        {formatThb(row.price_thb)}
                      </p>
                    </div>
                    {row.is_sold_out ? (
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-300/90">{mc.soldOut}</p>
                    ) : null}

                    {isOwner ? (
                      <div className="mt-2 flex flex-wrap gap-2 border-t border-white/[0.08] pt-3">
                        <button
                          type="button"
                          disabled={busy || !viewerId}
                          onClick={() => pickMenuImage(row)}
                          className="rounded-full border border-white/18 bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/12 disabled:opacity-45"
                        >
                          📷 사진 업로드
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setExpandedMenuId(expanded ? null : row.id)}
                          className="rounded-full border border-white/18 bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/12"
                        >
                          {expanded ? '편집 닫기' : '✏️ 스마트 편집'}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void toggleSoldOut(row)}
                          className="rounded-full border border-white/18 bg-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/12 disabled:opacity-50"
                        >
                          {row.is_sold_out ? '재입고' : '품절'}
                        </button>
                      </div>
                    ) : null}

                    {isOwner && expanded ? (
                      <div className="mt-3 space-y-3 rounded-xl border border-violet-400/25 bg-black/40 p-3">
                        <p className="text-[11px] font-semibold text-violet-200/90">AI 번역 · 원문 입력 후 포커스 아웃</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-white/55">원문 언어</span>
                          <select
                            value={sourceLang}
                            disabled={busy || translating}
                            onChange={(e) => setSourceLang(e.target.value as MenuLang)}
                            className={`${smartFieldsClass} max-w-[160px]`}
                          >
                            <option value="ko">한국어</option>
                            <option value="th">ไทย</option>
                            <option value="en">English</option>
                            <option value="zh">中文</option>
                          </select>
                        </div>
                        <input
                          value={sourceName}
                          disabled={busy || translating}
                          onChange={(e) => setSourceName(e.target.value)}
                          onBlur={() => void runTranslateExisting()}
                          placeholder="원문 메뉴명"
                          className={`${smartFieldsClass} w-full`}
                        />
                        <textarea
                          value={sourceDesc}
                          disabled={busy || translating}
                          onChange={(e) => setSourceDesc(e.target.value)}
                          onBlur={() => {
                            if (sourceName.trim()) void runTranslateExisting();
                          }}
                          placeholder="원문 설명 (선택)"
                          rows={2}
                          className={`${smartFieldsClass} w-full resize-none`}
                        />
                        {translating ? <p className="text-[11px] text-violet-200/90">번역 중…</p> : null}
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(['ko', 'th', 'en', 'zh'] as const).map((lang) => (
                            <label key={`edit-n-${row.id}-${lang}`} className="block text-[11px] text-white/60">
                              메뉴명 · {localeAria(lang)}
                              <input
                                value={editNames[lang]}
                                disabled={busy || translating}
                                onChange={(e) => setEditNames((p) => ({ ...p, [lang]: e.target.value }))}
                                className={`${smartFieldsClass} mt-1 w-full`}
                              />
                            </label>
                          ))}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(['ko', 'th', 'en', 'zh'] as const).map((lang) => (
                            <label key={`edit-d-${row.id}-${lang}`} className="block text-[11px] text-white/60">
                              설명 · {localeAria(lang)}
                              <textarea
                                value={editDescs[lang]}
                                disabled={busy || translating}
                                onChange={(e) => setEditDescs((p) => ({ ...p, [lang]: e.target.value }))}
                                rows={2}
                                className={`${smartFieldsClass} mt-1 w-full resize-none`}
                              />
                            </label>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="text-[11px] text-white/60">
                            가격 THB
                            <input
                              value={editPrice}
                              disabled={busy}
                              onChange={(e) => setEditPrice(e.target.value)}
                              inputMode="decimal"
                              className={`${smartFieldsClass} mt-1 w-28`}
                            />
                          </label>
                          <label className="flex items-center gap-2 pb-2 text-xs text-white/75">
                            <input type="checkbox" checked={editSpecial} onChange={(e) => setEditSpecial(e.target.checked)} />
                            스페셜
                          </label>
                          <button
                            type="button"
                            disabled={busy || translating}
                            onClick={() => void saveMenuRow(row)}
                            className="ml-auto rounded-xl px-4 py-2 text-xs font-bold text-black disabled:opacity-50"
                            style={{ backgroundColor: accentDraft }}
                          >
                            변경 저장
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {showLegacyFallback ? (
            <div className="border-t border-dashed border-white/15 bg-black/25 px-4 py-4">
              <p className="text-[11px] font-semibold text-amber-200/90">{mc.legacyHint}</p>
              <div className="mt-3 grid gap-3">
                {legacy.map((it, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {it.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.image_url}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/12"
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-black ring-1 ring-white/12"
                          style={{ background: `${accentDraft}44` }}
                        >
                          {legacyDishLabel(it, menuLang).slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-white/92">{legacyDishLabel(it, menuLang)}</p>
                        {it.description?.trim() ? (
                          <p className="mt-1 text-xs text-white/58">{it.description}</p>
                        ) : null}
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-sky-200/90">{it.price || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!showLegacyFallback && menus.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-white/45">{mc.empty}</p>
          ) : null}
        </section>

        <section className={`${glassPanel('p-4')} flex flex-col items-center gap-2`}>
          <h2 className="text-sm font-bold text-white">테이블용 QR</h2>
          <p className="text-center text-[11px] text-white/50">이 URL을 인쇄해 테이블에 붙이면 관광객이 바로 이 메뉴판을 엽니다.</p>
          <QRCodeGenerator value={canonicalMenuUrl} size={220} caption="스캔하면 디지털 메뉴판이 열립니다." />
        </section>
      </main>

      <button
        type="button"
        onClick={() => setOrderOpen(true)}
        className="fixed bottom-6 left-1/2 z-[45] -translate-x-1/2 rounded-full px-8 py-4 text-base font-black shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-2 ring-white/25 sm:text-lg"
        style={{ backgroundColor: accentDraft, color: '#0a0a0a' }}
      >
        🔔 당일 예약 및 주문하기
      </button>

      {orderOpen ? (
        <div
          className="fixed inset-0 z-[50] flex items-end justify-center bg-black/65 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="당일 예약 및 주문"
          onClick={() => !orderBusy && setOrderOpen(false)}
        >
          <div
            className={`${glassPanel('max-h-[88vh] w-full max-w-md overflow-y-auto p-5')}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-black text-white">당일 예약 · 주문</h2>
            <p className="mt-1 text-[11px] text-white/55">
              방문 예정 시각은 태국(방콕) 기준 당일만 선택할 수 있습니다. 로그인 계정으로 접수됩니다.
            </p>

            {!viewerId ? (
              <div className="mt-4 space-y-4 rounded-xl border border-amber-400/25 bg-amber-950/40 p-4 text-sm text-amber-50">
                <p className="font-semibold text-amber-100">
                  당일 예약·주문은 본인 확인이 필요합니다. 휴대폰 번호를 남기거나 소셜·일반 로그인으로 계속해 주세요.
                </p>
                <label className="block text-xs text-amber-100/85">
                  연락처 (휴대폰)
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={guestContactPhone}
                    onChange={(e) => setGuestContactPhone(e.target.value)}
                    placeholder="+66 · 010 …"
                    className="mt-1 w-full rounded-xl border border-amber-400/30 bg-black/35 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-amber-400/40"
                  />
                </label>
                <p className="text-[11px] text-amber-200/75">
                  번호는 매장 안내용으로만 쓰이며, 예약 확정은 로그인된 계정으로 처리됩니다.
                </p>
                <SocialAuthButtons
                  next={canonicalMenuUrl}
                  social={{
                    googleContinue: d.auth.googleContinue,
                    devGoogleBadge: d.auth.devGoogleBadge,
                    devGoogleTail: d.auth.devGoogleTail,
                  }}
                />
                <button
                  type="button"
                  className="w-full rounded-xl border border-amber-400/40 bg-amber-400/15 py-3 text-sm font-bold text-amber-50 transition hover:bg-amber-400/25"
                  onClick={() => {
                    const p = guestContactPhone.trim();
                    if (!p) {
                      notify('연락처를 입력하거나 위에서 소셜 로그인을 선택해 주세요.');
                      return;
                    }
                    try {
                      sessionStorage.setItem('local_order_phone_hint', p);
                    } catch {
                      /* ignore */
                    }
                    window.location.href = `/login?next=${encodeURIComponent(canonicalMenuUrl)}`;
                  }}
                >
                  번호 확인 후 로그인으로 이동
                </button>
                <Link
                  href={`/login?next=${encodeURIComponent(canonicalMenuUrl)}`}
                  className="block rounded-lg bg-amber-400 px-4 py-2.5 text-center text-sm font-bold text-black no-underline hover:bg-amber-300"
                >
                  이메일·비밀번호로 로그인
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="block text-xs text-white/70">
                  방문 예정 시간
                  <input
                    type="datetime-local"
                    value={visitAt}
                    onChange={(e) => setVisitAt(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="block text-xs text-white/70">
                  인원
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm text-white"
                  />
                </label>
                <div>
                  <p className="text-xs font-semibold text-white/80">메뉴 · 수량</p>
                  <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                    {menus.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-2 py-2 text-sm">
                        <span className="min-w-0 flex-1 truncate text-white/90">
                          {dishLabel(m, menuLang)}
                          {dishDescription(m, menuLang) ? (
                            <span className="ml-1 text-white/45">· {dishDescription(m, menuLang)}</span>
                          ) : null}
                          {m.is_sold_out ? <span className="ml-2 text-rose-300">{mc.soldOut}</span> : null}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          disabled={m.is_sold_out}
                          value={qtyById[m.id] ?? 0}
                          onChange={(e) =>
                            setQtyById((prev) => ({
                              ...prev,
                              [m.id]: Math.max(0, Math.min(30, Number(e.target.value) || 0)),
                            }))
                          }
                          className="w-16 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-center text-white disabled:opacity-40"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
                <label className="block text-xs text-white/70">
                  요청 사항 (선택)
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm text-white"
                    placeholder="알레르기, 좌석 요청 등"
                  />
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={orderBusy}
                    onClick={() => setOrderOpen(false)}
                    className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    disabled={orderBusy}
                    onClick={() => void submitReservationOrder()}
                    className="flex-1 rounded-xl py-3 text-sm font-black text-black disabled:opacity-50"
                    style={{ backgroundColor: accentDraft }}
                  >
                    {orderBusy ? '전송 중…' : '예약·주문 접수'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
