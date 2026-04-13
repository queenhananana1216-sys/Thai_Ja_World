'use client';

import Link from 'next/link';
import type { EffectTier } from '@/lib/3d/types';

export type OrbitalLink = {
  href: string;
  label: string;
  key: string;
};

export function OrbitalNav({
  links,
  tier = 'core',
  ariaLabel,
}: {
  links: OrbitalLink[];
  tier?: EffectTier;
  ariaLabel: string;
}) {
  return (
    <nav className={`tj-orbital-nav tj-orbital-nav--${tier}`} aria-label={ariaLabel}>
      {links.map((item) => (
        <Link key={item.key} href={item.href} className="tj-orbital-nav__chip">
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

