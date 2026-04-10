import * as React from 'react';
import { cn } from '@/lib/utils';

interface BrandPhraseProps extends React.HTMLAttributes<HTMLSpanElement> {
  suffix?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
} as const;

const BrandPhrase = React.forwardRef<HTMLSpanElement, BrandPhraseProps>(
  ({ className, suffix, size = 'md', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-baseline gap-0.5 font-extrabold tracking-tight',
        sizeMap[size],
        className
      )}
      {...props}
    >
      <span className="text-brand-tai">태</span>
      <span className="text-tj-ink">국에</span>
      <span className="text-tj-ink">살</span>
      <span className="text-brand-ja">자</span>
      {suffix && (
        <span className="ml-1 text-[0.78em] font-semibold text-museum-coral tracking-wide">
          {suffix}
        </span>
      )}
    </span>
  )
);
BrandPhrase.displayName = 'BrandPhrase';

export { BrandPhrase };
