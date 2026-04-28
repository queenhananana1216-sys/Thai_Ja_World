import type { ReactNode } from 'react';
import styles from '../portal-2026.module.css';
import type { PortalFxSnapshot } from '../types';

type WingCopy = {
  tag: string;
  headline: string;
  bodyLines: readonly [string, string];
  cta: string;
  foot: string;
};

const WING_LEFT: WingCopy = {
  tag: 'AD · 스폰서',
  headline: '태자 월드 프리미엄',
  bodyLines: ['한인 기업', '브랜딩 존'],
  cta: '상담 예약',
  foot: '광고·제휴 문의',
};

const WING_RIGHT: WingCopy = {
  tag: 'AD · 스폰서',
  headline: '번개딜 프로모션',
  bodyLines: ['주말 한정', '상단 노출'],
  cta: '즉시 집행',
  foot: '광고·제휴 문의',
};

function WingAdInner({ copy }: { copy: WingCopy }) {
  return (
    <div className={styles.wingInner}>
      <div className={styles.wingTag}>{copy.tag}</div>
      <div className={styles.wingHeadline}>{copy.headline}</div>
      <div className={styles.wingBody}>
        {copy.bodyLines[0]}
        <br />
        {copy.bodyLines[1]}
      </div>
      <div className={styles.wingCta}>{copy.cta}</div>
      <div className={styles.wingFoot}>{copy.foot}</div>
    </div>
  );
}

function FxBlock({ fx }: { fx: PortalFxSnapshot }) {
  const rows = [
    { pair: 'THB/KRW', rate: fx.thbKrw },
    { pair: 'USD/THB', rate: fx.usdThb },
    { pair: 'USD/KRW', rate: fx.usdKrw },
  ].filter((r) => r.rate);

  return (
    <div className={styles.fxWidget}>
      <div className={styles.fxTitle}>환율 스냅샷</div>
      {rows.length === 0 ? (
        <div className={styles.fxHint}>
          환율 표시값이 없습니다.
          <br />
          <code style={{ fontSize: 8 }}>NEXT_PUBLIC_PORTAL_FX_THB_KRW</code> 등 환경 변수로 주입하세요.
        </div>
      ) : (
        <>
          {rows.map((r) => (
            <div className={styles.fxRow} key={r.pair}>
              <span className={styles.fxPair}>{r.pair}</span>
              <span className={styles.fxRate}>{r.rate}</span>
            </div>
          ))}
          <div className={styles.fxHint}>
            {fx.updatedLabel ?? '참고용 · 실거래와 다를 수 있음'}
          </div>
        </>
      )}
    </div>
  );
}

export function PortalShell({
  header,
  children,
  fx,
}: {
  header: ReactNode;
  children: ReactNode;
  fx: PortalFxSnapshot;
}) {
  return (
    <div className={styles.shell} data-tj-portal-2026>
      <div className={styles.grid3} role="presentation">
        <aside className={styles.wing} aria-label="왼쪽 스티키 광고">
          <WingAdInner copy={WING_LEFT} />
        </aside>
        <div className={styles.main}>
          <div className={styles.stickyChrome}>{header}</div>
          {children}
        </div>
        <aside className={styles.wing} aria-label="오른쪽 스티키 광고 및 환율">
          <WingAdInner copy={WING_RIGHT} />
          <FxBlock fx={fx} />
        </aside>
      </div>
    </div>
  );
}
