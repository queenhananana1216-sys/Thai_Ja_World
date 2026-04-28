import Link from 'next/link';
import { fetchHomeLeftRailBanners } from './home-queries';
import styles from './home-hub.module.css';

/** 좌측 고정 세로 배너 레일 — `premium_banners` sidebar / home_strip */
export async function HomeLeftRailBanners() {
  try {
    const { rows, error } = await fetchHomeLeftRailBanners();
    if (error) return <div className={styles.leftRailSpacer} aria-hidden />;
    const withVisual = rows.filter((b) => Boolean(b.image_url?.trim()) || Boolean(b.href?.trim()));
    if (withVisual.length === 0) {
      return <div className={styles.leftRailSpacer} aria-hidden />;
    }

    return (
      <nav className={styles.leftRail} aria-label="스폰서 배너">
        {withVisual.map((b) => {
          const img = b.image_url?.trim();
          const href = b.href?.trim() || '#';
          const inner = img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt="" className={styles.leftRailImg} width={80} height={200} />
          ) : (
            <span className={styles.leftRailText}>{b.title}</span>
          );
          if (href === '#') {
            return (
              <div key={b.id} className={styles.leftRailCard}>
                {inner}
              </div>
            );
          }
          return (
            <Link key={b.id} href={href} className={styles.leftRailCard} target="_blank" rel="noopener noreferrer">
              {inner}
            </Link>
          );
        })}
      </nav>
    );
  } catch {
    return <div className={styles.leftRailSpacer} aria-hidden />;
  }
}
