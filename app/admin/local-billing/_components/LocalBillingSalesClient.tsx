'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import TableStickerQr from './TableStickerQr';

const btnPrimary: CSSProperties = {
  padding: '10px 14px',
  background: '#7c3aed',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
};
const btnGhost: CSSProperties = {
  padding: '10px 14px',
  background: '#f1f5f9',
  color: '#334155',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
const panelStyle: CSSProperties = {
  marginBottom: 20,
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  padding: 16,
};
const labelStyle: CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#475569' };
const inputStyle: CSSProperties = {
  width: '100%',
  maxWidth: 520,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 14,
};
const mutedStyle: CSSProperties = { fontSize: 13, color: '#64748b', lineHeight: 1.55 };
const subtitleStyle: CSSProperties = { marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 800, color: '#0f172a' };

export type BillingSpotRow = {
  id: string;
  name: string;
  slug: string;
  minihome_public_slug: string | null;
  owner_profile_id: string | null;
  menuAbsoluteUrl: string;
  stripe_customer_id?: string | null;
  subscription_status?: string | null;
  trial_ends_at?: string | null;
};

function pathSlug(s: Pick<BillingSpotRow, 'slug' | 'minihome_public_slug'>): string {
  return String(s.slug ?? '').trim() || String(s.minihome_public_slug ?? '').trim();
}

function formatSubscriptionLabel(raw: string | null | undefined): string {
  const v = (raw ?? 'none').toLowerCase();
  switch (v) {
    case 'active':
      return 'Active';
    case 'canceled':
    case 'cancelled':
      return 'Canceled';
    case 'trialing':
      return 'Trialing';
    case 'none':
    default:
      return 'None';
  }
}

function trialDaysRemaining(trialEndsAt: string | null | undefined, status: string | null | undefined): string {
  if (status !== 'trialing' || !trialEndsAt) return '—';
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return '—';
  const days = Math.ceil((end - Date.now()) / 86_400_000);
  if (days > 1) return `${days}일 남음`;
  if (days === 1) return '1일 남음';
  if (days === 0) return '오늘 종료';
  return '종료됨';
}

export default function LocalBillingSalesClient({ spots }: { spots: BillingSpotRow[] }) {
  const [selectedId, setSelectedId] = useState<string>(spots[0]?.id ?? '');
  const [overrideEmail, setOverrideEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastEmailUsed, setLastEmailUsed] = useState<string | null>(null);

  const selected = useMemo(() => spots.find((s) => s.id === selectedId) ?? null, [spots, selectedId]);

  const salesMessage = useMemo(() => {
    if (!checkoutUrl) return '';
    return (
      `[태국에, 살자 / Living in Thai]\n` +
      `안녕하세요! 테이블 다국어 주문기 1개월 무료 체험 등록 링크입니다.\n` +
      `카드만 등록해 주시면 첫 달은 결제 없이 이용 가능합니다.\n\n` +
      checkoutUrl
    );
  }, [checkoutUrl]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('복사:', text);
    }
  };

  const generateStripeLink = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/billing/sales-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localSpotId: selectedId,
          ownerEmailOverride: overrideEmail.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        checkoutUrl?: string;
        error?: string;
        hint?: string;
        customerEmailUsed?: string;
      };
      if (!res.ok) {
        throw new Error([data.error, data.hint].filter(Boolean).join(' — '));
      }
      setCheckoutUrl(data.checkoutUrl ?? null);
      setLastEmailUsed(data.customerEmailUsed ?? null);
    } catch (e) {
      setCheckoutUrl(null);
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(false);
    }
  };

  if (spots.length === 0) {
    return (
      <div className="admin-dash__alert">
        등록된 로컬 가게가 없습니다. 먼저 <strong>로컬 가게 관리</strong>에서 업소를 만든 뒤 오너를 연결하세요.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <section style={panelStyle}>
        <label style={labelStyle} htmlFor="billing-spot-select">
          영업 대상 가게
        </label>
        <select
          id="billing-spot-select"
          style={{ ...inputStyle, maxWidth: 'min(100%, 520px)' }}
          value={selectedId}
          onChange={(e) => {
            setSelectedId(e.target.value);
            setCheckoutUrl(null);
            setError(null);
          }}
        >
          {spots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · /local/{pathSlug(s)}/…
            </option>
          ))}
        </select>

        {selected ? (
          <>
            <TableStickerQr menuUrl={selected.menuAbsoluteUrl} spotName={selected.name} />

            <div style={{ ...panelStyle, marginTop: 20 }}>
              <h3 style={subtitleStyle}>② Stripe · 1개월 무료 체험 체크아웃 링크</h3>
              <p style={{ ...mutedStyle, marginBottom: 12 }}>
                오너 계정 이메일로 Stripe 세션이 열립니다. 이메일이 없으면 아래에 영업용으로만 임시 입력하세요.
              </p>
              <label style={labelStyle} htmlFor="owner-email-override">
                오너 이메일 오버라이드 (선택)
              </label>
              <input
                id="owner-email-override"
                type="email"
                style={{ ...inputStyle, maxWidth: 400 }}
                placeholder="owner@example.com"
                value={overrideEmail}
                onChange={(e) => setOverrideEmail(e.target.value)}
              />
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  style={{ ...btnPrimary, opacity: busy || !selected.owner_profile_id ? 0.55 : 1 }}
                  disabled={busy || !selected.owner_profile_id}
                  onClick={() => void generateStripeLink()}
                >
                  {busy ? '링크 생성 중…' : '체크아웃 링크 생성'}
                </button>
                {!selected.owner_profile_id ? (
                  <span style={mutedStyle}>오너 미연결 — 로컬 가게 관리에서 오너를 지정하세요.</span>
                ) : null}
              </div>
              {error ? <div className="admin-dash__alert" style={{ marginTop: 12 }}>{error}</div> : null}
              {checkoutUrl ? (
                <div style={{ marginTop: 16 }}>
                  <p style={{ ...mutedStyle, marginBottom: 6 }}>
                    생성됨 {lastEmailUsed ? `(수신·프리필: ${lastEmailUsed})` : null}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" style={btnGhost}>
                      새 탭에서 열기
                    </a>
                    <button type="button" style={btnGhost} onClick={() => void copyText(checkoutUrl)}>
                      링크 복사
                    </button>
                    <button type="button" style={btnGhost} onClick={() => void copyText(salesMessage)}>
                      SMS·카톡용 문구 복사
                    </button>
                  </div>
                  <textarea
                    readOnly
                    style={{ ...inputStyle, marginTop: 12, width: '100%', minHeight: 120, fontSize: 12, fontFamily: 'monospace' }}
                    value={salesMessage}
                  />
                  <p style={{ ...mutedStyle, marginTop: 8, fontSize: 11 }}>
                    모바일: 문자 앱에서 직접 붙여넣기 하거나, 카카오톡에 위 문구를 그대로 전달하세요.
                  </p>
                </div>
              ) : null}
            </div>

            <div style={{ ...panelStyle, marginTop: 20 }}>
              <h3 style={subtitleStyle}>③ 구독 · 무료 체험 모니터링</h3>
              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr',
                  gap: '8px 16px',
                  margin: 0,
                  fontSize: 14,
                }}
              >
                <dt style={mutedStyle}>상태</dt>
                <dd style={{ margin: 0 }}>{formatSubscriptionLabel(selected.subscription_status)}</dd>
                <dt style={mutedStyle}>남은 무료 체험</dt>
                <dd style={{ margin: 0 }}>{trialDaysRemaining(selected.trial_ends_at, selected.subscription_status)}</dd>
                <dt style={mutedStyle}>Stripe Customer</dt>
                <dd style={{ margin: 0, wordBreak: 'break-all' }}>
                  {selected.stripe_customer_id?.trim() ? selected.stripe_customer_id : '— (미등록)'}
                </dd>
                <dt style={mutedStyle}>trial_ends_at</dt>
                <dd style={{ margin: 0 }}>{selected.trial_ends_at ?? '—'}</dd>
              </dl>
              <p style={{ ...mutedStyle, marginTop: 12, fontSize: 11 }}>
                값은 Stripe 웹훅 동기화 기준입니다. DB 마이그레이션 <code>131_b2b_saas_billing</code> 적용 후 갱신됩니다.
              </p>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
