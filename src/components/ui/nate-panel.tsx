import * as React from 'react';
import { cn } from '@/lib/utils';

const NatePanel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'w-full rounded-sm border border-gray-200 bg-gray-50 p-2.5 shadow-sm',
      'sm:p-3',
      className
    )}
    {...props}
  />
));
NatePanel.displayName = 'NatePanel';

const NatePanelHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-between gap-2 mb-2',
      className
    )}
    {...props}
  />
));
NatePanelHeader.displayName = 'NatePanelHeader';

const NatePanelName = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn('text-sm text-gray-900 min-w-0', className)}
    {...props}
  />
));
NatePanelName.displayName = 'NatePanelName';

const NatePanelActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-wrap items-center gap-1.5', className)}
    {...props}
  />
));
NatePanelActions.displayName = 'NatePanelActions';

const NatePanelLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-sm border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 no-underline transition-colors',
      'hover:border-museum-coral hover:text-museum-coral hover:no-underline',
      className
    )}
    {...props}
  />
));
NatePanelLink.displayName = 'NatePanelLink';

const NatePanelCta = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-sm bg-museum-coral px-2.5 py-1.5 text-xs font-bold text-white no-underline transition-colors',
      'hover:bg-coral-600 hover:no-underline',
      className
    )}
    {...props}
  />
));
NatePanelCta.displayName = 'NatePanelCta';

export {
  NatePanel,
  NatePanelHeader,
  NatePanelName,
  NatePanelActions,
  NatePanelLink,
  NatePanelCta,
};
