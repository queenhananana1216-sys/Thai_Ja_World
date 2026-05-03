import { Suspense } from 'react';
import MinihomeStyleShopClient from '../_components/MinihomeStyleShopClient';

export default function MinihomeStyleShopPage() {
  return (
    <Suspense
      fallback={
        <div className="page-body board-page">
          <p className="auth-field-hint">상점을 불러오는 중…</p>
        </div>
      }
    >
      <MinihomeStyleShopClient />
    </Suspense>
  );
}
