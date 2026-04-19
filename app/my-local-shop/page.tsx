import type { Metadata } from 'next';
import MyLocalShopHub from './_components/MyLocalShopHub';

export const metadata: Metadata = {
  title: '내 가게 관리',
  robots: { index: false, follow: false },
};

export default function MyLocalShopPage() {
  return (
    <main className="owner-shop-page">
      <h1 className="owner-shop-page__title">내 가게 관리</h1>
      <p className="owner-shop-page__lead">
        운영진이 오너로 연결한 가게만 보입니다. 가게를 고르면 공지·이벤트·사진·메뉴·소개·영업시간·댓글 메뉴로 들어갈 수 있습니다. 가게 이름·공개
        슬러그·목록 노출은 관리자만 바꿀 수 있습니다.
      </p>
      <MyLocalShopHub />
    </main>
  );
}
