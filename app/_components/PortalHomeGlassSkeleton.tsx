import styles from '../portal/portal-2026.module.css';

/** Suspense 폴백 — 3열 글라스 뼈대 + 뉴스·보드 슬롯 스켈레톤(인라인 shimmer) */
export default function PortalHomeGlassSkeleton() {
  const bar = (w: string) => (
    <div
      className="h-2.5 rounded-md bg-slate-700/80"
      style={{
        width: w,
        animation: 'tj-shimmer 1.2s ease-in-out infinite',
        opacity: 0.85,
      }}
    />
  );

  return (
    <div className={styles.root} data-tj-root="portal-2026-skeleton" role="status" aria-live="polite">
      <p className="sr-only">포털 레이아웃을 준비하는 중입니다.</p>
      <div className={styles.grid}>
        <aside className="hidden min-h-0 min-w-0 min-[1181px]:block">
          <div className={styles.stickyWing}>
            <section className={`${styles.glassBlue} space-y-2 p-2.5`}>
              {bar('55%')}
              {bar('90%')}
              {bar('72%')}
            </section>
            <section className={`${styles.glassGold} space-y-2 p-2.5`}>
              {bar('40%')}
              {bar('88%')}
            </section>
          </div>
        </aside>
        <section className="min-h-0 min-w-0 space-y-2">
          <div className={`${styles.glassGold} space-y-2 p-2.5`}>
            {bar('50%')}
            {bar('95%')}
          </div>
          <div className={styles.boardGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <article key={`sk-${i}`} className={`${styles.glassCenter} min-w-0 overflow-hidden p-2`}>
                <div className="mb-2 flex gap-2">
                  {bar('35%')}
                  {bar('22%')}
                </div>
                <div className="space-y-1.5 px-1">
                  {bar('100%')}
                  {bar('92%')}
                  {bar('80%')}
                </div>
              </article>
            ))}
          </div>
          <section className={`${styles.glassBlue} overflow-hidden p-2`}>
            {bar('38%')}
            <div className="mt-2 space-y-1.5 px-1">
              {bar('100%')}
              {bar('96%')}
              {bar('88%')}
            </div>
          </section>
        </section>
        <aside className="hidden min-h-0 min-w-0 min-[1181px]:block">
          <div className={styles.stickyWing}>
            <section className={`${styles.glassBlue} space-y-2 p-2.5`}>
              {bar('36%')}
              <div className="space-y-1.5">
                {bar('100%')}
                {bar('94%')}
                {bar('78%')}
              </div>
            </section>
            <section className={`${styles.glassGold} space-y-2 p-2.5`}>
              {bar('34%')}
              {bar('85%')}
            </section>
          </div>
        </aside>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes tj-shimmer{0%,100%{opacity:.45}50%{opacity:1}}`,
        }}
      />
    </div>
  );
}
