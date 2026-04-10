import * as React from 'react';
import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';

const hubTileVariants = cva(
  'group relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 transition-all duration-200 cursor-pointer',
  {
    variants: {
      accent: {
        coral: 'border-museum-coral bg-tj-surface shadow-retro-coral hover:bg-coral-50',
        saffron: 'border-museum-saffron bg-tj-surface shadow-retro-saffron hover:bg-saffron-50',
        cobalt: 'border-museum-cobalt bg-tj-surface shadow-retro-cobalt hover:bg-cobalt-50',
        teal: 'border-museum-teal bg-tj-surface shadow-retro hover:bg-teal-50',
        lilac: 'border-lilac bg-tj-surface shadow-retro hover:bg-lilac-soft',
        ink: 'border-tj-line bg-tj-surface shadow-retro hover:bg-gray-50',
      },
      size: {
        sm: 'p-3 gap-1.5',
        md: 'p-4 gap-2',
        lg: 'p-5 gap-3',
      },
    },
    defaultVariants: {
      accent: 'coral',
      size: 'md',
    },
  }
);

interface HubTileProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof hubTileVariants> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  count?: number | string;
}

const HubTile = React.forwardRef<HTMLDivElement, HubTileProps>(
  ({ className, accent, size, icon, title, description, count, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(hubTileVariants({ accent, size }), className)}
      {...props}
    >
      <div className="flex w-full items-start justify-between">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/80 text-lg">
            {icon}
          </span>
        )}
        {count !== undefined && (
          <span className="ml-auto text-xs font-bold text-tj-muted tabular-nums">
            {count}
          </span>
        )}
      </div>
      <h3 className="text-sm font-bold text-tj-ink group-hover:underline">
        {title}
      </h3>
      {description && (
        <p className="text-xs leading-relaxed text-tj-muted line-clamp-2">
          {description}
        </p>
      )}
    </div>
  )
);
HubTile.displayName = 'HubTile';

export { HubTile, hubTileVariants };
