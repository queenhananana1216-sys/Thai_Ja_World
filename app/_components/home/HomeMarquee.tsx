import { fetchHomeNewsMarqueeTitles } from './home-queries';
import styles from './home-hub.module.css';

export async function HomeMarquee() {
  try {
    const { titles, error } = await fetchHomeNewsMarqueeTitles(22);
    if (error) {
      return <p className={styles.errLine}>뉴스 마퀴: {error}</p>;
    }
    if (titles.length === 0) return null;

    const loop = [...titles, ...titles];
    return (
      <div className={styles.marqueeWrap} aria-label="최신 뉴스 타이틀">
        <div className={styles.marqueeInner}>
          {loop.map((t, i) => (
            <span key={`marq-${i}`} className={styles.marqueeItem}>
              · {t}
            </span>
          ))}
        </div>
      </div>
    );
  } catch (e) {
    return (
      <p className={styles.errLine}>
        뉴스 마퀴: {e instanceof Error ? e.message : '오류'}
      </p>
    );
  }
}
