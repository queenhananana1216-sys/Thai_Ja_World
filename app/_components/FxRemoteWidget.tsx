'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/i18n/types';
import type { Dictionary } from '@/i18n/dictionaries';
import { useStyleScorePreview } from '@/contexts/StyleScorePreviewContext';
import { amountToUsd, usdToCurrency } from '@/lib/fx/convert';
import { createBrowserClient } from '@/lib/supabase/client';
import type { FxCurrency, FxSnapshot } from '@/lib/fx/types';

type Labels = Dictionary['home']['fxRemote'];

const STORAGE_KEY = 'tj_fx_remote_v4';
const LEGACY_KEY = 'tj_fx_remote_v2';
/** 펼침 패널(키패드 제외) — clamp/저장용 (실제 너비는 globals.css --tj-fx-panel-w 와 맞출 것) */
const PANEL_W = 142;
const PANEL_H = 158;
const FAB = 40;
/** 글로벌 헤더·홈 히어로 검색 아래로 살짝 (sticky 헤더 + 한 줄 여유) */
const DEFAULT_TOP = 100;

type StoredPos = { x: number; y: number; minimized?: boolean };

function clampPos(x: number, y: number, w: number, h: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y };
  const m = 4;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.min(Math.max(m, x), Math.max(m, vw - w - m)),
    y: Math.min(Math.max(m, y), Math.max(m, vh - h - m)),
  };
}

function saveState(x: number, y: number, minimized: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y, minimized }));
  } catch {
    /* ignore */
  }
}

function migrateLegacyStorage() {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const j = JSON.parse(raw) as StoredPos;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ x: j.x, y: j.y, minimized: true }),
    );
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

function normalizeAmount(raw: string): string {
  let s = raw.replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  if (s.startsWith('.')) s = `0${s}`;
  const parts = s.split('.');
  const dec = parts[1];
  if (dec !== undefined && dec.length > 2) {
    s = `${parts[0] ?? '0'}.${dec.slice(0, 2)}`;
  }
  return s.slice(0, 12);
}

const NUM_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

function fmtLine(thb: number, krw: number, usd: number): string {
  const t = Number.isFinite(thb) ? thb.toFixed(1) : '—';
  const k = Number.isFinite(krw) ? Math.round(krw).toLocaleString() : '—';
  const u = Number.isFinite(usd) ? usd.toFixed(2) : '—';
  return `฿${t} · ₩${k} · $${u}`;
}

export default function FxRemoteWidget({
  locale,
  initial,
  labels,
  panelTitle,
}: {
  locale: Locale;
  initial: FxSnapshot;
  labels: Labels;
  panelTitle: string;
}) {
  const router = useRouter();
  const { previewCost } = useStyleScorePreview();
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);
  const fabMovedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(true);

  const [snap, setSnap] = useState<FxSnapshot>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [amountStr, setAmountStr] = useState('0');
  const [base, setBase] = useState<FxCurrency>('THB');
  const [showKeypad, setShowKeypad] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [styleBalance, setStyleBalance] = useState<number | null>(null);

  useEffect(() => {
    setSnap(initial);
  }, [initial]);

  useEffect(() => {
    migrateLegacyStorage();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const j = JSON.parse(raw) as StoredPos;
        const w = j.minimized !== false ? FAB : PANEL_W;
        const h = j.minimized !== false ? FAB : PANEL_H;
        setPos(clampPos(j.x ?? 0, j.y ?? 0, w, h));
        setMinimized(j.minimized !== false);
      } else {
        setMinimized(true);
        setPos(clampPos(window.innerWidth - FAB - 10, DEFAULT_TOP, FAB, FAB));
      }
    } catch {
      setMinimized(true);
      setPos(clampPos(window.innerWidth - FAB - 10, DEFAULT_TOP, FAB, FAB));
    }
    setReady(true);
  }, []);

  useEffect(() => {
    function onResize() {
      const el = minimized ? fabRef.current : panelRef.current;
      if (!el) return;
      setPos((p) => clampPos(p.x, p.y, el.offsetWidth, el.offsetHeight));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [minimized]);

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const refreshStyleScore = useCallback(async () => {
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setStyleBalance(null);
      return;
    }
    const { data } = await sb
      .from('profiles')
      .select('style_score_total')
      .eq('id', user.id)
      .maybeSingle();
    setStyleBalance(typeof data?.style_score_total === 'number' ? data.style_score_total : 0);
  }, []);

  useEffect(() => {
    const sb = createBrowserClient();
    let cancelled = false;
    let ch: ReturnType<typeof sb.channel> | null = null;

    void (async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (cancelled || !user) {
        setStyleBalance(null);
        return;
      }
      await refreshStyleScore();
      if (cancelled) return;
      try {
        ch = sb
          .channel(`tj-profile-score-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              const n = (payload.new as { style_score_total?: number }).style_score_total;
              if (typeof n === 'number') setStyleBalance(n);
            },
          )
          .subscribe();
      } catch {
        /* Realtime 미설정 시 무시 */
      }
    })();

    function onVis() {
      if (document.visibilityState === 'visible') void refreshStyleScore();
    }
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      if (ch) void sb.removeChannel(ch);
    };
  }, [refreshStyleScore]);

  const amountNum = useMemo(() => {
    const n = parseFloat(amountStr);
    return Number.isFinite(n) ? n : 0;
  }, [amountStr]);

  const usd = useMemo(
    () => amountToUsd(amountNum, base, snap.usdToThb, snap.usdToKrw),
    [amountNum, base, snap.usdToThb, snap.usdToKrw],
  );

  const outThb = usdToCurrency(usd, 'THB', snap.usdToThb, snap.usdToKrw);
  const outKrw = usdToCurrency(usd, 'KRW', snap.usdToThb, snap.usdToKrw);
  const outUsd = usdToCurrency(usd, 'USD', snap.usdToThb, snap.usdToKrw);

  const styleAfter =
    styleBalance !== null && previewCost > 0 ? Math.max(0, styleBalance - previewCost) : null;

  const styleLine = useMemo(() => {
    if (styleBalance === null) return null;
    if (previewCost > 0) {
      return labels.stylePreviewLine
        .replace('{own}', String(styleBalance))
        .replace('{cost}', String(previewCost))
        .replace('{after}', String(styleAfter));
    }
    return labels.styleOwnLine.replace('{own}', String(styleBalance));
  }, [labels, previewCost, styleAfter, styleBalance]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/fx', { cache: 'no-store' });
      if (res.ok) {
        const j = (await res.json()) as FxSnapshot;
        setSnap(j);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  /** 개발 SSR이 예시 환율만 줄 때 클라이언트에서 실제 환율 보강 */
  useEffect(() => {
    if (!initial.mock) return;
    void onRefresh();
  }, [initial.mock, onRefresh]);

  async function toggleLocale(next: Locale) {
    if (next === locale) return;
    await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
    setMenuOpen(false);
  }

  function appendKey(k: string) {
    if (k === '.') {
      if (amountStr.includes('.')) return;
      setAmountStr((p) => (p === '' ? '0.' : `${p}.`));
      return;
    }
    setAmountStr((p) => normalizeAmount(`${p}${k}`));
  }

  function backspace() {
    setAmountStr((p) => (p.length <= 1 ? '0' : p.slice(0, -1)));
  }

  function scrollMini() {
    setMenuOpen(false);
    document.getElementById('home-mini-teaser')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const dateShort = useMemo(() => {
    try {
      return new Date(snap.dateISO).toLocaleDateString(locale === 'th' ? 'th-TH' : 'ko-KR');
    } catch {
      return '—';
    }
  }, [snap.dateISO, locale]);

  function panelDragStart(e: React.PointerEvent) {
    const el = e.target as HTMLElement;
    if (el.closest('button') || el.closest('input') || el.closest('textarea')) return;
    if (!el.closest('[data-fx-drag-handle]')) return;
    dragRef.current = { ox: pos.x, oy: pos.y, px: e.clientX, py: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function panelDragMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || !panelRef.current) return;
    const w = panelRef.current.offsetWidth;
    const h = panelRef.current.offsetHeight;
    setPos(clampPos(d.ox + e.clientX - d.px, d.oy + e.clientY - d.py, w, h));
  }

  function panelDragEnd(e: React.PointerEvent) {
    if (!dragRef.current) return;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setPos((p) => {
      saveState(p.x, p.y, false);
      return p;
    });
  }

  function fabPointerDown(e: React.PointerEvent) {
    fabMovedRef.current = false;
    dragRef.current = { ox: pos.x, oy: pos.y, px: e.clientX, py: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function fabPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || !fabRef.current) return;
    if (Math.abs(e.clientX - d.px) + Math.abs(e.clientY - d.py) > 8) {
      fabMovedRef.current = true;
    }
    const w = fabRef.current.offsetWidth;
    const h = fabRef.current.offsetHeight;
    setPos(clampPos(d.ox + e.clientX - d.px, d.oy + e.clientY - d.py, w, h));
  }

  function fabPointerUp(e: React.PointerEvent) {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const moved = fabMovedRef.current;
    if (!moved) {
      setMinimized(false);
      setPos((p) => {
        const c = clampPos(p.x, p.y, PANEL_W, PANEL_H);
        saveState(c.x, c.y, false);
        return c;
      });
    } else {
      setPos((p) => {
        saveState(p.x, p.y, true);
        return p;
      });
    }
  }

  function toggleMinimize() {
    setMenuOpen(false);
    setMinimized(true);
    setShowKeypad(false);
    setPos((p) => {
      const c = clampPos(p.x, p.y, FAB, FAB);
      saveState(c.x, c.y, true);
      return c;
    });
  }

  if (!ready) {
    return null;
  }

  if (minimized) {
    return (
      <div className="fx-mini-layer" data-tj-remote-root aria-hidden={false}>
        <button
          ref={fabRef}
          type="button"
          className="fx-mini__fab"
          style={{ left: pos.x, top: pos.y }}
          title={labels.expandFab}
          aria-label={labels.expandFab}
          data-tj-widget="fx-remote-v1"
          data-tj-style-slot="remote"
          onPointerDown={fabPointerDown}
          onPointerMove={fabPointerMove}
          onPointerUp={fabPointerUp}
          onPointerCancel={fabPointerUp}
        >
          💱
        </button>
      </div>
    );
  }

  return (
    <div className="fx-mini-layer" data-tj-remote-root>
      <div
        ref={panelRef}
        className="fx-mini"
        style={{ left: pos.x, top: pos.y }}
        data-tj-widget="fx-remote-v1"
        data-tj-style-slot="remote"
        role="dialog"
        aria-label={panelTitle}
        onPointerDown={panelDragStart}
        onPointerMove={panelDragMove}
        onPointerUp={panelDragEnd}
        onPointerCancel={panelDragEnd}
      >
        <div className="fx-mini__chrome" data-fx-drag-handle>
          <span className="fx-mini__grip" aria-hidden>
            ⋮
          </span>
          <span className="fx-mini__title">💱</span>
          <button
            type="button"
            className="fx-mini__icon-btn"
            aria-label={labels.menuAria}
            title={labels.menuAria}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋯
          </button>
          <button
            type="button"
            className="fx-mini__icon-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={toggleMinimize}
            title={labels.minimize}
          >
            −
          </button>
        </div>

        {menuOpen && (
          <div className="fx-mini__menu" ref={menuRef}>
            <button type="button" disabled={locale === 'th'} onClick={() => void toggleLocale('th')}>
              {labels.thaiUi}
            </button>
            <button type="button" disabled={locale === 'ko'} onClick={() => void toggleLocale('ko')}>
              {labels.koUi}
            </button>
            <button type="button" onClick={scrollMini}>
              {labels.minihome}
            </button>
            <button type="button" disabled title={labels.slotSoon}>
              {labels.slotEmpty}
            </button>
            <button type="button" onClick={() => void onRefresh()} disabled={refreshing}>
              {refreshing ? '…' : labels.refresh}
            </button>
            <p className="fx-mini__menu-meta">
              {snap.mock ? labels.mockLine : labels.liveLine}
              {labels.updated} {dateShort}
              {snap.mock ? ` · ${labels.fallback}` : ''}
            </p>
            <p className="fx-mini__menu-meta fx-mini__menu-meta--hint">{labels.styleHint}</p>
          </div>
        )}

        <div className="fx-mini__rates" title={`1 USD = ${snap.usdToThb.toFixed(2)} THB, ${Math.round(snap.usdToKrw)} KRW`}>
          1$≈{snap.usdToThb.toFixed(1)}฿·{Math.round(snap.usdToKrw / 1000)}k₩
        </div>

        {styleLine && (
          <div className="fx-mini__style" aria-live="polite" title={labels.styleHint}>
            {styleLine}
          </div>
        )}

        <div className="fx-mini__pills">
          {(['THB', 'KRW', 'USD'] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={'fx-mini__pill' + (base === c ? ' fx-mini__pill--on' : '')}
              onClick={() => setBase(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <input
          id="fx-amt"
          className="fx-mini__input"
          inputMode="decimal"
          value={amountStr}
          onChange={(e) => setAmountStr(normalizeAmount(e.target.value))}
          placeholder="0"
          autoComplete="off"
          aria-label={labels.amountLabel}
        />

        <div className="fx-mini__out" role="status">
          {fmtLine(outThb, outKrw, outUsd)}
        </div>

        <button type="button" className="fx-mini__kp-toggle" onClick={() => setShowKeypad((v) => !v)}>
          {showKeypad ? labels.keypadHide : labels.keypadShow}
        </button>

        {showKeypad && (
          <div className="fx-mini__pad">
            {NUM_KEYS.map((k) => (
              <button key={k} type="button" className="fx-mini__key" onClick={() => appendKey(k)}>
                {k}
              </button>
            ))}
            <button type="button" className="fx-mini__key" onClick={() => appendKey('.')}>
              .
            </button>
            <button type="button" className="fx-mini__key" onClick={() => appendKey('0')}>
              0
            </button>
            <button type="button" className="fx-mini__key fx-mini__key--wide" onClick={backspace}>
              ⌫
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
