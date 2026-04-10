/**
 * 링크 웹 — 실제 공개 URL만 (비밀·내부 경로 넣지 말 것)
 */
export type LinkWebItem = {
  id: string;
  label: string;
  href: string;
  /** 카드 보조 설명 (한 줄) */
  hint?: string;
};

export const LINK_WEB_ENTRIES: LinkWebItem[] = [
  {
    id: 'google',
    label: 'Google',
    href: 'https://www.google.com',
    hint: '검색',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    href: 'https://www.youtube.com',
    hint: '동영상',
  },
  {
    id: 'naver',
    label: 'Naver',
    href: 'https://www.naver.com',
    hint: '국내 검색·뉴스',
  },
  {
    id: 'maps',
    label: 'Google 지도',
    href: 'https://maps.google.com/',
    hint: '길 찾기·장소',
  },
  {
    id: 'github',
    label: 'GitHub',
    href: 'https://github.com/',
    hint: '코드·레포지토리',
  },
  {
    id: 'wikipedia',
    label: '위키백과 (한국어)',
    href: 'https://ko.wikipedia.org/',
    hint: '백과·참고',
  },
];
