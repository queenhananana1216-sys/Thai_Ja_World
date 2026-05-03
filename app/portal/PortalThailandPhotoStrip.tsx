import Link from 'next/link';
import GuestGateLink from '@app/_components/GuestGateLink';
import type { Locale } from '@/i18n/types';
import styles from './portal-2026.module.css';

export type ThailandPhotoItem = { href: string; thumbUrl: string; title: string };

type PortalThailandPhotoStripProps = {
  photos: ThailandPhotoItem[];
  title: string;
  locale: Locale;
  isLoggedIn: boolean;
};

export default function PortalThailandPhotoStrip({
  photos,
  title,
  locale,
  isLoggedIn,
}: PortalThailandPhotoStripProps) {
  const safe = photos.filter((p) => p?.href?.trim() && p?.thumbUrl?.trim()).slice(0, 10);
  if (safe.length === 0) return null;

  const snapLabel =
    locale === 'th' ? 'ภาพถ่ายล่าสุดจากชุมชน — เลื่อนดูได้' : '커뮤니티 최근 사진 — 가로로 밀어 보세요';

  return (
    <section className={`${styles.glassGold} ${styles.photoStripSection} overflow-hidden`} aria-label={title}>
      <header className={styles.photoStripHead}>
        <span className="text-lg font-black tracking-tight text-amber-100" aria-hidden>
          📷
        </span>
        <h2 className="m-0 min-w-0 flex-1 text-base font-black leading-tight text-amber-50 md:text-lg">{title}</h2>
      </header>
      <p className={`m-0 px-2 pb-1 text-xs font-medium text-amber-100/80 max-[768px]:px-1.5 md:text-sm`}>{snapLabel}</p>
      <div className={styles.photoStripScroll} tabIndex={0}>
        <ul className={styles.photoStripList}>
          {safe.map((p, i) => (
            <li key={`${p.href}-${i}`} className={styles.photoStripItem}>
              <GuestGateLink
                href={p.href}
                isLoggedIn={isLoggedIn}
                className={styles.photoStoryLink}
                title={p.title}
              >
                <span className={styles.photoStoryRing}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 외부·스토리지 혼합 URL */}
                  <img
                    src={p.thumbUrl}
                    alt=""
                    className={styles.photoStoryImg}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className={styles.photoStoryCaption}>{p.title.slice(0, 18)}{p.title.length > 18 ? '…' : ''}</span>
              </GuestGateLink>
            </li>
          ))}
          <li className={`${styles.photoStripItem} shrink-0`} aria-hidden>
            <Link prefetch={true} href="/boards" className={styles.photoStoryMore}>
              {locale === 'th' ? 'ทั้งหมด →' : '더보기 →'}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
