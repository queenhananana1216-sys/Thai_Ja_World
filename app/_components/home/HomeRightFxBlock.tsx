import { fetchUsdFx } from '@/lib/fx/fetchUsdFx';
import styles from './home-hub.module.css';

function fmtRate(n: number, digits: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  return n.toLocaleString('ko-KR', { maximumFractionDigits: digits, minimumFractionDigits: Math.min(2, digits) });
}

/** Frankfurter(ECB) USD 기준 환율 — 서버 fetch, revalidate 30분 */
export async function HomeRightFxBlock() {
  const snap = await fetchUsdFx({ next: { revalidate: 1800 } });
  const thbKrw = snap.usdToThb > 0 ? snap.usdToKrw / snap.usdToThb : 0;

  const rows = [
    { pair: 'THB/KRW', rate: fmtRate(thbKrw, 2) },
    { pair: 'USD/THB', rate: fmtRate(snap.usdToThb, 2) },
    { pair: 'USD/KRW', rate: fmtRate(snap.usdToKrw, 1) },
  ];

  return (
    <section className={styles.sideCard} aria-label="환율">
      <h2 className={styles.sideTitleMain} style={{ fontSize: '0.62rem', marginBottom: '0.18rem' }}>
        FX
      </h2>
      <div className={styles.fxCompact}>
        {rows.map((r) => (
          <div key={r.pair} className={styles.fxRowCompact}>
            <span className={styles.fxPairCompact}>{r.pair}</span>
            <span className={styles.fxRateCompact}>{r.rate}</span>
          </div>
        ))}
      </div>
      <p className={styles.fxFootCompact}>
        {snap.mock ? '참고용 스냅샷' : 'ECB/Frankfurter'}
        {' · '}
        {new Date(snap.dateISO).toLocaleDateString('ko-KR')}
      </p>
    </section>
  );
}
