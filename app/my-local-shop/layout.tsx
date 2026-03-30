import type { ReactNode } from 'react';

export default function MyLocalShopLayout({ children }: { children: ReactNode }) {
  return <div className="page-body owner-shop-root">{children}</div>;
}
