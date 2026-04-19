import Link from 'next/link';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

export default async function NotFound() {
  const locale = await getLocale();
  const d = getDictionary(locale);

  const title =
    locale === 'th'
      ? 'ไม่พบหน้าที่ต้องการ'
      : '요청하신 페이지를 찾을 수 없어요';
  const body =
    locale === 'th'
      ? 'ลิงก์อาจหมดอายุ หรือที่อยู่อาจถูกเปลี่ยนแล้ว ลองไปยังเมนูหลักด้านล่างได้ทันที'
      : '링크가 만료되었거나 주소가 바뀌었을 수 있어요. 아래 자주 찾는 메뉴로 바로 이동해 보세요.';
  const homeCta = locale === 'th' ? 'ไปหน้าแรก' : '홈으로 이동';
  const boardCta = locale === 'th' ? 'บอร์ดล่าสุด 보기' : '광장 최신 글 보기';

  return (
    <div className="page-body board-page">
      <div className="card" style={{ padding: 24 }}>
        <h1 className="board-title" style={{ marginBottom: 10 }}>
          404 · {title}
        </h1>
        <p style={{ margin: '0 0 16px', lineHeight: 1.6 }}>{body}</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/" className="board-form__submit" style={{ textAlign: 'center' }}>
            {homeCta}
          </Link>
          <Link
            href="/community/boards?scope=general"
            className="board-form__submit"
            style={{
              textAlign: 'center',
              background: '#fff',
              color: 'var(--tj-ink)',
              border: '1px solid var(--tj-line)',
            }}
          >
            {boardCta}
          </Link>
        </div>
        <p style={{ marginTop: 12, fontSize: '0.83rem', color: 'var(--tj-muted)' }}>
          {locale === 'th'
            ? d.home.portalMastSub
            : '태자월드는 태국 생활 정보와 한줄 브리핑을 빠르게 찾는 커뮤니티입니다.'}
        </p>
      </div>
    </div>
  );
}
