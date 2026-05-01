import SiteDesignControlClient from '../_components/SiteDesignControlClient';

export default function AdminDesignPage() {
  return (
    <main className="admin-page">
      <h1 className="admin-dash__title">사이트 디자인 제어</h1>
      <p className="admin-dash__lead">
        DB 테이블 <code>site_settings</code> 에 즉시 반영됩니다. 비로그인 방문자 화면에도 적용되도록 공개 읽기(RLS) +
        관리자 API 쓰기(service role) 구조입니다.
      </p>
      <SiteDesignControlClient />
    </main>
  );
}
