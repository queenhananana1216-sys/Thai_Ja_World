import * as React from 'react';
import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';

const museumCardVariants = cva(
  'relative rounded-lg border-2 border-tj-line bg-tj-surface transition-all duration-200',
  {
    variants: {
      shadow: {
        default: 'shadow-retro',
        saffron: 'shadow-retro-saffron',
        coral: 'shadow-retro-coral',
        cobalt: 'shadow-retro-cobalt',
        none: '',
      },
      hover: {
        lift: 'hover:-translate-y-1 hover:shadow-lg',
        glow: 'hover:border-museum-saffron hover:shadow-retro-saffron',
        none: '',
      },
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      shadow: 'default',
      hover: 'lift',
      size: 'md',
    },
  }
);

interface MuseumCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof museumCardVariants> {}

const MuseumCard = React.forwardRef<HTMLDivElement, MuseumCardProps>(
  ({ className, shadow, hover, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(museumCardVariants({ shadow, hover, size }), className)}
      {...props}
    />
  )
);
MuseumCard.displayName = 'MuseumCard';

const MuseumCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-1.5 pb-3', className)}
    {...props}
  />
));
MuseumCardHeader.displayName = 'MuseumCardHeader';

const MuseumCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-base font-bold tracking-tight text-tj-ink',
      className
    )}
    {...props}
  />
));
MuseumCardTitle.displayName = 'MuseumCardTitle';

const MuseumCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm text-tj-muted', className)} {...props} />
));
MuseumCardContent.displayName = 'MuseumCardContent';

export {
  MuseumCard,
  MuseumCardHeader,
  MuseumCardTitle,
  MuseumCardContent,
  museumCardVariants,
};
