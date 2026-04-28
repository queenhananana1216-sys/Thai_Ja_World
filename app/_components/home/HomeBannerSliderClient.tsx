'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PremiumBannerRow } from '../../portal/types';
import styles from './home-hub.module.css';
import { normalizeContainerText } from '@/lib/text/normalizeDisplayText';

export function HomeBannerSliderClient({ banners }: { banners: PremiumBannerRow[] }) {
  const [slide, setSlide] = useState(0);
  const list = banners.length > 0 ? banners : null;

  useEffect(() => {
    if (!list || list.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % list.length), 5200);
    return () => clearInterval(t);
  }, [list]);

  if (!list) return null;

  const first = list[0];
  if (!first) return null;
  const active = list[slide % list.length] ?? first;

  return (
    <div className={styles.sliderHost}>
      {list.map((b, i) => (
        <div
          key={b.id}
          className={`${styles.slide} ${i === slide ? styles.slideActive : ''}`}
          style={{ background: 'linear-gradient(90deg, #0f172a 0%, #1e1b4b 100%)' }}
        />
      ))}
      <div className={styles.slideOverlay}>
        <div className={styles.mascotShell} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/mascot/character.png"
            alt="태자월드 마스코트 자리"
            className={styles.mascotImage}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className={styles.mascotSkeleton}>
            <div className={styles.mascotHead} />
            <div className={styles.mascotBody} />
            <span className={styles.mascotHint}>태자월드 마스코트(캐릭터) 영역</span>
          </div>
        </div>
        {active.href ? (
          <Link href={active.href} className="block text-inherit no-underline hover:opacity-95">
            <div className={styles.slideTitle}>{normalizeContainerText(active.title, 52)}</div>
            <div className={styles.slideSub}>
              {normalizeContainerText(active.subtitle ?? active.badge_text ?? '', 72)}
            </div>
          </Link>
        ) : (
          <>
            <div className={styles.slideTitle}>{normalizeContainerText(active.title, 52)}</div>
            <div className={styles.slideSub}>
              {normalizeContainerText(active.subtitle ?? active.badge_text ?? '', 72)}
            </div>
          </>
        )}
      </div>
      {list.length > 1 ? (
        <div className={styles.dots}>
          {list.map((_, i) => (
            <button
              key={String(i)}
              type="button"
              className={`${styles.dot} ${i === slide ? styles.dotActive : ''}`}
              onClick={() => setSlide(i)}
              aria-label={`${i + 1}번 배너`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
