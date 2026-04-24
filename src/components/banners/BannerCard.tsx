import Link from 'next/link';
import type { PublicBanner } from '@/lib/banners/types';

type Props = {
  banner: PublicBanner;
  /**
   * aspect ratio 예약 — image_width/image_height 가 있으면 그 비율,
   * 없으면 기본 비율(3:4 또는 16:9)을 쓴다.
   */
  fallbackAspect?: `${number} / ${number}`;
  /** 섬네일 최대 너비 — 윙 고정 폭에 맞춘다 */
  maxWidth?: number;
};

function sanitizeHref(href: string | null): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (/^javascript:/i.test(trimmed)) return null;
  return trimmed;
}

export function BannerCard({ banner, fallbackAspect = '3 / 4', maxWidth = 180 }: Props) {
  const href = sanitizeHref(banner.href);
  const hasImage = Boolean(banner.imageUrl);

  const aspect =
    banner.imageWidth && banner.imageHeight
      ? (`${banner.imageWidth} / ${banner.imageHeight}` as `${number} / ${number}`)
      : fallbackAspect;

  const inner = (
    <article
      className="tj-banner-card"
      style={{
        display: 'block',
        width: '100%',
        maxWidth,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid rgba(15,23,42,0.08)',
        background: '#fff',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      {hasImage ? (
        <div
          style={{
            width: '100%',
            aspectRatio: aspect,
            background: '#f1f5f9',
            display: 'block',
            position: 'relative',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.imageUrl ?? ''}
            alt={banner.title || banner.subtitle || '배너'}
            loading="lazy"
            decoding="async"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          {banner.badgeText ? (
            <span
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(15,23,42,0.78)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: 999,
                letterSpacing: '0.03em',
              }}
            >
              {banner.badgeText}
            </span>
          ) : null}
        </div>
      ) : null}
      {banner.title || banner.subtitle ? (
        <div style={{ padding: '8px 10px 10px' }}>
          {banner.title ? (
            <p
              style={{
                margin: 0,
                fontSize: 12.5,
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.35,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {banner.title}
            </p>
          ) : null}
          {banner.subtitle ? (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 11.5,
                color: '#64748b',
                lineHeight: 1.35,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {banner.subtitle}
            </p>
          ) : null}
          {banner.sponsorLabel ? (
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 10,
                color: '#94a3b8',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {banner.sponsorLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );

  if (!href) {
    return <div aria-label={banner.title || undefined}>{inner}</div>;
  }

  const isExternal = /^https?:\/\//i.test(href);
  return isExternal ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      aria-label={banner.title || undefined}
    >
      {inner}
    </a>
  ) : (
    <Link
      href={href}
      prefetch={false}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      aria-label={banner.title || undefined}
    >
      {inner}
    </Link>
  );
}
