import Link from 'next/link';
import ReportInboxSettingsClient from '../_components/ReportInboxSettingsClient';

export default function AdminSiteSettingsPage() {
  return (
    <main className="admin-page">
      <p style={{ margin: '0 0 8px' }}>
        <Link href="/admin" style={{ color: '#7c3aed', fontSize: 13 }}>
          ← 관리자 개요
        </Link>
      </p>
      <h1 className="admin-dash__title">사이트 설정</h1>
      <p className="admin-dash__lead">
        글자 크기·위젯 등 UI 플래그는 <Link href="/admin/design">사이트 디자인 제어</Link> 에서 다룹니다. 이 페이지에서는{' '}
        <strong>제보함 외부 채널 링크</strong>만 편집합니다. 값은 <code>public.site_settings</code> 에 저장되며 앱 방문자도
        읽을 수 있습니다(쓰기는 관리자 API만).
      </p>
      <div className="admin-design">
        <ReportInboxSettingsClient />
      </div>
    </main>
  );
}
