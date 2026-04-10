import * as React from 'react';
import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';

const retroBadgeVariants = cva(
  'inline-flex items-center justify-center rounded-sm border-2 font-bold uppercase tracking-wider transition-colors',
  {
    variants: {
      variant: {
        coral: 'border-museum-coral bg-coral-50 text-museum-coral',
        saffron: 'border-museum-saffron bg-saffron-50 text-saffron-700',
        cobalt: 'border-museum-cobalt bg-cobalt-50 text-museum-cobalt',
        teal: 'border-museum-teal bg-teal-50 text-museum-teal',
        ink: 'border-tj-line bg-tj-ink text-tj-surface',
        tai: 'border-brand-tai bg-cobalt-50 text-brand-tai',
        ja: 'border-brand-ja bg-coral-50 text-brand-ja',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-[0.6rem]',
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
      stamp: {
        true: 'rotate-[-3deg] shadow-retro',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'coral',
      size: 'sm',
      stamp: false,
    },
  }
);

interface RetroBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof retroBadgeVariants> {}

const RetroBadge = React.forwardRef<HTMLSpanElement, RetroBadgeProps>(
  ({ className, variant, size, stamp, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(retroBadgeVariants({ variant, size, stamp }), className)}
      {...props}
    />
  )
);
RetroBadge.displayName = 'RetroBadge';

export { RetroBadge, retroBadgeVariants };
