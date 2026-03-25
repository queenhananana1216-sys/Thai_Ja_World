'use client';

import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
};

export default function AuthPageShell({ title, subtitle, children }: Props) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__brand" aria-hidden>
          <span className="auth-card__brand-icon">✦</span>
        </div>
        <h1 className="auth-card__title">{title}</h1>
        {subtitle ? <p className="auth-card__subtitle">{subtitle}</p> : null}
        <div className="auth-card__body">{children}</div>
      </div>
    </div>
  );
}
