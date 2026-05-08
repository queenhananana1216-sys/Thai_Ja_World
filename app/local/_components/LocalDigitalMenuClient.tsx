'use client';

/**
 * 메뉴·주문 데이터는 RSC props + Supabase 변이 위주.
 * 홈과 동일한 `/api/weather` SWR 키를 미리 채워 뒤로 가기·허브 왕복 시 체감 지연을 줄임.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import SocialAuthButtons from '@app/auth/_components/SocialAuthButtons';
import QRCodeGenerator from '@/components/local/QRCodeGenerator';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';
import { prefetchPublicWeatherLocale } from '@/lib/hooks/usePublicWeatherSwr';
import type { Locale } from '@/i18n/types';
import { normalizeLocalMenuListSection, type LocalMenuListSection } from './localMenuListSection';
import LocalYoutubeBgmPlayer from './LocalYoutubeBgmPlayer';
import { extractYoutubeVideoId } from '@/lib/youtube/extractYoutubeVideoId';

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
  /** `menu` | `pricing` | `service` — 광고주 대시보드 탭 */
  list_section?: string | null;
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
    const url = new URL(u, typeof window !== 'undefined' ? window.location.origin : 'https://local.invalid');
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('mute', '1');
      url.searchParams.set('playsinline', '1');
    }
    return url.toString();
  } catch {
    return u;
  }
}

function legacyAudioBgmSrc(raw: string): boolean {
  const s = raw.trim();
  if (s.startsWith('/audio/')) return true;
  return /\.(mp3|ogg|wav|m4a|aac)(\?|#|$)/i.test(s);
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

const LIST_SECTION_UI: Record<
  LocalMenuListSection,
  Record<MenuLang, { title: string; sub: string; empty: string }>
> = {
  menu: {
    ko: { title: '🍽️ 메뉴판', sub: '대표 메뉴·식사', empty: '등록된 메뉴가 없습니다.' },
    th: { title: '🍽️ เมนูอาหาร', sub: 'จานเด่น · อาหารจานหลัก', empty: 'ยังไม่มีเมนู' },
    en: { title: '🍽️ Menu board', sub: 'Signature dishes', empty: 'No items yet.' },
    zh: { title: '🍽️ 菜单', sub: '主打餐食', empty: '暂无菜品。' },
  },
  pricing: {
    ko: { title: '💰 가격표', sub: '세트·음료·부가 요금', empty: '등록된 항목이 없습니다.' },
    th: { title: '💰 ราคา', sub: 'เซ็ต · เครื่องดื่ม · ค่าเสริม', empty: 'ยังไม่มีรายการ' },
    en: { title: '💰 Price list', sub: 'Sets, drinks & extras', empty: 'No items yet.' },
    zh: { title: '💰 价目表', sub: '套餐·饮料·附加费', empty: '暂无条目。' },
  },
  service: {
    ko: { title: '💆‍♀️ 시술표', sub: '케어·코스·예약 항목', empty: '등록된 시술이 없습니다.' },
    th: { title: '💆‍♀️ บริการ', sub: 'สปา · คอร์ส · รายการจอง', empty: 'ยังไม่มีรายการ' },
    en: { title: '💆‍♀️ Services', sub: 'Care, courses & bookings', empty: 'No items yet.' },
    zh: { title: '💆‍♀️ 服务表', sub: '护理·疗程', empty: '暂无项目。' },
  },
};

const LIST_SECTION_ORDER: LocalMenuListSection[] = ['menu', 'pricing', 'service'];

function formatThb(n: number | string | null): string {
  const num = typeof n === 'number' ? n : Number(String(n ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(num)) return '—';
  return `${num.toFixed(0)} THB`;
}

function kioskFloatingLabel(lang: MenuLang, n: number, totalNum: number): string {
  const t = formatThb(totalNum);
  switch (lang) {
    case 'ko':
      return `🛒 ${n}개 주문하기 (총 ${t})`;
    case 'th':
      return `🛒 สั่ง ${n} รายการ (รวม ${t})`;
    case 'en':
      return `🛒 Order ${n} item${n === 1 ? '' : 's'} (${t} total)`;
    case 'zh':
      return `🛒 下单 ${n} 项（合计 ${t}）`;
    default:
      return `🛒 ${n} · ${t}`;
  }
}

function kioskAddLabel(lang: MenuLang): string {
  switch (lang) {
    case 'ko':
      return '+ 담기';
    case 'th':
      return '+ เพิ่ม';
    case 'en':
      return '+ Add';
    case 'zh':
      return '+ 加入';
    default:
      return '+';
  }
}

function glassPanel(extra = '') {
  return `rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150 ${extra}`;
}

function menuCardShell(extra = '') {
  return `overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.07] shadow-[0_20px_56px_rgba(0,0,0,0.5)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/[0.06] transition hover:ring-white/12 ${extra}`;
}

function LocalMinihomeLegacyAudioBgm({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = 0.35;
    void el.play().catch(() => setNeedsTap(true));
  }, [src]);

  return (
    <div className="fixed bottom-24 left-4 z-[35] flex flex-col gap-1">
      <audio ref={audioRef} src={src} loop preload="metadata" className="hidden" />
      <div
        className="flex items-center gap-1 rounded-full border border-teal-600/35 bg-[#132028]/95 px-2 py-1 text-[10px] font-bold tracking-wide text-teal-100 shadow-md backdrop-blur-sm"
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
      >
        <span className="select-none text-[11px]" aria-hidden>
          📼
        </span>
        {needsTap ? (
          <button
            type="button"
            onClick={() => {
              void audioRef.current?.play().then(() => setNeedsTap(false));
            }}
            className="rounded-full bg-teal-800/55 px-2 py-0.5 text-[9px] text-teal-50 hover:bg-teal-700/55"
          >
            탭하여 재생
          </button>
        ) : (
          <span className="text-[9px] text-teal-200/80">BGM</span>
        )}
      </div>
    </div>
  );
}

export default function LocalDigitalMenuClient(props: {
  spot: SpotLite;
  menus: LocalMenuRow[];
  canonicalMenuUrl: string;
  isOwner: boolean;
  viewerId: string | null;
  tableOrderConfig?: { promptpayTarget: string | null };
}) {
  const { d } = useClientLocaleDictionary();
  const { spot, canonicalMenuUrl, isOwner, viewerId, tableOrderConfig } = props;
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

  useEffect(() => {
    prefetchPublicWeatherLocale(menuLang as Locale);
  }, [menuLang]);
  const [guestContactPhone, setGuestContactPhone] = useState('');
  const [kioskCart, setKioskCart] = useState<Record<string, number>>({});
  const [kioskModalOpen, setKioskModalOpen] = useState(false);
  const [kioskTableNo, setKioskTableNo] = useState('');
  const [kioskPayment, setKioskPayment] = useState<'counter' | 'promptpay'>('counter');
  const [kioskBusy, setKioskBusy] = useState(false);
  const [postPayOpen, setPostPayOpen] = useState(false);
  const [postPayKind, setPostPayKind] = useState<'counter' | 'promptpay'>('counter');
  const [postPayQrUrl, setPostPayQrUrl] = useState<string | null>(null);
  const [postPayTotal, setPostPayTotal] = useState(0);
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

  const bgmRaw = spot.minihome_bgm_url?.trim() ?? '';
  const bgmYoutubeId = useMemo(() => extractYoutubeVideoId(bgmRaw || null), [bgmRaw]);
  const bgmOtherSrc = useMemo(() => {
    if (!bgmRaw || bgmYoutubeId) return null;
    return bgmAutoplaySrc(bgmRaw);
  }, [bgmRaw, bgmYoutubeId]);

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

  const promptpayTarget = tableOrderConfig?.promptpayTarget?.trim() || null;

  const kioskTotals = useMemo(() => {
    let qty = 0;
    let total = 0;
    for (const m of menus) {
      const q = Math.floor(kioskCart[m.id] ?? 0);
      if (q < 1 || m.is_sold_out) continue;
      qty += q;
      const unit =
        typeof m.price_thb === 'number'
          ? m.price_thb
          : Number(String(m.price_thb ?? '').replace(/[^\d.]/g, ''));
      if (Number.isFinite(unit)) total += unit * q;
    }
    return { qty, total: Math.round(total * 100) / 100 };
  }, [menus, kioskCart]);

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
      .order('list_section', { ascending: true })
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
        notify('✨ 운영 도우미가 4개 언어 메뉴명·설명 초안을 채웠습니다.');
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
        notify('✨ 운영 도우미가 4개 언어 메뉴명·설명 초안을 채웠습니다.');
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
    const nextOrder =
      menus
        .filter((r) => normalizeLocalMenuListSection(r.list_section) === 'menu')
        .reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;
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
      list_section: 'menu',
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

  const addToKioskCart = useCallback(
    (row: LocalMenuRow) => {
      if (row.is_sold_out || isOwner) return;
      setKioskCart((prev) => ({
        ...prev,
        [row.id]: Math.min(99, Math.floor((prev[row.id] ?? 0) + 1)),
      }));
    },
    [isOwner],
  );

  const submitKioskTableOrder = async () => {
    const table = kioskTableNo.trim();
    if (!table) {
      notify(
        menuLang === 'th'
          ? 'กรุณากรอกหมายเลขโต๊ะ'
          : menuLang === 'en'
            ? 'Please enter your table number.'
            : menuLang === 'zh'
              ? '请输入桌号。'
              : '테이블 번호를 입력해 주세요.',
      );
      return;
    }
    if (kioskTotals.qty < 1) {
      notify(menuLang === 'ko' ? '담긴 메뉴가 없습니다.' : 'No items in cart.');
      return;
    }
    if (kioskPayment === 'promptpay' && !promptpayTarget) {
      notify(
        menuLang === 'ko'
          ? 'PromptPay QR가 설정되지 않았습니다. 매장 결제를 선택해 주세요.'
          : 'PromptPay is not configured. Choose pay at counter.',
      );
      return;
    }

    const items = menus
      .filter((m) => !m.is_sold_out && (kioskCart[m.id] ?? 0) > 0)
      .map((m) => ({ menu_id: m.id, qty: Math.floor(kioskCart[m.id] ?? 0) }));

    setKioskBusy(true);
    try {
      const res = await fetch('/api/local/table-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local_spot_id: spot.id,
          table_no: table,
          payment_method: kioskPayment,
          items,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        order?: { id: string; total_thb?: number | string | null };
      };
      if (!res.ok) throw new Error(data.error ?? 'order_failed');

      const orderId = data.order?.id;
      if (!orderId) throw new Error('missing_order_id');

      const nr = await fetch('/api/orders/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ local_order_id: orderId }),
      });
      if (!nr.ok) {
        const ne = (await nr.json().catch(() => ({}))) as { error?: string };
        console.warn('[table-order] notify failed', ne.error ?? nr.status);
      }

      const totalNum =
        typeof data.order?.total_thb === 'number'
          ? data.order.total_thb
          : Number(String(data.order?.total_thb ?? kioskTotals.total));

      setKioskCart({});
      setKioskModalOpen(false);
      setKioskTableNo('');
      setKioskPayment('counter');

      if (kioskPayment === 'promptpay' && promptpayTarget) {
        const orderRef = orderId.replace(/-/g, '').slice(0, 12).toUpperCase();
        const payload = `${promptpayTarget}|${totalNum.toFixed(2)}|${orderRef}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(payload)}`;
        setPostPayKind('promptpay');
        setPostPayQrUrl(qrUrl);
        setPostPayTotal(totalNum);
      } else {
        setPostPayKind('counter');
        setPostPayQrUrl(null);
        setPostPayTotal(totalNum);
      }
      setPostPayOpen(true);

      notify(
        menuLang === 'ko'
          ? '주문이 접수되었습니다. 알림이 매장으로 전달되었습니다.'
          : menuLang === 'th'
            ? 'รับออเดอร์แล้ว — แจ้งเตือนถึงร้านแล้ว'
            : menuLang === 'zh'
              ? '订单已提交，已通知店家。'
              : 'Order received — the shop has been notified.',
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : 'order_failed');
    } finally {
      setKioskBusy(false);
    }
  };

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
    <div style={shellStyle} className={`text-slate-50 ${kioskTotals.qty > 0 && !isOwner ? 'pb-36' : 'pb-28'}`}>
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

      {bgmYoutubeId ? (
        <LocalYoutubeBgmPlayer videoId={bgmYoutubeId} />
      ) : bgmOtherSrc ? (
        legacyAudioBgmSrc(bgmOtherSrc) ? (
          <LocalMinihomeLegacyAudioBgm src={bgmOtherSrc} />
        ) : (
          <iframe
            title="매장 BGM"
            src={bgmOtherSrc}
            className="pointer-events-none fixed bottom-24 left-4 z-[35] h-[72px] w-[128px] rounded-lg opacity-35 shadow-lg ring-1 ring-white/15"
            allow="autoplay; encrypted-media; fullscreen"
          />
        )
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
          <p className="text-[11px] leading-relaxed text-emerald-100/90">
            {menuLang === 'th'
              ? 'สั่งที่โต๊ะ: กด 「เพิ่ม」ที่เมนู แล้วกดแถบล่างเพื่อใส่หมายเลขโต๊ะ — แจ้งเตือนถึงเจ้าของร้านทันที'
              : menuLang === 'en'
                ? 'Table order: tap 「Add」 on dishes, then use the bottom bar to enter your table number — the owner gets an instant alert.'
                : menuLang === 'zh'
                  ? '桌边点餐：点菜品旁的「加入」，用底部栏输入桌号——店主会立即收到通知。'
                  : '테이블 주문: 메뉴 「담기」 후 하단 바에서 테이블 번호를 입력하면 사장님께 즉시 알림이 갑니다.'}
          </p>
          {!viewerId ? (
            <p className="text-[11px] text-amber-200/90">
              {menuLang === 'ko'
                ? '당일 예약·시간 지정 주문은 로그인 후 하단 「당일 예약 및 주문하기」를 이용해 주세요.'
                : menuLang === 'th'
                  ? 'การจองล่วงหน้าในวันเดียวกัน — กรุณาเข้าสู่ระบบแล้วใช้ปุ่มด้านล่าง'
                  : menuLang === 'zh'
                    ? '当日预约 — 请登录后使用底部预约按钮。'
                    : 'For timed same-day reservations, sign in and use the bottom reservation button.'}
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
              <Link
                href={`/local/${encodeURIComponent(spot.slug)}/minihome/edit`}
                className="rounded-lg border border-violet-400/35 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-100 no-underline hover:bg-violet-500/25"
              >
                📝 메뉴·가격·시술 편집
              </Link>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-sm font-bold text-white">스마트 메뉴 추가</h3>
              <p className="mt-1 text-[11px] text-white/50">
                원문 언어·메뉴명을 입력한 뒤 포커스를 빼면 운영 도우미가 4개 언어 초안을 채웁니다. 세부 수정 후 등록하세요.
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
                    <Image
                      src={newImageUrl}
                      alt=""
                      width={48}
                      height={48}
                      sizes="48px"
                      loading="lazy"
                      quality={88}
                      className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/15"
                    />
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

        {LIST_SECTION_ORDER.map((secKey) => {
          const secUi = LIST_SECTION_UI[secKey][menuLang];
          const rows = menus.filter((m) => normalizeLocalMenuListSection(m.list_section) === secKey);
          return (
        <section key={secKey} className={glassPanel('overflow-hidden')}>
          <div className="border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md">
            <h2 className="text-sm font-bold text-white">{secUi.title}</h2>
            <p className="text-[11px] text-white/45">{secUi.sub}</p>
          </div>
          <div className="space-y-4 p-4">
            {rows.map((row, menuIdx) => {
              const desc = dishDescription(row, menuLang);
              const label = dishLabel(row, menuLang);
              const expanded = expandedMenuId === row.id;
              const heroImage = menuIdx === 0 && secKey === 'menu';
              return (
                <article key={row.id} className={menuCardShell('flex flex-col sm:flex-row')}>
                  <div className="relative aspect-[5/4] w-full overflow-hidden rounded-t-2xl sm:aspect-auto sm:h-auto sm:w-[42%] sm:max-w-[220px] sm:shrink-0 sm:rounded-l-2xl sm:rounded-tr-none">
                    {row.image_url ? (
                      <Image
                        src={row.image_url}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 220px"
                        priority={heroImage}
                        loading={heroImage ? 'eager' : 'lazy'}
                        quality={88}
                        className="object-cover sm:min-h-[148px]"
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

                    {!isOwner ? (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          disabled={busy || row.is_sold_out}
                          onClick={() => addToKioskCart(row)}
                          className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {kioskAddLabel(menuLang)}
                        </button>
                      </div>
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

          {secKey === 'menu' && showLegacyFallback ? (
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
                        <Image
                          src={it.image_url}
                          alt=""
                          width={56}
                          height={56}
                          sizes="56px"
                          loading="lazy"
                          quality={88}
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

          {rows.length === 0 && !(secKey === 'menu' && showLegacyFallback) ? (
            <p className="px-4 py-8 text-center text-sm text-white/45">{secUi.empty}</p>
          ) : null}
        </section>
          );
        })}

        <section className={`${glassPanel('p-4')} flex flex-col items-center gap-2`}>
          <h2 className="text-sm font-bold text-white">테이블용 QR</h2>
          <p className="text-center text-[11px] text-white/50">이 URL을 인쇄해 테이블에 붙이면 관광객이 바로 이 메뉴판을 엽니다.</p>
          <QRCodeGenerator value={canonicalMenuUrl} size={220} caption="스캔하면 디지털 메뉴판이 열립니다." />
        </section>
      </main>

      {kioskTotals.qty > 0 && !isOwner ? (
        <div className="pointer-events-none fixed bottom-[5.25rem] left-0 right-0 z-[44] flex justify-center px-4">
          <button
            type="button"
            onClick={() => setKioskModalOpen(true)}
            className="pointer-events-auto flex w-full max-w-lg items-center justify-center rounded-2xl border border-white/14 bg-black/58 px-4 py-3.5 text-sm font-black text-white shadow-[0_20px_56px_rgba(0,0,0,0.65)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-white/[0.07] transition hover:border-white/22 hover:bg-black/62 sm:text-[15px]"
          >
            {kioskFloatingLabel(menuLang, kioskTotals.qty, kioskTotals.total)}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOrderOpen(true)}
        className={`fixed left-1/2 z-[45] -translate-x-1/2 rounded-full px-8 py-4 text-base font-black shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-2 ring-white/25 sm:text-lg ${
          kioskTotals.qty > 0 && !isOwner ? 'bottom-3' : 'bottom-6'
        }`}
        style={{ backgroundColor: accentDraft, color: '#0a0a0a' }}
      >
        🔔 당일 예약 및 주문하기
      </button>

      {kioskModalOpen ? (
        <div
          className="fixed inset-0 z-[52] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Table order"
          onClick={() => !kioskBusy && setKioskModalOpen(false)}
        >
          <div
            className={`${glassPanel('max-h-[88vh] w-full max-w-md overflow-y-auto p-5')}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-black text-white">
              {menuLang === 'th'
                ? 'สั่งที่โต๊ะ'
                : menuLang === 'en'
                  ? 'Table order'
                  : menuLang === 'zh'
                    ? '桌边下单'
                    : '테이블 주문'}
            </h2>
            <p className="mt-1 text-[11px] text-white/55">
              {menuLang === 'ko'
                ? '테이블 번호와 결제 방식을 선택한 뒤 주문을 확정합니다. 사장님 LINE으로 즉시 알림이 갑니다.'
                : menuLang === 'th'
                  ? 'ใส่หมายเลขโต๊ะและเลือกวิธีชำระ — แจ้งเตือนไปยัง LINE ของเจ้าของร้านทันที'
                  : menuLang === 'zh'
                    ? '填写桌号并选择支付方式——店主 LINE 会立刻收到通知。'
                    : 'Enter your table number and payment option — the owner gets an instant LINE alert.'}
            </p>
            <label className="mt-4 block text-xs text-white/70">
              {menuLang === 'th'
                ? 'หมายเลขโต๊ะ'
                : menuLang === 'en'
                  ? 'Table number'
                  : menuLang === 'zh'
                    ? '桌号'
                    : '테이블 번호'}
              <input
                value={kioskTableNo}
                disabled={kioskBusy}
                onChange={(e) => setKioskTableNo(e.target.value)}
                inputMode="numeric"
                placeholder={menuLang === 'ko' ? '예: 12' : menuLang === 'th' ? 'เช่น 12' : 'e.g. 12'}
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-emerald-500/35"
              />
            </label>
            <fieldset className="mt-4 space-y-2">
              <legend className="text-xs font-semibold text-white/75">
                {menuLang === 'ko' ? '결제 방식' : menuLang === 'th' ? 'การชำระเงิน' : menuLang === 'zh' ? '支付方式' : 'Payment'}
              </legend>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/12 bg-black/25 px-3 py-2 text-sm text-white/90">
                <input
                  type="radio"
                  name="kiosk-pay"
                  checked={kioskPayment === 'counter'}
                  disabled={kioskBusy}
                  onChange={() => setKioskPayment('counter')}
                />
                {menuLang === 'ko'
                  ? '매장 카운터에서 결제'
                  : menuLang === 'th'
                    ? 'ชำระที่เคาน์เตอร์'
                    : menuLang === 'zh'
                      ? '柜台现场付款'
                      : 'Pay at counter'}
              </label>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  promptpayTarget
                    ? 'border-white/12 bg-black/25 text-white/90'
                    : 'cursor-not-allowed border-white/8 bg-black/15 text-white/40'
                }`}
              >
                <input
                  type="radio"
                  name="kiosk-pay"
                  checked={kioskPayment === 'promptpay'}
                  disabled={kioskBusy || !promptpayTarget}
                  onChange={() => setKioskPayment('promptpay')}
                />
                PromptPay QR
                {!promptpayTarget ? (
                  <span className="text-[10px] text-white/45">
                    ({menuLang === 'ko' ? '미설정' : 'N/A'})
                  </span>
                ) : null}
              </label>
            </fieldset>
            <div className="mt-4 flex gap-2 pt-2">
              <button
                type="button"
                disabled={kioskBusy}
                onClick={() => setKioskModalOpen(false)}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {menuLang === 'ko' ? '취소' : menuLang === 'th' ? 'ยกเลิก' : menuLang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={kioskBusy}
                onClick={() => void submitKioskTableOrder()}
                className="flex-1 rounded-xl py-3 text-sm font-black text-black disabled:opacity-50"
                style={{ backgroundColor: accentDraft }}
              >
                {kioskBusy
                  ? menuLang === 'ko'
                    ? '전송 중…'
                    : '…'
                  : menuLang === 'ko'
                    ? '주문하기'
                    : menuLang === 'th'
                      ? 'สั่งเลย'
                      : menuLang === 'zh'
                        ? '下单'
                        : 'Place order'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {postPayOpen ? (
        <div
          className="fixed inset-0 z-[53] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPostPayOpen(false)}
        >
          <div
            className={`${glassPanel('max-w-md p-6')}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white">
              {menuLang === 'ko'
                ? '결제 안내'
                : menuLang === 'th'
                  ? 'ชำระเงิน'
                  : menuLang === 'zh'
                    ? '付款说明'
                    : 'Payment'}
            </h3>
            <p className="mt-2 text-sm text-white/75">
              {menuLang === 'ko'
                ? `총 ${formatThb(postPayTotal)}`
                : `${menuLang === 'th' ? 'รวม' : menuLang === 'zh' ? '合计' : 'Total'} ${formatThb(postPayTotal)}`}
            </p>
            {postPayKind === 'counter' ? (
              <p className="mt-4 text-sm leading-relaxed text-emerald-100/95">
                {menuLang === 'ko'
                  ? '카운터에서 주문 내역을 확인한 뒤 결제해 주세요.'
                  : menuLang === 'th'
                    ? 'ไปที่เคาน์เตอร์เพื่อยืนยันและชำระเงิน'
                    : menuLang === 'zh'
                      ? '请到柜台确认订单并完成付款。'
                      : 'Please confirm and pay at the counter.'}
              </p>
            ) : postPayQrUrl ? (
              <div className="mt-4 rounded-xl border border-white/12 bg-black/30 p-4 text-center">
                <p className="text-xs font-semibold text-emerald-200">
                  {menuLang === 'ko' ? 'PromptPay QR' : 'PromptPay QR'}
                </p>
                <Image
                  src={postPayQrUrl}
                  alt="PromptPay"
                  width={240}
                  height={240}
                  sizes="(max-width: 480px) 85vw, 240px"
                  unoptimized
                  loading="lazy"
                  className="mx-auto mt-3 h-auto w-full max-w-[240px] rounded-lg ring-1 ring-white/15"
                />
                <p className="mt-3 text-[11px] text-white/55">
                  {menuLang === 'ko'
                    ? '은행 앱으로 스캔하여 송금해 주세요.'
                    : menuLang === 'th'
                      ? 'สแกนด้วยแอปธนาคารของคุณ'
                      : menuLang === 'zh'
                        ? '使用银行应用扫码支付。'
                        : 'Scan with your banking app to pay.'}
                </p>
              </div>
            ) : null}
            <button
              type="button"
              className="mt-6 w-full rounded-xl border border-white/20 bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/15"
              onClick={() => setPostPayOpen(false)}
            >
              {menuLang === 'ko' ? '확인' : menuLang === 'th' ? 'ตกลง' : menuLang === 'zh' ? '好的' : 'OK'}
            </button>
          </div>
        </div>
      ) : null}

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
