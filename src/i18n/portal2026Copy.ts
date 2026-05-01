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
    key: 'job' | 'flea' | 'free' | 'local' | 'news' | 'qna';
    questCat?: 'job' | 'flea' | 'free';
  }[];
  sponsorTitle: string;
  scaleTitle: string;
  shortcutTitle: string;
  rankTitle: string;
  rankSub: string;
  liveFeedTitle: string;
  newsAsideTitle: string;
  localAsideTitle: string;
  contactTitle: string;
  contactBody: string;
  statsUnavailable: string;
  profileLabel: string;
  postsLabel: string;
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
    { title: '생활 Q&A', moreHref: '/community/boards?cat=qna', key: 'qna' },
  ],
  sponsorTitle: '스폰서 · 안내',
  scaleTitle: '커뮤니티 규모',
  shortcutTitle: '바로가기',
  rankTitle: '주간 도토리 획득 TOP 5',
  rankSub: '이번 주 서울 주간 퀘스트 집계',
  liveFeedTitle: '실시간 통합 피드',
  newsAsideTitle: '오늘의 핫이슈',
  localAsideTitle: '로컬 업체',
  contactTitle: '문의',
  contactBody: '게시판·업체 등록은 각 메뉴에서 진행됩니다.',
  statsUnavailable: '집계 정보를 불러오지 못했습니다.',
  profileLabel: '프로필',
  postsLabel: '공개 글·거래',
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
    { title: 'ถาม–ตอบ', moreHref: '/community/boards?cat=qna', key: 'qna' },
  ],
  sponsorTitle: 'สปอนเซอร์ · ประกาศ',
  scaleTitle: 'ขนาดชุมชน',
  shortcutTitle: 'ทางลัด',
  rankTitle: 'อันดับดอกท้อยอดเยี่ยม 5 อันดับ',
  rankSub: 'สรุปภารกิจรายสัปดาห์ (โซล)',
  liveFeedTitle: 'ฟีดรวมแบบเรียลไทม์',
  newsAsideTitle: 'ประเด็นร้อนวันนี้',
  localAsideTitle: 'ร้านท้องถิ่น',
  contactTitle: 'ติดต่อ',
  contactBody: 'โพสต์บอร์ด·ลงร้าน — ใช้เมนูแต่ละส่วนได้เลย',
  statsUnavailable: 'โหลดตัวเลขสรุปไม่ได้',
  profileLabel: 'โปรไฟล์',
  postsLabel: 'โพสต์·ธุรกรรม',
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
};

export function getPortal2026Copy(locale: Locale): Portal2026Copy {
  return locale === 'th' ? th : ko;
}
