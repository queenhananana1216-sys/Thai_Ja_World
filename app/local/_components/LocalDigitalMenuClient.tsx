'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import QRCodeGenerator from '@/components/local/QRCodeGenerator';
import { createBrowserClient } from '@/lib/supabase/client';

export type LocalMenuRow = {
  id: string;
  local_spot_id: string;
  name: string;
  description: string | null;
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

function legacyMenuItems(raw: unknown): { name: string; price: string; description?: string; image_url?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((o) => ({
      name: String(o!.name ?? '').trim() || 'Menu',
      price: String(o!.price ?? ''),
      description: o!.description != null ? String(o!.description) : undefined,
      image_url: o!.image_url != null ? String(o!.image_url) : undefined,
    }))
    .filter((x) => x.name.length > 0);
}

function formatThb(n: number | string | null): string {
  const num = typeof n === 'number' ? n : Number(String(n ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(num)) return '—';
  return `${num.toFixed(0)} THB`;
}

function glassPanel(extra = '') {
  return `rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150 ${extra}`;
}

export default function LocalDigitalMenuClient(props: {
  spot: SpotLite;
  menus: LocalMenuRow[];
  canonicalMenuUrl: string;
  isOwner: boolean;
  viewerId: string | null;
}) {
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

  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickSpecial, setQuickSpecial] = useState(true);

  const addSpecialMenu = async () => {
    if (!isOwner) return;
    const name = quickName.trim();
    const priceNum = Number(String(quickPrice).replace(/[^\d.]/g, ''));
    if (!name || !Number.isFinite(priceNum) || priceNum < 0) {
      notify('이름과 가격(숫자)을 입력해 주세요.');
      return;
    }
    setBusy(true);
    const nextOrder = menus.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1;
    const { error } = await sb.from('local_menus').insert({
      local_spot_id: spot.id,
      name,
      price_thb: priceNum,
      is_special: quickSpecial,
      is_sold_out: false,
      sort_order: nextOrder,
    });
    setBusy(false);
    if (error) {
      notify(error.message);
      return;
    }
    setQuickName('');
    setQuickPrice('');
    await refreshMenus();
    notify(quickSpecial ? '스페셜 메뉴를 등록했습니다.' : '메뉴를 추가했습니다.');
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

  return (
    <div style={shellStyle} className="pb-28 text-slate-50">
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
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Digital Menu</p>
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

            <div className="mt-5 border-t border-white/10 pt-4">
              <h3 className="text-sm font-bold text-white">원클릭 · 스페셜 메뉴 등록</h3>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <input
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="메뉴명"
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                />
                <input
                  value={quickPrice}
                  onChange={(e) => setQuickPrice(e.target.value)}
                  placeholder="가격 THB"
                  inputMode="decimal"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white sm:w-28"
                />
                <label className="flex items-center gap-2 text-xs text-white/75">
                  <input type="checkbox" checked={quickSpecial} onChange={(e) => setQuickSpecial(e.target.checked)} />
                  스페셜
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addSpecialMenu()}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: accentDraft }}
                >
                  등록
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className={glassPanel('overflow-hidden')}>
          <div className="border-b border-white/10 bg-black/25 px-4 py-3">
            <h2 className="text-sm font-bold text-white">메뉴 · 시술</h2>
            <p className="text-[11px] text-white/45">매장 테이블 QR로 접속한 화면에 맞춘 세로 레이아웃입니다.</p>
          </div>
          <ul className="divide-y divide-white/[0.07]">
            {menus.map((row) => (
              <li key={row.id} className="flex gap-3 px-4 py-4">
                {row.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />
                ) : (
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white/90 ring-1 ring-white/10"
                    style={{ background: `${accentDraft}44` }}
                  >
                    {row.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">
                        {row.name}
                        {row.is_special ? (
                          <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                            SPECIAL
                          </span>
                        ) : null}
                      </p>
                      {row.description ? <p className="mt-1 text-xs text-white/60">{row.description}</p> : null}
                    </div>
                    <p className={`shrink-0 text-sm font-bold ${row.is_sold_out ? 'text-rose-300 line-through' : 'text-sky-200'}`}>
                      {formatThb(row.price_thb)}
                    </p>
                  </div>
                  {row.is_sold_out ? (
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-rose-300/90">품절</p>
                  ) : null}
                  {isOwner ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void toggleSoldOut(row)}
                        className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                      >
                        {row.is_sold_out ? '재입고(품절 해제)' : '품절 처리'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          {showLegacyFallback ? (
            <div className="border-t border-dashed border-white/15 bg-black/20 px-4 py-3">
              <p className="text-[11px] font-semibold text-amber-200/90">아직 DB 메뉴가 없어 예전 미니홈 JSON 메뉴만 표시합니다.</p>
              <ul className="mt-2 space-y-2">
                {legacy.map((it, i) => (
                  <li key={i} className="flex justify-between gap-2 text-sm">
                    <span className="text-white/90">{it.name}</span>
                    <span className="text-sky-200/90">{it.price || '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!showLegacyFallback && menus.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-white/45">등록된 메뉴가 없습니다.</p>
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
              <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-950/40 p-4 text-sm text-amber-50">
                로그인 후 이용할 수 있습니다.
                <Link
                  href={`/auth/login?next=${encodeURIComponent(canonicalMenuUrl)}`}
                  className="mt-3 block rounded-lg bg-amber-400 px-4 py-2 text-center text-sm font-bold text-black no-underline"
                >
                  로그인하기
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
                          {m.name}
                          {m.is_sold_out ? <span className="ml-2 text-rose-300">품절</span> : null}
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
