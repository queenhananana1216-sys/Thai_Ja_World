/** 사장님 «내 가게 관리» — 개요 + 요청하신 7개 하위 메뉴 (고급 JSON은 개요에서만 링크) */
export const OWNER_SHOP_NAV = [
  { segment: '', label: '개요' },
  { segment: 'announcements', label: '공지 쓰기' },
  { segment: 'events', label: '이벤트 등록' },
  { segment: 'photos', label: '사진 업로드' },
  { segment: 'menu', label: '메뉴 수정' },
  { segment: 'delivery', label: '예약 배달' },
  { segment: 'intro', label: '소개글 수정' },
  { segment: 'hours', label: '영업시간' },
  { segment: 'comments', label: '댓글 보기' },
] as const;
