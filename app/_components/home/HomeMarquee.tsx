import { fetchHomeNewsMarqueeTitles } from './home-queries';
import styles from './home-hub.module.css';

export async function HomeMarquee() {
  try {
    const { titles, error } = await fetchHomeNewsMarqueeTitles(22);
    if (error) return null;
    const safeTitles = titles ?? [];
    if (safeTitles.length === 0) return null;

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
    return null;
  }
}
