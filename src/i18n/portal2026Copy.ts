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
  thaiSuffix: string;
  /** 우측·모바일 — 당일 타이(THAI) 획득 랭킹 */
  balanceHallTitle: string;
  balanceHallSub: string;
  balanceHallEmpty: string;
  /** 랭킹 워밍업 행 옆 짧은 뱃지(실데이터 없을 때만) */
  balanceHallWarmupBadge: string;
  /** 푸터 — 오늘 획득 라벨 */
  balanceHallYouToday: string;
  /** 푸터 — 당일 순위 접두(뒤에 #n) */
  balanceHallTodayRankPrefix: string;
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
  /** 오픈 기념 — 가입 인사 미션 배너(링크는 `/boards/new?category=greetings`) */
  openGreetingBannerLine: string;
  openGreetingBannerAria: string;
  /** 실시간 급상승 검색어 — 상단 전광판·우측 패널 */
  trendingTickerTitle: string;
  trendingAsideTitle: string;
  trendingEmpty: string;
  /** 지금 태국은? 사진 스트립 */
  thailandPhotosTitle: string;
  /** 일일 태국 포춘 — 리텐션 */
  fortuneButton: string;
  fortuneModalTitle: string;
  fortuneLoading: string;
  fortuneAlreadyClaimed: string;
  fortuneNoTips: string;
  fortuneConfigError: string;
  fortuneErrorGeneric: string;
  fortuneLoginToast: string;
  fortuneTipLead: string;
  fortuneTipFallback: string;
  fortuneReadMore: string;
  fortuneClose: string;
  /** site_settings 일일 스파크 — 포춘 버튼 위 테마 카드 제목 */
  fortuneSparkThemeTitle: string;
  /** 포털 뉴스·꿀팁 줄 — AI 가공 뱃지 */
  feedBadgeAiAnalyzed: string;
  feedBadgeCountermeasure: string;
  feedBadgeTipsHoney: string;
  /** 포춘 API/네트워크 실패 구분 */
  fortuneErrorNetwork: string;
  fortuneErrorServer: string;
  /** 로딩 스켈레톤 — 순환 표시용 짧은 문구 */
  fortuneFetchingWittyA: string;
  fortuneFetchingWittyB: string;
  fortuneFetchingWittyC: string;
  fortuneRetryCta: string;
  fortuneTransientHint: string;
  /** 캐시된 오늘 카드 표시 중 백그라운드 재검증 */
  fortuneStaleRevalidateNote: string;
  /** 실패 시 자동 재시도 중 안내(수동 재시도 없이) */
  fortuneAutoRetryNote: string;
  /** 개인화·공동 미션 허브 */
  missionHubPersonalTitle: string;
  missionHubPersonalLoginHint: string;
  missionHubPersonalEmpty: string;
  missionHubPersonalCta: string;
  /** DB·크론 기반 일일 추천 미션 배지 */
  missionHubSparkBadge: string;
  missionHubCollabTitle: string;
  missionHubCollabEmpty: string;
  missionHubCollabFootnote: string;
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
  rankTitle: '주간 타이(THAI) 획득 TOP 5',
  rankSub: '이번 주 서울 주간 미션 집계',
  liveFeedTitle: '실시간 통합 피드',
  liveFeedTabAll: '🌐 전체 흐름',
  liveFeedTabHot: '실시간 인기',
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
  rootAria: '포털 홈',
  thaiSuffix: '타이',
  balanceHallTitle: '오늘 타이(THAI) 획득 랭킹 TOP 5',
  balanceHallSub: '서울 당일 · 적립 합산 · 실시간',
  balanceHallEmpty: '아직 랭킹을 표시할 데이터가 없습니다.',
  balanceHallWarmupBadge: '커뮤니티 펄스',
  balanceHallYouToday: '오늘 획득',
  balanceHallTodayRankPrefix: '오늘 순위',
  balanceHallLoginHint: '로그인하면 보유량·오늘 획득·순위가 보여요.',
  balanceHallWriteCta: '글 쓰고 타이 모으기 →',
  balanceGameTitle: '🤔 오늘의 태국 밸런스 게임',
  balanceGameSub: 'LIVE · 한 번만 투표 · 실시간 득표',
  balanceVs: 'VS',
  balanceSkeletonAria: '아직 투표 전입니다. 양쪽 비율은 투표 후에만 표시됩니다.',
  balanceResultAria: '투표 결과 비율',
  balanceTapHint: '버튼을 누르면 득표율 바가 살아 움직여요',
  balanceYourPick: '내 선택',
  openGreetingBannerLine:
    '[오픈 기념] 가입 인사만 남겨도 500 타이(THAI) 즉시 100% 지급',
  openGreetingBannerAria: '가입 인사 글쓰기로 오픈 기념 타이(THAI) 미션 참여',
  trendingTickerTitle: '실시간 급상승 키워드',
  trendingAsideTitle: '급상승 검색 TOP',
  trendingEmpty: '검색이 쌓이면 실시간 순위가 올라와요. 상단 검색창을 써 보세요!',
  thailandPhotosTitle: '지금 태국은? 실시간 현지 사진',
  fortuneButton: '🥠 오늘의 태국 생활 운세 & 꿀팁 열어보기',
  fortuneModalTitle: '오늘의 태국 포춘',
  fortuneLoading: '포춘 쿠키를 여는 중…',
  fortuneAlreadyClaimed: '오늘은 이미 출석했어요. 내일 Bangkok 자정 이후에 다시 열어보세요!',
  fortuneNoTips: '표시할 꿀팁이 아직 없습니다. 잠시 후 다시 시도해 주세요.',
  fortuneConfigError: '보상 설정을 불러오지 못했습니다. 관리자에게 문의해 주세요.',
  fortuneErrorGeneric: '처리 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.',
  fortuneLoginToast: '로그인 후 이용할 수 있는 기능입니다.',
  fortuneTipLead: '오늘의 한 줄 꿀팁',
  fortuneTipFallback: '태국 생활, 오늘도 안전하게!',
  fortuneReadMore: '꿀팁 허브에서 자세히 보기 →',
  fortuneClose: '닫기',
  fortuneSparkThemeTitle: '오늘의 운세 테마',
  feedBadgeAiAnalyzed: 'AI 분석 완료',
  feedBadgeCountermeasure: '대비책 포함',
  feedBadgeTipsHoney: '실전 꿀팁',
  fortuneErrorNetwork: '네트워크가 불안정해요. 잠시 후 다시 시도해 주세요.',
  fortuneErrorServer: '서버 응답이 지연됐어요. 잠시 후 다시 시도해 주세요.',
  fortuneFetchingWittyA: '🌴 방콕의 오늘 기운을 읽어 오는 중…',
  fortuneFetchingWittyB: '🥠 포춘 쿠키 안의 한 줄을 고르고 있어요…',
  fortuneFetchingWittyC: '📡 Bangkok 자정 기준 출석 줄을 서버와 맞추는 중!',
  fortuneRetryCta: '다시 받아보기',
  fortuneTransientHint:
    '잠깐 길목이 혼잡했어요. 아래 버튼으로 재시도하거나, 조금 뒤에 다시 열어 보세요.',
  fortuneStaleRevalidateNote:
    '이전에 받은 오늘의 카드를 보여 드려요. 서버가 곧 따라올 때까지 그대로 두었어요.',
  fortuneAutoRetryNote: '연결을 자동으로 다시 시도 중이에요. 잠시만 기다려 주세요.',
  missionHubPersonalTitle: '오늘 나만의 미션',
  missionHubPersonalLoginHint: '로그인하면 활동 기반 맞춤 미션이 매일 표시됩니다.',
  missionHubPersonalEmpty: '오늘 미션을 준비하는 중이에요. 잠시 후 새로고침해 보세요.',
  missionHubPersonalCta: '미션 하러 가기',
  missionHubSparkBadge: '오늘의 추천 · 매일 새벽 갱신',
  missionHubCollabTitle: '함께하는 목표',
  missionHubCollabEmpty: '진행 중인 공동 미션이 없습니다.',
  missionHubCollabFootnote: '진행률은 운영 집계·이벤트로 반영됩니다.',
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
  rankTitle: 'อันดับ THAI รายสัปดาห์ TOP 5',
  rankSub: 'สรุปภารกิจรายสัปดาห์ (โซล)',
  liveFeedTitle: 'ฟีดรวมแบบเรียลไทม์',
  liveFeedTabAll: '🌐 ทั้งหมด',
  liveFeedTabHot: 'ยอดนิยม',
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
  rootAria: 'พอร์ทัลหน้าแรก',
  thaiSuffix: 'THAI',
  balanceHallTitle: 'อันดับ THAI ที่ได้วันนี้ TOP 5',
  balanceHallSub: 'ตามวันที่โซล · รวมยอด THAI · เรียลไทม์',
  balanceHallEmpty: 'ยังไม่มีข้อมูลจัดอันดับ',
  balanceHallWarmupBadge: 'พัลส์ชุมชน',
  balanceHallYouToday: 'วันนี้ได้รับ',
  balanceHallTodayRankPrefix: 'อันดับวันนี้',
  balanceHallLoginHint: 'ล็อกอินเพื่อดูยอดคงเหลือ·ที่ได้วันนี้·อันดับ',
  balanceHallWriteCta: 'โพสต์เพื่อสะสม THAI →',
  balanceGameTitle: '🤔 เกมทายใจไทยวันนี้',
  balanceGameSub: 'LIVE · โหวตได้ครั้งเดียว · เรียลไทม์',
  balanceVs: 'VS',
  balanceSkeletonAria: 'ยังไม่ได้โหวต เปอร์เซ็นต์จะแสดงหลังโหวต',
  balanceResultAria: 'สัดส่วนผลโหวต',
  balanceTapHint: 'แตะแล้วแถบเปอร์เซ็นต์จะขยับทันที',
  balanceYourPick: 'คุณเลือก',
  openGreetingBannerLine:
    '[เปิดตัว] ทักทายสมาชิกใหม่รับ 500 THAI ทันที — จ่ายครบ 100%',
  openGreetingBannerAria: 'ไปหน้าเขียนโพสต์ทักทายเพื่อรับ THAI กิจกรรมเปิดตัว',
  trendingTickerTitle: 'คียร์เวิร์ดพุ่งแรงแบบเรียลไทม์',
  trendingAsideTitle: 'ค้นหายอดนิยม',
  trendingEmpty: 'พิมพ์ค้นหาในช่องด้านบน แล้วเทรนด์จะโผล่ที่นี่!',
  thailandPhotosTitle: 'ตอนนี้ที่ไทย? ภาพสดจากชุมชน',
  fortuneButton: '🥠 เปิดดวงชีวิตไทยวันนี้ · เคล็ดลับสั้นๆ',
  fortuneModalTitle: 'ดวงชีวิตไทยวันนี้',
  fortuneLoading: 'กำลังเปิดคุกกี้ดวง…',
  fortuneAlreadyClaimed: 'วันนี้เช็คอินแล้ว พรุ่งนี้หลังเที่ยงคืน (เวลาไทย) ค่อยมาใหม่นะ!',
  fortuneNoTips: 'ยังไม่มีเคล็ดลับในตอนนี้ ลองใหม่ภายหลัง',
  fortuneConfigError: 'โหลดการตั้งค่ารางวัลไม่ได้ ติดต่อผู้ดูแล',
  fortuneErrorGeneric: 'เกิดข้อผิดพลาด ลองใหม่ภายหลัง',
  fortuneLoginToast: 'เข้าสู่ระบบก่อนใช้งาน',
  fortuneTipLead: 'เคล็ดลับหนึ่งบรรทัดวันนี้',
  fortuneTipFallback: 'ชีวิตในไทยวันนี้ ขอให้ปลอดภัย!',
  fortuneReadMore: 'อ่านเพิ่มในฮับเคล็ดลับ →',
  fortuneClose: 'ปิด',
  fortuneSparkThemeTitle: 'ธีมดวงวันนี้ (ภาษาเกาหลี)',
  feedBadgeAiAnalyzed: 'วิเคราะห์ AI แล้ว',
  feedBadgeCountermeasure: 'มีแนวรับมือ',
  feedBadgeTipsHoney: 'เคล็ดลับใช้จริง',
  fortuneErrorNetwork: 'เน็ตเวิร์กไม่เสถียร ลองใหม่ในอีกสักครู่',
  fortuneErrorServer: 'เซิร์ฟเวอร์ตอบช้า ลองใหม่ในอีกสักครู่',
  fortuneFetchingWittyA: '🌴 กำลังอ่านค่าวันนี้จากกรุงเทพฯ…',
  fortuneFetchingWittyB: '🥠 กำลังหยิบคำทำนายหนึ่งบรรทัดในคุกกี้ดวง…',
  fortuneFetchingWittyC: '📡 กำลังเช็คเวลาไทยกับเซิร์ฟเวอร์เพื่อเช็คอินรายวัน!',
  fortuneRetryCta: 'ลองอีกครั้ง',
  fortuneTransientHint: 'ตอนนี้คิวหน่วงนิดหน่อย แตะลองใหม่ หรือกลับมาใหม่ในอึดใจ',
  fortuneStaleRevalidateNote:
    'แสดงการ์ดวันนี้ที่เคยได้รับไว้ — ระบบจะซิงก์เซิร์ฟเวอร์ให้เอง',
  fortuneAutoRetryNote: 'กำลังลองเชื่อมต่อใหม่อัตโนมัติ รอสักครู่นะคะ',
  missionHubPersonalTitle: 'ภารกิจวันนี้ของคุณ',
  missionHubPersonalLoginHint: 'ล็อกอินเพื่อรับภารกิจรายวันตามพฤติกรรม',
  missionHubPersonalEmpty: 'กำลังเตรียมภารกิจ — ลองรีเฟรชอีกครั้ง',
  missionHubPersonalCta: 'ไปทำภารกิจ',
  missionHubSparkBadge: 'แนะนำวันนี้ · อัปเดตทุกเช้า (KO)',
  missionHubCollabTitle: 'เป้าร่วมชุมชน',
  missionHubCollabEmpty: 'ยังไม่มีภารกิจร่วมในช่วงนี้',
  missionHubCollabFootnote: 'ความคืบหน้าอัปเดตจากระบบ/กิจกรรม',
};

export function getPortal2026Copy(locale: Locale, siteDisplayName?: string | null): Portal2026Copy {
  const base: Portal2026Copy = structuredClone(locale === 'th' ? th : ko);
  const name = (siteDisplayName ?? '').trim();
  if (name) {
    base.rootAria = locale === 'th' ? `พอร์ทัล ${name}` : `${name} 포털`;
  }
  return base;
}
