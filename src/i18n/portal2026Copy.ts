import type { Locale } from './types';

/** 홈 3열 포털(`Portal2026View`) 전용 문구 — `getLocale()`과 함께 사용 */
export type Portal2026Copy = {
  emptyWing: string;
  emptyLocal: string;
  emptyLiveFeed: string;
  emptyRank: string;
  boardColumns: {
    title: string;
    moreHref: string;
    key: 'job' | 'flea' | 'free' | 'local' | 'news' | 'visaTips' | 'report' | 'fxRate';
    questCat?: 'job' | 'flea' | 'free';
  }[];
  sponsorTitle: string;
  /** 좌측 윙 — 필수 앱 런처 */
  quickAppsTitle: string;
  quickAppsSub: string;
  quickAppsAria: string;
  shortcutTitle: string;
  rankTitle: string;
  rankSub: string;
  liveFeedTitle: string;
  /** 실시간 통합 피드 — 멀티 탭 라벨 */
  liveFeedTabAll: string;
  liveFeedTabHot: string;
  liveFeedTabQa: string;
  liveFeedTabFlea: string;
  /** 선택한 탭에 글이 없을 때 */
  emptyLiveFeedTab: string;
  newsAsideTitle: string;
  localAsideTitle: string;
  contactTitle: string;
  contactBody: string;
  hubBoard: string;
  tradeHub: string;
  /** 🇰🇷 한인 생활망 바로가기 */
  koreanBizShortcut: string;
  newsLink: string;
  more: string;
  newsHubMore: string;
  emptyList: string;
  weatherWidgetAria: string;
  weatherLoading: string;
  weatherUnavailable: string;
  rootAria: string;
  dotoriSuffix: string;
  /** 우측·모바일 — 보유 도토리 명예의 전당 */
  balanceHallTitle: string;
  balanceHallSub: string;
  balanceHallEmpty: string;
  balanceHallYourRank: string;
  balanceHallLoginHint: string;
  balanceHallWriteCta: string;
  /** 홈 밸런스 게임 투표 */
  balanceGameTitle: string;
  balanceGameSub: string;
  balanceVs: string;
  /** 투표 전 막대(50:50) — 스크린리더용, 득표 수 없음 */
  balanceSkeletonAria: string;
  /** 투표 후 비율만 — 총표 미포함 */
  balanceResultAria: string;
  balanceTapHint: string;
  balanceYourPick: string;
};

const ko: Portal2026Copy = {
  emptyWing: '등록된 스폰서·안내 슬롯이 없습니다.',
  emptyLocal: '등록된 로컬 업체가 아직 없습니다.',
  emptyLiveFeed: '실시간 통합 피드 항목이 아직 없습니다.',
  emptyRank: '이번 주 집계된 랭킹이 아직 없습니다.',
  boardColumns: [
    { title: '구인구직', moreHref: '/community/boards?cat=job', key: 'job', questCat: 'job' },
    { title: '번개장터', moreHref: '/community/boards?cat=flea', key: 'flea', questCat: 'flea' },
    { title: '자유게시판', moreHref: '/boards', key: 'free', questCat: 'free' },
    { title: '로컬 업체', moreHref: '/local', key: 'local' },
    { title: '태국 뉴스', moreHref: '/news', key: 'news' },
    { title: '💡 비자·생활 꿀팁', moreHref: '/tips', key: 'visaTips' },
    { title: '🚨 제보함', moreHref: '/boards?tab=reports', key: 'report' },
    { title: '💱 바트 환율', moreHref: '', key: 'fxRate' },
  ],
  sponsorTitle: '스폰서 · 안내',
  quickAppsTitle: '태국 생활 퀵 앱',
  quickAppsSub: '탭하면 새 창에서 열려요',
  quickAppsAria: '태국 생활 필수 앱 바로가기',
  shortcutTitle: '바로가기',
  rankTitle: '주간 도토리 획득 TOP 5',
  rankSub: '이번 주 서울 주간 미션 집계',
  liveFeedTitle: '실시간 통합 피드',
  liveFeedTabAll: '🌐 전체 흐름',
  liveFeedTabHot: '🔥 실시간 인기',
  liveFeedTabQa: '💬 생활 Q&A',
  liveFeedTabFlea: '🛍️ 벼룩시장',
  emptyLiveFeedTab: '이 탭에 맞는 글이 아직 없어요. 다른 탭을 눌러 보세요.',
  newsAsideTitle: '오늘의 핫이슈',
  localAsideTitle: '로컬 업체',
  contactTitle: '문의',
  contactBody: '게시판·업체 등록은 각 메뉴에서 진행됩니다.',
  hubBoard: '광장',
  tradeHub: '중고·알바',
  koreanBizShortcut: '🇰🇷 한인 생활망 (마트/약국/병원)',
  newsLink: '뉴스',
  more: '더보기',
  newsHubMore: '뉴스 허브에서 전체 보기 →',
  emptyList: '목록을 불러오지 못했습니다.',
  weatherWidgetAria: '방콕 현재 날씨',
  weatherLoading: '날씨 불러오는 중…',
  weatherUnavailable: '날씨를 불러오지 못했습니다.',
  rootAria: '태국에, 살자 포털',
  dotoriSuffix: '도토리',
  balanceHallTitle: '🏆 도토리 부자 명예의 전당 TOP 5',
  balanceHallSub: '보유 도토리 · 실시간',
  balanceHallEmpty: '아직 랭킹을 표시할 데이터가 없습니다.',
  balanceHallYourRank: '내 순위',
  balanceHallLoginHint: '로그인하면 내 순위와 보유량이 보여요.',
  balanceHallWriteCta: '글 쓰고 도토리 모으기 →',
  balanceGameTitle: '🤔 오늘의 태국 밸런스 게임',
  balanceGameSub: 'LIVE · 한 번만 투표 · 실시간 득표',
  balanceVs: 'VS',
  balanceSkeletonAria: '아직 투표 전입니다. 양쪽 비율은 투표 후에만 표시됩니다.',
  balanceResultAria: '투표 결과 비율',
  balanceTapHint: '버튼을 누르면 득표율 바가 살아 움직여요',
  balanceYourPick: '내 선택',
};

const th: Portal2026Copy = {
  emptyWing: 'ยังไม่มีช่องสปอนเซอร์·ประกาศ',
  emptyLocal: 'ยังไม่มีร้านท้องถิ่นในรายการ',
  emptyLiveFeed: 'ยังไม่มีกิจกรรมในฟีดรวม',
  emptyRank: 'ยังไม่มีอันดับสัปดาห์นี้',
  boardColumns: [
    { title: 'รับสมัครงาน', moreHref: '/community/boards?cat=job', key: 'job', questCat: 'job' },
    { title: 'ตลาดมือสอง', moreHref: '/community/boards?cat=flea', key: 'flea', questCat: 'flea' },
    { title: 'บอร์ดทั่วไป', moreHref: '/boards', key: 'free', questCat: 'free' },
    { title: 'ร้านท้องถิ่น', moreHref: '/local', key: 'local' },
    { title: 'ข่าวไทย', moreHref: '/news', key: 'news' },
    { title: '💡 วีซ่า·ไลฟ์เคล็ดลับ', moreHref: '/tips', key: 'visaTips' },
    { title: '🚨 แจ้งเบาะแส', moreHref: '/boards?tab=reports', key: 'report' },
    { title: '💱 เรทบาท', moreHref: '', key: 'fxRate' },
  ],
  sponsorTitle: 'สปอนเซอร์ · ประกาศ',
  quickAppsTitle: 'แอปจำเป็นในชีวิตไทย',
  quickAppsSub: 'แตะแล้วเปิดหน้าต่างใหม่',
  quickAppsAria: 'ทางลัดแอปสำหรับชีวิตในไทย',
  shortcutTitle: 'ทางลัด',
  rankTitle: 'อันดับดอกท้อยอดเยี่ยม 5 อันดับ',
  rankSub: 'สรุปภารกิจรายสัปดาห์ (โซล)',
  liveFeedTitle: 'ฟีดรวมแบบเรียลไทม์',
  liveFeedTabAll: '🌐 ทั้งหมด',
  liveFeedTabHot: '🔥 ยอดนิยม',
  liveFeedTabQa: '💬 ถาม-ตอบ',
  liveFeedTabFlea: '🛍️ ตลาดมือสอง',
  emptyLiveFeedTab: 'ยังไม่มีโพสต์ในแท็บนี้ ลองแท็บอื่น',
  newsAsideTitle: 'ประเด็นร้อนวันนี้',
  localAsideTitle: 'ร้านท้องถิ่น',
  contactTitle: 'ติดต่อ',
  contactBody: 'โพสต์บอร์ด·ลงร้าน — ใช้เมนูแต่ละส่วนได้เลย',
  hubBoard: 'ลานชุมชน',
  tradeHub: 'มือสอง · งาน',
  koreanBizShortcut: '🇰🇷 ชีวิตเกาหลี (มาร์ท/ร้านยา/โรงพยาบาล)',
  newsLink: 'ข่าว',
  more: 'เพิ่มเติม',
  newsHubMore: 'ดูทั้งหมดในฮับข่าว →',
  emptyList: 'โหลดรายการไม่ได้',
  weatherWidgetAria: 'สภาพอากาศกรุงเทพฯ',
  weatherLoading: 'กำลังโหลดสภาพอากาศ…',
  weatherUnavailable: 'โหลดสภาพอากาศไม่ได้',
  rootAria: 'พอร์ทัล อยู่ไทยกัน',
  dotoriSuffix: 'ดอกท้อ',
  balanceHallTitle: '🏆 อันดับเศรษฐีดอกท้อ TOP 5',
  balanceHallSub: 'ยอดคงเหลือ · เรียลไทม์',
  balanceHallEmpty: 'ยังไม่มีข้อมูลจัดอันดับ',
  balanceHallYourRank: 'อันดับของคุณ',
  balanceHallLoginHint: 'ล็อกอินเพื่อดูอันดับและยอดคงเหลือ',
  balanceHallWriteCta: 'โพสต์เพื่อสะสมดอกท้อ →',
  balanceGameTitle: '🤔 เกมทายใจไทยวันนี้',
  balanceGameSub: 'LIVE · โหวตได้ครั้งเดียว · เรียลไทม์',
  balanceVs: 'VS',
  balanceSkeletonAria: 'ยังไม่ได้โหวต เปอร์เซ็นต์จะแสดงหลังโหวต',
  balanceResultAria: 'สัดส่วนผลโหวต',
  balanceTapHint: 'แตะแล้วแถบเปอร์เซ็นต์จะขยับทันที',
  balanceYourPick: 'คุณเลือก',
};

export function getPortal2026Copy(locale: Locale): Portal2026Copy {
  return locale === 'th' ? th : ko;
}
