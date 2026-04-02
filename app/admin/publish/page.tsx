import Link from 'next/link';
import TaejaEditorialTips from '../_components/TaejaEditorialTips';

/**
 * 최종 배포·편집 기준 허브 — 뉴스·지식 큐로 이어지는 한 페이지 요약
 */
export default function AdminPublishHubPage() {
  return (
    <div style={{ padding: '20px 24px', maxWidth: 920, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 8px', fontWeight: 800 }}>최종 승인 · 배포</h1>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
        봇이 가져온 뉴스와 태국 꿀팁은 기본적으로 <strong>초안(published=false)</strong>만 쌓입니다. 여기서 정리한 뒤 각 큐에서{' '}
        <strong>승인 한 번(또는 일괄 승인)</strong>으로 이용자 화면에 올라갑니다.
      </p>

      <TaejaEditorialTips />

      <div
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          marginBottom: 28,
        }}
      >
        <Link
          href="/admin/news"
          style={{
            display: 'block',
            padding: 18,
            borderRadius: 12,
            border: '2px solid #4f46e5',
            background: '#eef2ff',
            textDecoration: 'none',
            color: '#312e81',
          }}
        >
          <strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>뉴스 초안 큐 →</strong>
          <span style={{ fontSize: 13, lineHeight: 1.55 }}>
            봇이 수집·요약한 기사. 제목·한글 요약(20자 이상)을 다듬은 뒤 «홈에 게시» 또는 «일괄 게시».
          </span>
        </Link>
        <Link
          href="/admin/knowledge"
          style={{
            display: 'block',
            padding: 18,
            borderRadius: 12,
            border: '2px solid #7c3aed',
            background: '#f5f3ff',
            textDecoration: 'none',
            color: '#4c1d95',
          }}
        >
          <strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>지식·꿀팁 큐 →</strong>
          <span style={{ fontSize: 13, lineHeight: 1.55 }}>
            태국 생활 정보. 스텁이면 LLM 재가공 후, 미리보기로 확인하고 «일괄 승인» 또는 건별 «최종 승인」.
          </span>
        </Link>
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
        로컬 스팟·광장 일반 글은 각각 <Link href="/admin/local-spots">로컬 가게</Link>·
        <Link href="/admin/community-posts">광장 글</Link> 메뉴에서 승인합니다.
      </p>
    </div>
  );
}
