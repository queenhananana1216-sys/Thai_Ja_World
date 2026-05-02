import Link from 'next/link';
import AdminBoardReportForm from '../_components/AdminBoardReportForm';

export default function AdminBoardReportNewPage() {
  return (
    <main className="admin-page">
      <p style={{ margin: '0 0 8px' }}>
        <Link href="/admin/board-reports" style={{ color: '#7c3aed', fontSize: 13 }}>
          ← 검증 제보 목록
        </Link>
      </p>
      <AdminBoardReportForm />
    </main>
  );
}
