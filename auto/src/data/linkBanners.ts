/**
 * 상단 스팟 타일(2×2) — 짧은 라벨만. 이미지 광고 대신 글래스 카드 톤.
 */
export type LinkSpotTile = {
  id: string;
  title: string;
  sub: string;
  href: string;
};

export const LINK_SPOT_TILES: LinkSpotTile[] = [
  { id: 's1', title: 'Figma', sub: '디자인', href: 'https://www.figma.com/' },
  { id: 's2', title: 'Notion', sub: '문서', href: 'https://www.notion.so/' },
  { id: 's3', title: 'Vercel', sub: '배포', href: 'https://vercel.com/' },
  { id: 's4', title: 'Ollama', sub: '로컬 AI', href: 'https://ollama.com/' },
];
