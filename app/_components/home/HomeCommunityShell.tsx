import { Suspense } from 'react';
import Link from 'next/link';
import SiteSearch from '../SiteSearch';
import styles from './home-hub.module.css';
import { HomeMarquee } from './HomeMarquee';
import { HomeBannerSlot } from './HomeBannerSlot';
import { HomeGridJobs } from './HomeGridJobs';
import { HomeGridMarket } from './HomeGridMarket';
import { HomeGridLocal } from './HomeGridLocal';
import { HomeGridNews } from './HomeGridNews';
import { HomeRightUxStats } from './HomeRightUxStats';
import { HomeRightStatsSkeleton } from './HomeRightStatsSkeleton';
import { HomeFeedBlock } from './HomeFeedBlock';

const QUICK = [
  { href: '/portal', label: '포털' },
  { href: '/community/boards', label: '게시판' },
  { href: '/news', label: '뉴스' },
  { href: '/local', label: '로컬' },
  { href: '/tips', label: '꿀팁' },
  { href: '/chat', label: '채팅' },
] as const;

export default function HomeCommunityShell() {
  return (
    <main className={styles.root}>
      <header className={styles.toolbar}>
        <SiteSearch variant="nate" />
        <nav className={styles.toolbarNav} aria-label="주요 이동">
          {QUICK.map((q) => (
            <Link key={q.href} href={q.href}>
              {q.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className={styles.topBand}>
        <Suspense fallback={<div className={styles.marqueeWrap}><div className={styles.pulse} /></div>}>
          <HomeMarquee />
        </Suspense>
        <Suspense fallback={<div className={styles.sliderHost}><div className={styles.pulse} /></div>}>
          <HomeBannerSlot />
        </Suspense>
      </div>

      <div className={styles.bodyGrid}>
        <div>
          <div className={styles.philgo}>
            <Suspense fallback={<div className={styles.panel}><div className={styles.pulse} /></div>}>
              <HomeGridJobs />
            </Suspense>
            <Suspense fallback={<div className={styles.panel}><div className={styles.pulse} /></div>}>
              <HomeGridMarket />
            </Suspense>
            <Suspense fallback={<div className={styles.panel}><div className={styles.pulse} /></div>}>
              <HomeGridLocal />
            </Suspense>
            <Suspense fallback={<div className={styles.panel}><div className={styles.pulse} /></div>}>
              <HomeGridNews />
            </Suspense>
          </div>

          <Suspense fallback={<div className={styles.feed}><div className={styles.pulse} /></div>}>
            <HomeFeedBlock />
          </Suspense>
        </div>

        <Suspense fallback={<HomeRightStatsSkeleton />}>
          <HomeRightUxStats />
        </Suspense>
      </div>
    </main>
  );
}
