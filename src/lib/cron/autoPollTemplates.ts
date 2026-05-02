/** 자동 밸런스 게임(양자택일) — 태국 생활·여행 톤 */
export type BalancePollTemplate = {
  question: string;
  optionA: string;
  optionB: string;
};

export const BALANCE_POLL_TEMPLATES: BalancePollTemplate[] = [
  { question: '태국 첫 여행, 무조건 여기다!', optionA: '방콕의 화려한 밤', optionB: '푸켓의 에메랄드 바다' },
  { question: '장기 체류라면 어디에 살까?', optionA: '방콕 (일·교통)', optionB: '치앙마이 (여유·물가)' },
  { question: '주말 힐링은 어디로?', optionA: '파타야 바닷바람', optionB: '카오야이 숲·쿨링' },
  { question: '한 끼 싸게 해결!', optionA: '로컬 쌀국수 포장마차', optionB: '푸드코트 + 스무디' },
  { question: '장마철 생활 꿀팁!', optionA: 'BTS·MRT 위주 동네', optionB: 'Grab으로 문앞 배달' },
  { question: '비자 런, 스트레스 줄이려면?', optionA: '대행 맡기고 시간 산다', optionB: '직접 가고 비용 아낀다' },
  { question: '태국에서 운전한다면?', optionA: '렌트카로 자유 투어', optionB: '바이크가 반값·빠름' },
  { question: '송크란 즐기는 법!', optionA: '카오산 전선', optionB: '리조트 풀파티' },
  { question: '야시장 vs 몰!', optionA: '로컬 야시장 털기', optionB: '에어컨 몰에서 쇼핑' },
  { question: '일할 때 선호하는 곳!', optionA: '코워킹 + 카페', optionB: '집·에어컨 풀가동' },
  { question: '태국 커피 한 잔!', optionA: '달달 타이다링크', optionB: 'Americano 온더록' },
  { question: '헬스·러닝 루트!', optionA: '벤자시리 공원 랩', optionB: '호텔 짐이 편하다' },
  { question: '밤늦게 배고프면?', optionA: '7-Eleven 도시락', optionB: '야시장 쌀국수' },
  { question: '한국 입맛이 그리울 때!', optionA: '한인마트 가성비', optionB: '현지 한식당 프리미엄' },
  { question: '섬 투어 스타일!', optionA: '피피 데이투어 단체', optionB: '롱테일 보트 독차지' },
  { question: '데이터·통신은?', optionA: '현지 유심이 싸다', optionB: '로밍이 마음 편하다' },
  { question: '에어컨 요금 걱정될 때!', optionA: '26도 + 선풍기', optionB: '쾌적함이 우선' },
  { question: '반려동물과 동남아!', optionA: '규정 철저히 확인', optionB: '아직은 무리' },
  { question: '태국어 공부, 어디까지?', optionA: '기본만으로 생활 OK', optionB: '듣기·말하기까지 갈고 닦기' },
  { question: '미니멀 이사 짐!', optionA: '현지에서 다시 산다', optionB: '짐 보내기 vs 수하물' },
];
