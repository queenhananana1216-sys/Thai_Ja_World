import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="page-body" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <section className="card" style={{ maxWidth: 520, padding: 22, textAlign: 'center' }}>
        <h1 style={{ marginTop: 0 }}>오프라인 상태입니다</h1>
        <p style={{ lineHeight: 1.6, marginBottom: 14 }}>
          네트워크가 불안정해 페이지를 불러오지 못했습니다. 연결이 복구되면 자동으로 최신 내용을 다시 불러옵니다.
        </p>
        <Link href="/" className="board-form__submit" style={{ display: 'inline-block' }}>
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
