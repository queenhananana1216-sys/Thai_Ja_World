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
      style={{
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.1)',
        padding: 24,
        boxShadow: '0 20px 50px rgba(15,23,42,0.25)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <header className="mb-4 flex items-center gap-3" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon ? <span className="text-xl" style={{ fontSize: 20 }}>{icon}</span> : null}
        <h3 className="text-lg font-semibold text-white" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>{title}</h3>
      </header>
      <p className="text-sm font-medium text-slate-100" style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>{quote}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300" style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: '#cbd5e1' }}>{detail}</p>
    </article>
  );
}
