/**
 * 관리자 사이드바 — 모듈형 섹션 (콘텐츠 / 커머스·B2B / 커뮤니티 / 디자인 / AI)
 */
export type AdminNavItem = { href: string; label: string; icon: string };
export type AdminNavSection = { title: string; items: AdminNavItem[] };

export const adminNavSections: AdminNavSection[] = [
  {
    title: '콘텐츠 · 관제',
    items: [
      { href: '/admin', label: '대시보드', icon: '◈' },
      { href: '/admin/publish', label: '승인 허브', icon: '✦' },
      { href: '/admin/news', label: '뉴스 큐', icon: '▤' },
      { href: '/admin/knowledge', label: '꿀팁 큐', icon: '▧' },
      { href: '/admin/knowledge?view=stubs', label: '지식 스텁 큐', icon: '◆' },
      { href: '/admin/ops-center', label: '운영 로그', icon: '◉' },
      { href: '/admin/bot-actions', label: '봇 기록', icon: '◎' },
    ],
  },
  {
    title: '커머스 · 로컬 · B2B',
    items: [
      { href: '/shop', label: '살자 상점', icon: '🛒' },
      { href: '/admin/local-spots', label: '로컬 가게', icon: '▩' },
      { href: '/admin/local-billing', label: 'B2B · QR · 정산', icon: '📲' },
      { href: '/admin/local-template', label: '미니홈 템플릿', icon: '✨' },
      { href: '/admin/local-showcase', label: '로컬 쇼케이스', icon: '🏪' },
      { href: '/admin/local-catalog', label: '로컬 카탈로그 수정', icon: '📍' },
      { href: '/admin/korean-biz-submissions', label: '한인 업소 제보', icon: '🏢' },
      { href: '/admin/biz-management', label: '생활망 마스터', icon: '🧭' },
      { href: '/admin/biz-audit', label: '한인망 감사', icon: '🛰️' },
      { href: '/admin/advertiser-insights', label: '광고 인사이트', icon: '📈' },
    ],
  },
  {
    title: '커뮤니티 · 유저',
    items: [
      { href: '/admin/users', label: '이용자', icon: '◍' },
      { href: '/admin/board-reports', label: '검증 제보', icon: '🚨' },
      { href: '/admin/community-posts', label: '광장 글', icon: '◌' },
    ],
  },
  {
    title: '디자인 · 사이트',
    items: [
      { href: '/admin/site-settings', label: '사이트 설정', icon: '⚙' },
      { href: '/admin/design', label: '디자인', icon: '◇' },
      { href: '/admin/banners', label: '배너', icon: '▣' },
      { href: '/admin/premium-banners', label: '프리미엄 배너', icon: '▦' },
      { href: '/admin/home-hero', label: '홈 메인 문구', icon: '✶' },
    ],
  },
  {
    title: 'AI 연구소',
    items: [
      { href: '/admin/sandbox', label: '스크립트 샌드박스', icon: '🧬' },
      { href: '/admin/ux-bot', label: 'UX 봇', icon: '⌗' },
    ],
  },
];
