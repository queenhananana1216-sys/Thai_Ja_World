/**
 * 고스트라이터(cron/auto-content) — 제목 템플릿만 코드에 두고 본문은 API에서 조합합니다.
 * board_type: tips = 운영 큐레이션, reports = 제보 톤(크론이 서비스 롤로만 작성).
 */
export type AutoContentBoardKind = 'tips' | 'reports';

export type AutoContentTemplate = {
  title: string;
  boardType: AutoContentBoardKind;
  /** DB display_author_label 및 크론 로그용 */
  authorLabel: string;
};

/** 홈 통합 피드 상단 고정·🔥 HOT 우선 정렬용 (제목은 크론 insert 와 동일해야 함) */
export const AUTO_CONTENT_KILLER_FEED_TITLES: readonly string[] = [
  '🇹🇭 태국 이민국 비자(TM30/90일) 최신 단속 동향',
  '🏢 방콕 주요 콘도(수쿰빗/팔람9) 실시간 월세 시세표',
  '⛳ 태국 골프장 및 마사지샵 리얼 후기 및 예약 꿀팁',
] as const;

const KILLER_TITLE_SET = new Set(AUTO_CONTENT_KILLER_FEED_TITLES.map((t) => t.trim()));

export function isAutoContentKillerFeedTitle(title: string): boolean {
  return KILLER_TITLE_SET.has(title.trim());
}

export const AUTO_CONTENT_GHOSTWRITER_TEMPLATES: readonly AutoContentTemplate[] = [
  {
    title: '방콕 통로(Thonglor) 핫플 카페 리스트 5곳',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '수완나품 공항 택시 사기 안 당하는 법',
    boardType: 'reports',
    authorLabel: '익명 제보자',
  },
  {
    title: '콘도 계약 시 무조건 확인해야 할 특약 체크리스트',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '파타야 렌트카·교통사고 처리 시 주의사항',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '방콕 BTS·MRT 환승, 요금·레일 패스 비교 한눈에',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '태국 거주자 은행 계좌 개설 — 준비 서류·방문 팁',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '치앙마이 숙소 계약 전 방문 체크 — 곰팡이·전기·수도',
    boardType: 'reports',
    authorLabel: '익명 제보자',
  },
  {
    title: '후아힌·파타야 비수기 숙박 할인, 현장 협상 전략',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '태국 SIM·eSIM 고르기 — 데이터·통화 요금제 함정 피하기',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '현지 병원 응급실 vs 국제 클리닉 — 영수증·보험 청구 팁',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '방콕 몰 vs 재래시장 — 관광객이 자주 당하는 요금·환전 팁',
    boardType: 'reports',
    authorLabel: '익명 제보자',
  },
  {
    title: '태국 장마철·침수 구역 확인 — 숙소 고를 때 지도 활용법',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '🇹🇭 태국 이민국 비자(TM30/90일) 최신 단속 동향',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '🏢 방콕 주요 콘도(수쿰빗/팔람9) 실시간 월세 시세표',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
  {
    title: '⛳ 태국 골프장 및 마사지샵 리얼 후기 및 예약 꿀팁',
    boardType: 'tips',
    authorLabel: '태국에, 살자 운영진',
  },
];

export function buildAutoContentBody(opts: { boardType: AutoContentBoardKind; title: string }): string {
  const commonFooter =
    '\n\n— 태자월드 에디토리얼 시스템이 초안 카드를 생성했습니다. 규정·요금은 변동될 수 있으니 출발 전 공식 공지를 함께 확인해 주세요.';
  if (opts.boardType === 'reports') {
    return (
      `[제보·생활 주의 안내]\n\n` +
      `${opts.title}\n\n` +
      '이 카드는 커뮤니티에서 자주 거론되는 리스크 주제를 바탕으로 운영 시스템이 자동 정리한 초안입니다. ' +
      '현장 상황은 지역·시기마다 다를 수 있습니다.\n\n' +
      '• 본문은 참고용이며 법률·금융 조언이 아닙니다.\n' +
      '• 정확한 팁·경험이 있으면 댓글로 공유해 주시면 다른 분들에게 큰 도움이 됩니다.' +
      commonFooter
    );
  }
  return (
    `[생활·여행 팁]\n\n` +
    `${opts.title}\n\n` +
    '이 글은 태국 교민·관광객이 자주 검색하는 주제를 바탕으로, 운영진 큐레이션 파이프라인이 만든 정보 카드 초안입니다.\n\n' +
    '• 세부 장소·가격은 변동될 수 있으니 최신 리뷰와 공식 사이트를 함께 확인해 주세요.\n' +
    '• 알고 있는 최신 정보가 있다면 댓글로 보태 주세요.' +
    commonFooter
  );
}
