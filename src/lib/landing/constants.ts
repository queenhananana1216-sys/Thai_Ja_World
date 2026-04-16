import type { LandingFeature, PainPoint, StatsResponse, Testimonial } from '@/lib/landing/types';

export const LANDING_DEFAULT_STATS: StatsResponse = {
  postCount: 0,
  spotCount: 0,
  newsCount: 0,
  memberCount: 0,
  lastUpdatedAt: null,
};

export const LANDING_PAIN_POINTS: PainPoint[] = [
  {
    id: 'outdated-info',
    title: '오래된 정보',
    quote: '"TM30은 어디서 내고, 90일 리포트는 또 따로 내야 하나요?"',
    detail: '검색 결과가 오래된 글 중심이라 최신 절차를 확인하기 어렵고, 결국 헛걸음이 반복됩니다.',
  },
  {
    id: 'community-noise',
    title: '채팅방 소음',
    quote: '"오픈채팅에는 광고가 하루 30개씩 올라오고, 진짜 정보는 금방 묻혀요."',
    detail: '좋은 정보가 대화 흐름에 사라지지 않도록 구조화된 글과 검색 중심으로 설계합니다.',
  },
  {
    id: 'unreliable-business',
    title: '불안한 업체 정보',
    quote: '"찾아간 한인 업체가 이미 폐업한 적이 있어요."',
    detail: '지역 기반 디렉토리와 실제 이용자 업데이트로 신뢰 가능한 업체 정보를 제공합니다.',
  },
];

export const LANDING_FEATURES: LandingFeature[] = [
  {
    id: 'info-board',
    title: '생활질문 · 구인구직 게시판',
    description: '실제 거주자가 올린 최신 생활 정보와 채용 글',
    bullets: ['비자·TM30·90일 리포트 실전 글', '구인구직·알바 글 모아보기', '검색으로 다시 찾는 아카이브'],
    icon: '📋',
  },
  {
    id: 'ai-news',
    title: '뉴스 요약',
    description: '태국 이슈를 매일 한국어로 요약 제공',
    bullets: ['속보·규정 변경 모니터링', '원문 링크 + 편집 노트', '긴급 배지 큐레이션'],
    icon: '📰',
  },
  {
    id: 'directory',
    title: '한인 업체 디렉토리',
    description: '지역별 한인 업체 탐색과 미니홈 바로 연결',
    bullets: ['방콕·파타야·치앙마이 필터', 'LINE 원클릭 연결', '당일 예약·배송 문의 동선'],
    icon: '🏪',
  },
  {
    id: 'exchange-rate',
    title: '환율 위젯',
    description: '어디서나 호출 가능한 플로팅 환율 계산기',
    bullets: ['THB↔KRW↔USD 계산', '실시간 갱신', '가격 협상·송금 상황 대응'],
    icon: '💱',
  },
  {
    id: 'mini-hompy',
    title: '미니홈피',
    description: '교민 네트워킹과 기록을 위한 개인 공간',
    bullets: ['일촌/방명록/쪽지', '감성 스킨·BGM', '태국 생활 아카이빙'],
    icon: '🏡',
  },
];

export const LANDING_TESTIMONIALS: Testimonial[] = [
  {
    id: 'visa-help',
    quote:
      '"올해 기준 TM30 절차를 한 번에 확인해서 이민국을 다시 가지 않았어요. 댓글까지 최신이라 신뢰가 갔습니다."',
    author: '치앙마이 거주 4개월차 · 직장인 K',
  },
  {
    id: 'clinic-discovery',
    quote:
      '"구글맵보다 정확한 후기 덕분에 방콕 한인 치과를 바로 예약했어요. LINE 연결이 빨라서 정말 편했습니다."',
    author: '방콕 거주 2년차 · 프리랜서 J',
  },
  {
    id: 'searchable-knowledge',
    quote:
      '"오픈채팅은 정보가 사라지는데, 여긴 정리된 글이 남아서 필요할 때 다시 꺼내 보기 좋아요."',
    author: '파타야 거주 3년차 · 사업자 P',
  },
];
