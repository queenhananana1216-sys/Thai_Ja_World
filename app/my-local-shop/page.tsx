import type { Metadata } from 'next';
import MyLocalShopHub from './_components/MyLocalShopHub';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

export const metadata: Metadata = {
  title: '내 가게 관리',
  robots: { index: false, follow: false },
};

export default async function MyLocalShopPage() {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const h = d.home;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>
      <h1 style={{ fontSize: '1.35rem', marginBottom: 8 }}>내 가게 관리</h1>
      <p style={{ color: 'var(--tj-muted, #64748b)', fontSize: 14, marginBottom: 24, lineHeight: 1.55 }}>
        운영진이 오너로 연결한 가게만 보입니다. 가게를 고르면 공지·이벤트·사진·메뉴·소개·영업시간·댓글 메뉴로 들어갈 수 있습니다. 가게 이름·공개
        슬러그·목록 노출은 관리자만 바꿀 수 있습니다.
      </p>
      <MyLocalShopHub emptyFollowup={h.myLocalShopEmptyFollowup} contactCta={h.myLocalShopContactCta} />
    </main>
  );
}
