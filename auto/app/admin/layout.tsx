import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="container admin-wide">{children}</div>;
}
