'use client';

import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { MuseumCard, MuseumCardContent } from '@/components/ui/museum-card';
import { RetroBadge } from '@/components/ui/retro-badge';

type Props = {
  slug: string;
  name: string;
  category: string;
  region: string;
  description?: string;
  imageUrl?: string | null;
  emoji?: string;
  tier: 'basic' | 'standard' | 'premium';
  isRecommended?: boolean;
  hasDiscount?: boolean;
  discount?: string;
  tags?: string[];
  tierLabels: { premium: string; standard: string };
};

export function ShopCard({
  slug,
  name,
  category,
  region,
  description,
  imageUrl,
  emoji,
  tier,
  isRecommended,
  hasDiscount,
  discount,
  tags,
  tierLabels,
}: Props) {
  const shadowType = tier === 'premium' ? 'saffron' : tier === 'standard' ? 'coral' : 'default';

  return (
    <Link href={`/local/${slug}`} className="no-underline hover:no-underline">
      <MuseumCard shadow={shadowType} hover="lift" size="sm" className="h-full">
        {/* Image */}
        <div className="mb-3 aspect-[4/3] w-full overflow-hidden rounded-md bg-gray-100">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">
              {emoji || '🏪'}
            </div>
          )}
        </div>

        <MuseumCardContent>
          {/* Badges */}
          <div className="mb-2 flex flex-wrap gap-1">
            {tier !== 'basic' && (
              <RetroBadge
                variant={tier === 'premium' ? 'saffron' : 'coral'}
                size="xs"
                stamp={tier === 'premium'}
              >
                {tier === 'premium' ? tierLabels.premium : tierLabels.standard}
              </RetroBadge>
            )}
            {isRecommended && (
              <RetroBadge variant="teal" size="xs">
                <Star className="mr-0.5 h-2.5 w-2.5" />추천
              </RetroBadge>
            )}
            {hasDiscount && discount && (
              <RetroBadge variant="coral" size="xs">{discount}</RetroBadge>
            )}
          </div>

          {/* Info */}
          <h3 className="text-sm font-bold text-tj-ink">{name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-tj-muted">
            <MapPin className="h-3 w-3" />
            {category} · {region}
          </p>
          {description && (
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500 line-clamp-2">
              {description}
            </p>
          )}
          {tags && tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[0.6rem] text-gray-500">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </MuseumCardContent>
      </MuseumCard>
    </Link>
  );
}
