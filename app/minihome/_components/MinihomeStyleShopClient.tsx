'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';
import { mapStyleRpcError } from '@/lib/minihome/styleRpcMessages';

type ShopRow = {
  item_key: string;
  category: string;
  price_points: number;
  rental_days: number | null;
  rental_price: number | null;
  label_ko: string;
  label_th: string;
  sort_order: number;
  preview_url: string | null;
};

type OwnedRow = {
  item_key: string;
  expires_at: string | null;
  equipped: boolean;
  days_remaining: number | null;
};

const CATEGORIES = [
  { key: 'room_skin', i18n: 'styleShopCatSkin' },
  { key: 'minimi', i18n: 'styleShopCatMinimi' },
  { key: 'bgm', i18n: 'styleShopCatBgm' },
  { key: 'wallpaper', i18n: 'styleShopCatWallpaper' },
  { key: 'profile_frame', i18n: 'styleShopCatFrame' },
] as const;

export default function MinihomeStyleShopClient() {
  const { locale, d } = useClientLocaleDictionary();
  const m = d.minihome;
  const [items, setItems] = useState<ShopRow[] | null>(null);
  const [owned, setOwned] = useState<Map<string, OwnedRow>>(new Map());
  const [balance, setBalance] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState('room_skin');
  const [checkedIn, setCheckedIn] = useState(false);

  const labelFor = useCallback(
    (row: ShopRow) => (locale === 'th' ? row.label_th : row.label_ko),
    [locale],
  );

  const load = useCallback(async () => {
    setErr(null);
    const sb = createBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      setItems([]);
      setBalance(null);
      return;
    }

    const [cat, inv, prof] = await Promise.all([
      sb.from('style_shop_items')
        .select('item_key,category,price_points,rental_days,rental_price,label_ko,label_th,sort_order,preview_url')
        .eq('active', true)
        .order('sort_order', { ascending: true }),
      sb.from('active_unlocks')
        .select('item_key,expires_at,equipped,days_remaining')
        .eq('profile_id', user.id),
      sb.from('profiles')
        .select('style_score_total')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (cat.error) {
      setErr(m.styleShopLoadError);
      setItems([]);
      return;
    }
    setItems((cat.data ?? []) as ShopRow[]);

    const ownMap = new Map<string, OwnedRow>();
    for (const r of (inv.data ?? []) as OwnedRow[]) {
      ownMap.set(r.item_key, r);
    }
    setOwned(ownMap);

    const b = prof.data?.style_score_total;
    setBalance(typeof b === 'number' ? b : 0);
  }, [m.styleShopLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(
    () => (items ?? []).filter((r) => r.category === activeCat),
    [items, activeCat],
  );

  async function buy(key: string, rental: boolean) {
    setToast(null);
    setErr(null);
    setBusyKey(key);
    const sb = createBrowserClient();
    const { error } = await sb.rpc('style_purchase_item', {
      p_item_key: key,
      p_rental: rental,
    });
    setBusyKey(null);
    if (error) {
      setErr(mapStyleRpcError(error.message, m));
      return;
    }
    setToast(m.styleShopPurchased);
    await load();
  }

  async function equip(key: string) {
    setToast(null);
    setErr(null);
    setBusyKey(key);
    const sb = createBrowserClient();
    const { error } = await sb.rpc('style_equip_item', { p_item_key: key });
    setBusyKey(null);
    if (error) {
      setErr(mapStyleRpcError(error.message, m));
      return;
    }
    setToast(m.styleShopEquipped);
  }

  async function checkin() {
    setToast(null);
    setErr(null);
    const sb = createBrowserClient();
    const { data, error } = await sb.rpc('dotori_daily_checkin');
    if (error) {
      setErr(error.message);
      return;
    }
    const res = data as { ok: boolean; amount?: number; reason?: string } | null;
    if (res?.ok) {
      setToast(`+${res.amount} ${m.dotoriLabel}!`);
      setCheckedIn(true);
      await load();
    } else {
      setCheckedIn(true);
    }
  }

  return (
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{m.styleShopTitle}</h1>
        <Link
          href="/minihome"
          className="board-form__submit"
          style={{ textAlign: 'center', background: '#fff', color: 'var(--tj-ink)', border: '1px solid var(--tj-line)' }}
        >
          ← {m.pageTitle}
        </Link>
      </div>

      <p className="dotori-shop-lead">{m.styleShopLead}</p>

      {/* Balance + Checkin */}
      <div className="dotori-balance-bar">
        <div className="dotori-balance-bar__left">
          <span className="dotori-balance-bar__icon">🌰</span>
          <strong className="dotori-balance-bar__label">{m.dotoriLabel}</strong>
          <span className="dotori-balance-bar__amount">{balance ?? '—'}</span>
        </div>
        <button
          type="button"
          className="dotori-checkin-btn"
          disabled={checkedIn}
          onClick={() => void checkin()}
        >
          {checkedIn ? m.styleShopCheckedIn : m.styleShopCheckin}
        </button>
      </div>

      {err ? <p className="auth-inline-error">{err}</p> : null}
      {toast ? <p className="auth-field-hint">{toast}</p> : null}

      {/* Category Tabs */}
      <nav className="dotori-cat-tabs" aria-label="shop categories">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`dotori-cat-tab${activeCat === c.key ? ' dotori-cat-tab--active' : ''}`}
            onClick={() => setActiveCat(c.key)}
          >
            {(m as Record<string, string>)[c.i18n] ?? c.key}
          </button>
        ))}
      </nav>

      {/* Items Grid */}
      {items === null ? (
        <p style={{ color: 'var(--tj-muted)' }}>{m.loadingMark}</p>
      ) : filteredItems.length === 0 ? (
        <p className="auth-field-hint">{m.styleShopEmpty}</p>
      ) : (
        <ul className="dotori-grid">
          {filteredItems.map((row) => {
            const o = owned.get(row.item_key);
            const has = !!o;
            const canBuyPerm = balance !== null && balance >= row.price_points;
            const canBuyRent = row.rental_price !== null && balance !== null && balance >= row.rental_price;
            const loading = busyKey === row.item_key;

            return (
              <li key={row.item_key} className="dotori-item">
                <div className="dotori-item__head">
                  <span className="dotori-item__name">{labelFor(row)}</span>
                  {row.rental_days ? (
                    <span className="dotori-item__tag dotori-item__tag--rental">
                      {m.styleShopRentalTag.replace('{days}', String(row.rental_days))}
                    </span>
                  ) : (
                    <span className="dotori-item__tag dotori-item__tag--perm">{m.styleShopPermTag}</span>
                  )}
                </div>

                {/* Price row */}
                <div className="dotori-item__prices">
                  {row.rental_days && row.rental_price !== null && (
                    <span className="dotori-item__price">
                      🌰 {row.rental_price} <small>/ {row.rental_days}일</small>
                    </span>
                  )}
                  <span className="dotori-item__price dotori-item__price--perm">
                    🌰 {row.price_points} {!row.rental_days && <small>(영구)</small>}
                    {row.rental_days && <small>(영구)</small>}
                  </span>
                </div>

                {/* Owned / Remaining days */}
                {has && o.days_remaining !== null && (
                  <p className="dotori-item__expire">
                    {m.styleShopDaysLeft.replace('{n}', String(o.days_remaining))}
                  </p>
                )}
                {has && o.expires_at === null && (
                  <p className="dotori-item__perm-owned">{m.styleShopOwned} ({m.styleShopPermTag})</p>
                )}

                {/* Actions */}
                <div className="dotori-item__actions">
                  {has ? (
                    <button
                      type="button"
                      className="dotori-btn dotori-btn--equip"
                      disabled={loading}
                      onClick={() => void equip(row.item_key)}
                    >
                      {loading ? '...' : m.styleShopEquip}
                    </button>
                  ) : (
                    <>
                      {row.rental_days && row.rental_price !== null && (
                        <button
                          type="button"
                          className="dotori-btn dotori-btn--rent"
                          disabled={loading || !canBuyRent}
                          onClick={() => void buy(row.item_key, true)}
                        >
                          {loading ? '...' : m.styleShopBuyRental.replace('{days}', String(row.rental_days))}
                        </button>
                      )}
                      <button
                        type="button"
                        className="dotori-btn dotori-btn--buy"
                        disabled={loading || !canBuyPerm}
                        title={!canBuyPerm ? m.styleShopNeedPoints : undefined}
                        onClick={() => void buy(row.item_key, false)}
                      >
                        {loading ? '...' : m.styleShopBuyPerm}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
