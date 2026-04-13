'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { EffectTier } from '@/lib/3d/types';

type DepthCardProps = ComponentPropsWithoutRef<'section'> & {
  tier?: EffectTier;
  children: ReactNode;
};

export function DepthCard({ tier = 'core', className = '', children, ...rest }: DepthCardProps) {
  return (
    <section className={`tj-depth-card tj-depth-card--${tier} ${className}`.trim()} {...rest}>
      {children}
    </section>
  );
}

