'use client';

import Link from 'next/link';
import { MuseumCard, MuseumCardHeader, MuseumCardTitle, MuseumCardContent } from '@/components/ui/museum-card';
import { RetroBadge } from '@/components/ui/retro-badge';
import { Skeleton } from '@/components/ui/skeleton';

type Shop = {
  id: string;
  slug: string;
  name: string;
  category: string;
  region: string;
  emoji?: string;
  image_url?: string | null;
  tier: string;
};

type Props = {
  shops: Shop[];
  loading: boolean;
  title: string;
  moreText: string;
  emptyText: string;
  emptyLink: string;
  loadingText: string;
  tierPremium: string;
  tierStandard: string;
};

export function FeaturedShops({
  shops,
  loading,
  title,
  moreText,
  emptyText,
  emptyLink,
  loadingText,
  tierPremium,
  tierStandard,
}: Props) {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-tj-ink">{title}</h2>
        <Link
          href="/local"
          className="text-xs font-medium text-tj-link no-underline hover:underline"
        >
          {moreText} →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : shops.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shops.map((shop) => (
            <Link key={shop.id} href={`/shop/${shop.slug}`} className="no-underline hover:no-underline">
              <MuseumCard shadow="saffron" hover="glow" size="sm" className="h-full">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-saffron-50 text-2xl">
                  {shop.image_url ? (
                    <img
                      src={shop.image_url}
                      alt=""
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    shop.emoji || '🏪'
                  )}
                </div>
                <MuseumCardHeader>
                  <div className="flex items-center gap-1.5">
                    <MuseumCardTitle className="text-sm">{shop.name}</MuseumCardTitle>
                    {shop.tier !== 'basic' && (
                      <RetroBadge
                        variant={shop.tier === 'premium' ? 'saffron' : 'ink'}
                        size="xs"
                      >
                        {shop.tier === 'premium' ? tierPremium : tierStandard}
                      </RetroBadge>
                    )}
                  </div>
                </MuseumCardHeader>
                <MuseumCardContent>
                  <span className="text-xs text-tj-muted">
                    {shop.category} · {shop.region}
                  </span>
                </MuseumCardContent>
              </MuseumCard>
            </Link>
          ))}
        </div>
      ) : (
        <MuseumCard shadow="none" hover="none" className="text-center">
          <p className="text-sm text-tj-muted">{emptyText}</p>
          <Link
            href="/local"
            className="mt-2 inline-block text-sm text-tj-link no-underline hover:underline"
          >
            {emptyLink}
          </Link>
        </MuseumCard>
      )}
    </section>
  );
}
