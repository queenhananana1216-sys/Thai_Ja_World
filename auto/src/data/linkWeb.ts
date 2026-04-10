/**
 * 링크 웹 (auto 루트) — 출구 링크 정리 + SEO 연습. 비밀·토큰 넣지 말 것.
 */
export type LinkWebItem = {
  id: string;
  label: string;
  href: string;
  hint?: string;
};

export const LINK_WEB_ENTRIES: LinkWebItem[] = [
  {
    id: 'figma',
    label: 'Figma',
    href: 'https://www.figma.com/',
    hint: '연결한 파일 URL로 교체',
  },
  {
    id: 'repo',
    label: '소스 / GitHub',
    href: 'https://github.com/',
    hint: '모노레포 주소로 교체',
  },
  {
    id: 'docs',
    label: '문서 (노션 등)',
    href: 'https://www.notion.so/',
    hint: '파이프라인 요약을 올린 곳',
  },
];
