/**
 * 링크 웹 — 실제 공개 URL만 (비밀·내부 경로 넣지 말 것)
 * 섹션 = 디렉터리 구조 (순위는 섹션 내 1…n)
 */
export type LinkWebItem = {
  id: string;
  label: string;
  href: string;
  hint?: string;
};

export type LinkSection = {
  id: string;
  title: string;
  items: LinkWebItem[];
};

export const LINK_SECTIONS: LinkSection[] = [
  {
    id: 'portal',
    title: '검색 · 포털',
    items: [
      { id: 'google', label: 'Google', href: 'https://www.google.com', hint: '검색' },
      { id: 'naver', label: 'Naver', href: 'https://www.naver.com', hint: '국내 검색·뉴스' },
    ],
  },
  {
    id: 'media',
    title: '미디어',
    items: [{ id: 'youtube', label: 'YouTube', href: 'https://www.youtube.com', hint: '동영상' }],
  },
  {
    id: 'map',
    title: '지도',
    items: [
      { id: 'maps', label: 'Google 지도', href: 'https://maps.google.com/', hint: '길 찾기·장소' },
    ],
  },
  {
    id: 'dev',
    title: '개발 · 지식',
    items: [
      { id: 'github', label: 'GitHub', href: 'https://github.com/', hint: '코드·레포' },
      { id: 'wikipedia', label: '위키백과', href: 'https://ko.wikipedia.org/', hint: '백과' },
    ],
  },
];

/** JSON-LD·호환용 평탄화 */
export function flattenLinkEntries(sections: LinkSection[]): LinkWebItem[] {
  return sections.flatMap((s) => s.items);
}

/** @deprecated 평탄 목록 — flattenLinkEntries(LINK_SECTIONS) 사용 */
export const LINK_WEB_ENTRIES: LinkWebItem[] = flattenLinkEntries(LINK_SECTIONS);
