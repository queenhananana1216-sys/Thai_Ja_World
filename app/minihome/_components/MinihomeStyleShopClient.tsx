'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  tier: string;
  min_days_since_join: number;
  min_activity_grade: number;
  source_type: 'platform' | 'local_sponsor';
  sponsor_name: string | null;
  sponsor_region: string | null;
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
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ShopRow[] | null>(null);
  const [owned, setOwned] = useState<Map<string, OwnedRow>>(new Map());
  const [balance, setBalance] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState('room_skin');
  const [checkedIn, setCheckedIn] = useState(false);
  const [activityGrade, setActivityGrade] = useState(1);
  const [daysSinceJoin, setDaysSinceJoin] = useState(0);

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
        .select('item_key,category,price_points,rental_days,rental_price,label_ko,label_th,sort_order,preview_url,tier,min_days_since_join,min_activity_grade,source_type,sponsor_name,sponsor_region')
        .eq('active', true)
        .order('sort_order', { ascending: true }),
      sb.from('active_unlocks')
        .select('item_key,expires_at,equipped,days_remaining')
        .eq('profile_id', user.id),
      sb.from('profiles')
        .select('style_score_total,activity_grade,created_at')
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
    const ag = prof.data?.activity_grade;
    setActivityGrade(typeof ag === 'number' ? ag : 1);
    const ca = prof.data?.created_at;
    if (typeof ca === 'string') {
      setDaysSinceJoin(Math.floor((Date.now() - new Date(ca).getTime()) / 86_400_000));
    }
  }, [m.styleShopLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const c = searchParams.get('cat');
    if (c && CATEGORIES.some((x) => x.key === c)) {
      setActiveCat(c);
    }
  }, [searchParams]);

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
      const today = new Date().toISOString().slice(0, 10);
      await sb.rpc('quest_record_progress', {
        p_profile_id: (await sb.auth.getUser()).data.user?.id ?? null,
        p_event_type: 'daily_checkin',
        p_amount: 1,
        p_source: 'minihome_shop_checkin',
        p_dedupe_key: `daily_checkin:${today}`,
        p_metadata: { source: 'minihome_shop' },
      });
      setToast(`฿ +${res.amount} ${m.thaiLabel}`);
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

      <p className="thai-shop-lead">{m.styleShopLead}</p>
      <div
        style={{
          margin: '0.75rem 0 0',
          padding: '0.65rem 0.75rem',
          borderRadius: 12,
          border: '1px solid var(--tj-line)',
          background: 'linear-gradient(135deg, rgba(14,165,233,0.07), rgba(139,92,246,0.06))',
          fontSize: '0.85rem',
          lineHeight: 1.45,
        }}
      >
        <strong style={{ display: 'block', marginBottom: '0.35rem' }}>살자 수익형 게이트웨이</strong>
        타이가 부족하면 카드로 충전하고, 미니홈 특전은 프리미엄과 함께 보세요.
        <span style={{ display: 'block', marginTop: '0.45rem' }}>
          <Link href="/wallet/topup" style={{ color: 'var(--tj-link, #0ea5e9)', fontWeight: 700, marginRight: '1rem' }}>
            타이(THAI) 카드 충전 →
          </Link>
          <Link href="/premium" style={{ color: 'var(--tj-link, #a78bfa)', fontWeight: 700 }}>
            프리미엄 구독 →
          </Link>
        </span>
      </div>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
        <Link href="/shop" style={{ color: 'var(--tj-link, #7c3aed)', fontWeight: 700 }}>
          {m.styleShopPremiumBoutiqueLink}
        </Link>
      </p>

      {/* Balance + Grade + Checkin */}
      <div className="thai-balance-bar">
        <div className="thai-balance-bar__left">
          <span className="thai-balance-bar__icon" aria-hidden>
            ฿
          </span>
          <strong className="thai-balance-bar__label">{m.styleShopBalance}</strong>
          <span className="thai-balance-bar__amount">{balance ?? '—'}</span>
          <span className="thai-grade" title={`활동 등급 ${activityGrade}`}>
            {'★'.repeat(activityGrade)}{'☆'.repeat(5 - activityGrade)}
          </span>
        </div>
        <button
          type="button"
          className="thai-checkin-btn"
          disabled={checkedIn}
          onClick={() => void checkin()}
        >
          {checkedIn ? m.styleShopCheckedIn : m.styleShopCheckin}
        </button>
      </div>

      {err ? <p className="auth-inline-error">{err}</p> : null}
      {toast ? <p className="auth-field-hint">{toast}</p> : null}

      {/* Category Tabs */}
      <nav className="thai-cat-tabs" aria-label="shop categories">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`thai-cat-tab${activeCat === c.key ? ' thai-cat-tab--active' : ''}`}
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
        <ul className="thai-grid">
          {filteredItems.map((row) => {
            const o = owned.get(row.item_key);
            const has = !!o;
            const canBuyPerm = balance !== null && balance >= row.price_points;
            const canBuyRent = row.rental_price !== null && balance !== null && balance >= row.rental_price;
            const loading = busyKey === row.item_key;
            const meetsDay = daysSinceJoin >= row.min_days_since_join;
            const meetsGrade = activityGrade >= row.min_activity_grade;
            const locked = !meetsDay || !meetsGrade;
            const tierCls = row.tier === 'legend' ? ' thai-item--legend' : row.tier === 'premium' ? ' thai-item--premium' : '';

            return (
              <li key={row.item_key} className={`thai-item${tierCls}`}>
                <div className="thai-item__head">
                  <span className="thai-item__name">{labelFor(row)}</span>
                  <div className="thai-item__tags">
                    {row.tier !== 'normal' && (
                      <span className={`thai-tier-badge thai-tier-badge--${row.tier}`}>
                        {row.tier === 'legend' ? 'LEGEND' : 'PREMIUM'}
                      </span>
                    )}
                    {row.source_type === 'local_sponsor' && (
                      <span className="thai-item__tag" title={row.sponsor_name ?? undefined}>
                        {row.sponsor_region ? `LOCAL · ${row.sponsor_region}` : 'LOCAL SPONSOR'}
                      </span>
                    )}
                    {row.rental_days ? (
                      <span className="thai-item__tag thai-item__tag--rental">
                        {m.styleShopRentalTag.replace('{days}', String(row.rental_days))}
                      </span>
                    ) : (
                      <span className="thai-item__tag thai-item__tag--perm">{m.styleShopPermTag}</span>
                    )}
                  </div>
                </div>

                {/* Lock message */}
                {locked && !has && (
                  <div className="thai-item__lock">
                    {!meetsDay && (
                      <p>가입 후 {row.min_days_since_join}일 필요 (D-{row.min_days_since_join - daysSinceJoin})</p>
                    )}
                    {!meetsGrade && (
                      <p>활동 등급 {row.min_activity_grade} 이상 필요 (현재 {activityGrade})</p>
                    )}
                  </div>
                )}

                {/* Price row */}
                {!locked && (
                  <div className="thai-item__prices">
                    {row.rental_days && row.rental_price !== null && (
                      <span className="thai-item__price">
                        ฿ {row.rental_price} <small>/ {row.rental_days}일</small>
                      </span>
                    )}
                    <span className="thai-item__price thai-item__price--perm">
                      ฿ {row.price_points} <small>(영구)</small>
                    </span>
                  </div>
                )}

                {/* Owned / Remaining days */}
                {has && o.days_remaining !== null && (
                  <p className="thai-item__expire">
                    {m.styleShopDaysLeft.replace('{n}', String(o.days_remaining))}
                  </p>
                )}
                {has && o.expires_at === null && (
                  <p className="thai-item__perm-owned">{m.styleShopOwned} ({m.styleShopPermTag})</p>
                )}

                {/* Actions */}
                <div className="thai-item__actions">
                  {has ? (
                    <button
                      type="button"
                      className="thai-btn thai-btn--equip"
                      disabled={loading}
                      onClick={() => void equip(row.item_key)}
                    >
                      {loading ? '...' : m.styleShopEquip}
                    </button>
                  ) : locked ? null : (
                    <>
                      {row.rental_days && row.rental_price !== null && (
                        <button
                          type="button"
                          className="thai-btn thai-btn--rent"
                          disabled={loading || !canBuyRent}
                          onClick={() => void buy(row.item_key, true)}
                        >
                          {loading ? '...' : m.styleShopBuyRental.replace('{days}', String(row.rental_days))}
                        </button>
                      )}
                      <button
                        type="button"
                        className="thai-btn thai-btn--buy"
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
