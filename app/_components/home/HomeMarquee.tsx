import { fetchHomeNewsMarqueeTitles } from './home-queries';
import styles from './home-hub.module.css';

export async function HomeMarquee() {
  try {
    const { titles, error } = await fetchHomeNewsMarqueeTitles(22);
    const safeTitles = titles ?? [];
    if (error || safeTitles.length === 0) {
      return (
        <div
          className={`${styles.marqueeWrap} border border-slate-700/50 bg-slate-800/30`}
          aria-label="뉴스 타이틀 로딩"
          data-tj-marquee="empty"
        >
          <div className={`${styles.marqueeInner} animate-pulse text-slate-500`}>
            <span className={styles.marqueeItem}>· 뉴스 헤드라인을 불러오는 중입니다</span>
          </div>
        </div>
      );
    }

    const loop = [...safeTitles, ...safeTitles];
    return (
      <div className={styles.marqueeWrap} aria-label="최신 뉴스 타이틀">
        <div className={styles.marqueeInner}>
          {(loop ?? []).map((t, i) => (
            <span key={`marq-${i}`} className={styles.marqueeItem}>
              · {t}
            </span>
          ))}
        </div>
      </div>
    );
  } catch {
    return (
      <div
        className={`${styles.marqueeWrap} border border-slate-700/50 bg-slate-800/30`}
        aria-label="뉴스 타이틀 일시 중단"
        data-tj-marquee="fallback"
      >
        <div className={`${styles.marqueeInner} text-slate-500`}>
          <span className={styles.marqueeItem}>· 뉴스 영역은 곧 다시 표시됩니다</span>
        </div>
      </div>
    );
  }
}
