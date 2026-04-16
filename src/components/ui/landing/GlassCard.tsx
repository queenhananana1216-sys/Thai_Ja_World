import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  title: string;
  quote: string;
  detail: string;
  className?: string;
  icon?: ReactNode;
}

export function GlassCard({ title, quote, detail, className, icon }: GlassCardProps) {
  return (
    <article
      className={cn(
        'rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.25)] backdrop-blur-xl',
        className
      )}
    >
      <header className="mb-4 flex items-center gap-3">
        {icon ? <span className="text-xl">{icon}</span> : null}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </header>
      <p className="text-sm font-medium text-slate-100">{quote}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{detail}</p>
    </article>
  );
}
