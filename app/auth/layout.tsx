import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="auth-route-root">{children}</div>;
}
