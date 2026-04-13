'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { EffectTier } from '@/lib/3d/types';

type HoloButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tier?: EffectTier;
  children: ReactNode;
};

export function HoloButton({ tier = 'core', className = '', children, ...rest }: HoloButtonProps) {
  return (
    <button type="button" className={`tj-holo-btn tj-holo-btn--${tier} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

