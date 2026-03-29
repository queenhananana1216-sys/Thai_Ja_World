import type { Metadata } from 'next';
import MyLocalShopClient from './_components/MyLocalShopClient';

export const metadata: Metadata = {
  title: '내 로컬 가게 미니홈',
  robots: { index: false, follow: false },
};

export default function MyLocalShopPage() {
  return (
    <main className="page-body" style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ fontSize: '1.35rem', marginBottom: 8 }}>내 로컬 가게 미니홈</h1>
      <p style={{ color: 'var(--tj-muted, #64748b)', fontSize: 14, marginBottom: 24 }}>
        운영진이 계정을 오너로 연결한 가게만 표시됩니다. BGM·소개·테마·메뉴·레이아웃만 수정할 수 있으며, 공개
        슬러그·가게 공개 여부는 관리자만 변경합니다.
      </p>
      <MyLocalShopClient />
    </main>
  );
}
