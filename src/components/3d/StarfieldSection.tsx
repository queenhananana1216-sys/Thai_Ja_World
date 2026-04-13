'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { EffectTier } from '@/lib/3d/types';

type StarfieldSectionProps = ComponentPropsWithoutRef<'section'> & {
  tier?: EffectTier;
  children: ReactNode;
};

export function StarfieldSection({
  tier = 'core',
  className = '',
  children,
  ...rest
}: StarfieldSectionProps) {
  return (
    <section className={`tj-starfield tj-starfield--${tier} ${className}`.trim()} {...rest}>
      <div className="tj-starfield__bg" aria-hidden />
      <div className="tj-starfield__content">{children}</div>
    </section>
  );
}

