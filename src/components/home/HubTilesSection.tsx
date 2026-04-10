'use client';

import Link from 'next/link';
import { HubTile } from '@/components/ui/hub-tile';

type TileData = {
  href: string;
  emoji: string;
  title: string;
  subtitle: string;
  accent: 'coral' | 'saffron' | 'cobalt' | 'teal' | 'lilac' | 'ink';
};

type Props = {
  tiles: TileData[];
};

export function HubTilesSection({ tiles }: Props) {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="no-underline hover:no-underline">
            <HubTile
              accent={tile.accent}
              icon={<span>{tile.emoji}</span>}
              title={tile.title}
              description={tile.subtitle}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
