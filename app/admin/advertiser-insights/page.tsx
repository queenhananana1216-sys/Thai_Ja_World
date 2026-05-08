'use client';

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';

type Row = {
  banner_id: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  title: string | null;
  placement: string | null;
  sponsor_label: string | null;
};

type MinihomeSlugRow = { slug: string; views: number };

type Payload = {
  window_days?: number;
  shop_page_views?: number;
  minihome_page_views_total?: number;
  minihome_distinct_sessions_estimate?: number;
  minihome_top_slugs?: MinihomeSlugRow[];
  banner_rows?: Row[];
  note_ctr?: string;
  error?: string;
};

export default function AdvertiserInsightsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch('/api/admin/advertiser-insights', { cache: 'no-store' });
      const j = (await res.json().catch(() => ({}))) as Payload;
      if (!res.ok) {
        setErr(j.error ?? '불러오기 실패');
        setData(null);
        return;
      }
      setData(j);
    } catch {
      setErr('불러오기 실패');
      setData(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ maxWidth: 960 }}>
      <h1 style={{ margin: '0 0 10px', fontSize: '1.5rem', fontWeight: 880 }}>광고·스폰서 인사이트</h1>
      <p style={{ margin: '0 0 18px', fontSize: 13, opacity: 0.86 }}>
        로그는 <code style={{ opacity: 0.9 }}>/api/analytics/track</code> → <code style={{ opacity: 0.9 }}>site_analytics</code> 에 쌓입니다.
        미니홈·샵 페이지뷰는 경로 기반 추정이며 영업 회의 자료 보조 지표입니다.
      </p>
      <button
        type="button"
        onClick={() => void load()}
        style={{
          marginBottom: 18,
          minHeight: 44,
          padding: '0 16px',
          borderRadius: 10,
          fontWeight: 700,
          border: '1px solid #94a3b8',
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        새로고침
      </button>

      {err ? (
        <p style={{ color: '#b45309' }}>{err}</p>
      ) : !data ? (
        <p style={{ opacity: 0.7 }}>로드 중…</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
            <MiniStat label={`윈도(일)`} value={data.window_days ?? '—'} />
            <MiniStat label="샵 페이지뷰(추정)" value={data.shop_page_views ?? 0} />
            <MiniStat label="미니홈 PV(합산)" value={data.minihome_page_views_total ?? 0} />
            <MiniStat
              label="미니홈 세션(추정)"
              value={data.minihome_distinct_sessions_estimate ?? 0}
            />
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>배너 성과 (클릭·노출·CTR)</h2>

          {data.note_ctr ? (
            <p style={{ margin: '0 0 12px', fontSize: 12, opacity: 0.75 }}>{data.note_ctr}</p>
          ) : null}

          {(data.banner_rows ?? []).length === 0 ? (
            <p style={{ opacity: 0.7 }}>
              배너 클릭·노출 로그가 거의 없습니다. 퀵메뉴 스폰서·홈 스트립에 배너를 올리고
              <code style={{ marginLeft: 6, marginRight: 6 }}>target_intents</code>를 채워 주세요.
            </p>
          ) : (
            <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid #cbd5e1' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={th}>제목</th>
                    <th style={th}>슬롯</th>
                    <th style={th}>노출</th>
                    <th style={th}>클릭</th>
                    <th style={th}>CTR</th>
                    <th style={th}>banner_id</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.banner_rows ?? []).map((r) => (
                    <tr key={r.banner_id}>
                      <td style={td}>{r.title ?? '—'}</td>
                      <td style={td}>{r.placement ?? '—'}</td>
                      <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>
                        {r.impressions ?? 0}
                      </td>
                      <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{r.clicks}</td>
                      <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>
                        {r.ctr === null || r.ctr === undefined
                          ? '—'
                          : `${(r.ctr * 100).toFixed(2)}%`}
                      </td>
                      <td style={{ ...td, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{r.banner_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 style={{ fontSize: 15, fontWeight: 900, margin: '22px 0 10px' }}>미니홈 조회 상위 슬러그</h2>
          {(data.minihome_top_slugs ?? []).length === 0 ? (
            <p style={{ opacity: 0.7 }}>/minihome/… 페이지뷰 로그가 이 기간에는 거의 없습니다.</p>
          ) : (
            <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid #cbd5e1' }}>
              <table style={{ width: '100%', maxWidth: 520, borderCollapse: 'collapse', fontSize: 13, background: '#fff' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={th}>slug</th>
                    <th style={th}>뷰</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.minihome_top_slugs ?? []).map((m) => (
                    <tr key={m.slug}>
                      <td style={td}>{m.slug}</td>
                      <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{m.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ marginTop: 16, fontSize: 11, opacity: 0.65 }}>
            프리미엄 배너 <strong>추가 JSON</strong>: <code>{`{"target_intents":["real_estate","news","tips"]}`}</code>{' '}
            — <code>tj_sponsor_signals</code> 쿠키(뉴스·꿀팁·체류 패턴 가중)와 맞으면 해당 슬롯에서 순위가 올라갑니다.
          </p>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 12,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', opacity: 0.55 }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 21, fontWeight: 940, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

const th: CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 11,
  opacity: 0.75,
};
const td: CSSProperties = {
  padding: '10px 12px',
  borderTop: '1px solid #e5e7eb',
};
