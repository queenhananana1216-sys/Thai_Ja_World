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
  label_ko: string;
  label_th: string;
  sort_order: number;
};

export default function MinihomeStyleShopClient() {
  const { locale, d } = useClientLocaleDictionary();
  const m = d.minihome;
  const [items, setItems] = useState<ShopRow[] | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

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
      sb.from('style_shop_items').select('item_key,category,price_points,label_ko,label_th,sort_order').eq('active', true).order('sort_order', { ascending: true }),
      sb.from('profile_style_unlocks').select('item_key').eq('profile_id', user.id),
      sb.from('profiles').select('style_score_total').eq('id', user.id).maybeSingle(),
    ]);

    if (cat.error) {
      setErr(m.styleShopLoadError);
      setItems([]);
      return;
    }
    setItems((cat.data ?? []) as ShopRow[]);
    setOwned(new Set((inv.data ?? []).map((r) => r.item_key as string)));
    const b = prof.data?.style_score_total;
    setBalance(typeof b === 'number' ? b : 0);
  }, [m.styleShopLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const skins = useMemo(() => (items ?? []).filter((r) => r.category === 'room_skin'), [items]);
  const minimis = useMemo(() => (items ?? []).filter((r) => r.category === 'minimi'), [items]);

  async function buy(key: string) {
    setToast(null);
    setErr(null);
    setBusyKey(key);
    const sb = createBrowserClient();
    const { error } = await sb.rpc('style_purchase_item', { p_item_key: key });
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

  function renderGrid(rows: ShopRow[]) {
    if (!rows.length) return <p className="auth-field-hint">{m.styleShopEmpty}</p>;
    return (
      <ul className="style-shop-grid">
        {rows.map((row) => {
          const has = owned.has(row.item_key);
          const canBuy = balance !== null && balance >= row.price_points;
          const loading = busyKey === row.item_key;
          return (
            <li key={row.item_key} className="style-shop-card card">
              <div className="style-shop-card__head">
                <span className="style-shop-card__name">{labelFor(row)}</span>
                <span className="style-shop-card__price">
                  {row.price_points} {m.styleScoreLabel}
                </span>
              </div>
              <div className="style-shop-card__actions">
                {has ? (
                  <>
                    <span className="style-shop-card__owned">{m.styleShopOwned}</span>
                    <button
                      type="button"
                      className="board-form__submit"
                      style={{ background: '#fff', color: 'var(--tj-ink)', border: '1px solid var(--tj-line)' }}
                      disabled={loading}
                      onClick={() => void equip(row.item_key)}
                    >
                      {loading ? m.loadingMark : m.styleShopEquip}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="board-form__submit"
                    disabled={loading || !canBuy}
                    title={!canBuy ? m.styleShopNeedPoints : undefined}
                    onClick={() => void buy(row.item_key)}
                  >
                    {loading ? m.loadingMark : m.styleShopBuy}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
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

      <p style={{ margin: '0 0 16px', lineHeight: 1.55, color: 'var(--tj-muted)', fontSize: '0.9rem' }}>
        {m.styleShopLead}
      </p>

      <div className="style-shop-balance card" style={{ padding: 14, marginBottom: 20 }}>
        <strong>{m.styleShopBalance}</strong>
        <span style={{ marginLeft: 10, fontSize: '1.15rem' }}>{balance ?? m.emDash}</span>
      </div>

      {err ? <p className="auth-inline-error">{err}</p> : null}
      {toast ? <p className="auth-field-hint">{toast}</p> : null}

      {items === null ? (
        <p style={{ color: 'var(--tj-muted)' }}>{m.loadingMark}</p>
      ) : (
        <>
          <h2 className="minihome-edit-form__h">{m.styleShopCatSkin}</h2>
          {renderGrid(skins)}
          <h2 className="minihome-edit-form__h" style={{ marginTop: 28 }}>
            {m.styleShopCatMinimi}
          </h2>
          {renderGrid(minimis)}
        </>
      )}
    </div>
  );
}
