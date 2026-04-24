/**
 * 사이트 내 고정 경로 검색 인덱스 (DB 없음).
 * koBlob / thBlob 에 동의어·말머리·초성으로 찾기 쉬운 단어를 넣습니다.
 */
export type SiteSearchEntryDef = {
  href: string;
  koTitle: string;
  thTitle: string;
  koHint?: string;
  thHint?: string;
  /** 공백으로 이어 붙인 검색 키워드 (한국어) */
  koBlob: string;
  /** 태국어 키워드 */
  thBlob: string;
};

export const SITE_SEARCH_ENTRIES: SiteSearchEntryDef[] = [
  {
    href: '/',
    koTitle: '홈',
    thTitle: 'หน้าแรก',
    koHint: '/',
    thHint: '/',
    koBlob: '홈 메인 대시보드 피드 태자월드 thai ja',
    thBlob: 'หน้าแรก โฮม ฟีด แดชบอร์ด ไทยจา',
  },
  {
    href: '/my-local-shop',
    koTitle: '내 로컬 가게 미니홈 (오너)',
    thTitle: 'ร้านของฉัน (เจ้าของ)',
    koHint: '/my-local-shop',
    thHint: '/my-local-shop',
    koBlob: '내 로컬 가게 미니홈 오너 가게 수정 BGM 메뉴 스킨 로컬식당',
    thBlob: 'ร้านของฉัน มินิโฮม เจ้าของ แก้ไข เมนู',
  },
  {
    href: '/local',
    koTitle: '로컬 맛집 · 배달',
    thTitle: 'ร้านท้องถิ่น · เดลิเวอรี่',
    koHint: '/local',
    thHint: '/local',
    koBlob:
      '로컬 맛집 배달 음식점 가게 일촌 검증 딜리버리 방콕 파타야 치앙마이 식당 추천',
    thBlob:
      'ร้านท้องถิ่น เดลิเวอรี่ อาหาร สั่งอาหาร แนะนำ กรุงเทพ พัทยา เชียงใหม่ ร้านอาหาร',
  },
  {
    href: '/community/boards',
    koTitle: '광장 수다 · 게시판',
    thTitle: 'ลานคุย · บอร์ด',
    koHint: '/community/boards',
    thHint: '/community/boards',
    koBlob:
      '광장 수다 게시판 커뮤니티 자유 TMI 잡담 글 목록 톡 플라자 보드 community boards',
    thBlob: 'ลานคุย บอร์ด ชุมชน ทั่วไป คุย โพสต์ รายการ',
  },
  {
    href: '/community/boards?cat=info',
    koTitle: '정보 게시판 (비자 등)',
    thTitle: 'บอร์ดข้อมูล (วีซ่า ฯลฯ)',
    koHint: '예: ㅂㅈ → 비자',
    thHint: 'เช่น พิมพ์ วีซ่า',
    koBlob:
      '비자 비자정보 비자 정보 체류 TM30 90일 리포트 이민 출입국 공지 가이드 팁 정보 게시판',
    thBlob:
      'วีซ่า ข้อมูล ต่ออายุ ตม. TM30 รายงาน 90 วัน คู่มือ บอร์ดข้อมูล visa stay',
  },
  {
    href: '/community/boards?cat=restaurant',
    koTitle: '맛집 게시판',
    thTitle: 'บอร์ดร้านแนะนำ',
    koHint: '/community/boards?cat=restaurant',
    thHint: '/community/boards?cat=restaurant',
    koBlob: '맛집 음식 맛집추천 식당 레스토랑 카페 배달 정보 게시판',
    thBlob: 'ร้านอาหาร แนะนำ คาเฟ่ อร่อย บอร์ดร้านอาหาร',
  },
  {
    href: '/community/boards?cat=free',
    koTitle: '자유 게시판',
    thTitle: 'บอร์ดทั่วไป',
    koHint: '/community/boards?cat=free',
    thHint: '/community/boards?cat=free',
    koBlob: '자유 잡담 수다 일상 TMI 게시판',
    thBlob: 'ทั่วไป คุย บอร์ด',
  },
  {
    href: '/community/boards?cat=intro',
    koTitle: '가입 인사',
    thTitle: 'กระทู้ทักทาย',
    koHint: '/community/boards?cat=intro',
    thHint: '/community/boards?cat=intro',
    koBlob: '가입인사 인사말 환영 신입 첫인사',
    thBlob: 'ทักทาย สมาชิกใหม่ กระทู้แรก ทัก​ทาย',
  },
  {
    href: '/community/boards?cat=flea',
    koTitle: '익명 한줄장 · 중고',
    thTitle: 'ตลาดบรรทัดเดียว · มือสอง',
    koHint: '/community/boards?cat=flea',
    thHint: '/community/boards?cat=flea',
    koBlob: '중고 나눔 장터 플리마켓 한줄장 익명 거래 판매 구매 flea market',
    thBlob: 'มือสอง ขาย ซื้อ ตลาด บรรทัดเดียว',
  },
  {
    href: '/community/boards?cat=job',
    koTitle: '구인구직 · 알바',
    thTitle: 'หางาน · พาร์ทไทม์',
    koHint: '/community/boards?cat=job',
    thHint: '/community/boards?cat=job',
    koBlob: '알바 구인 구직 채용 일자리 아르바이트 job part time',
    thBlob: 'หางาน จ้างงาน พาร์ทไทม์ งาน สมัครงาน',
  },
  {
    href: '/community/trade',
    koTitle: '중고·알바 허브',
    thTitle: 'ศูนย์มือสอง·งาน',
    koHint: '/community/trade',
    thHint: '/community/trade',
    koBlob: '중고 알바 거래 허브 장터 구인 플리마켓 trade hub',
    thBlob: 'มือสอง หางาน ศูนย์กลาง ซื้อขาย',
  },
  {
    href: '/chat',
    koTitle: '실시간 채팅',
    thTitle: 'แชตเรียลไทม์',
    koHint: '/chat',
    thHint: '/chat',
    koBlob: '채팅 채팅방 실시간 대화 메신저',
    thBlob: 'แชต ห้องแชต เรียลไทม์ ข้อความ',
  },
  {
    href: '/notifications',
    koTitle: '알림함',
    thTitle: 'กล่องแจ้งเตือน',
    koHint: '/notifications',
    thHint: '/notifications',
    koBlob: '알림 알림함 공지 읽음',
    thBlob: 'แจ้งเตือน กล่องแจ้งเตือน',
  },
  {
    href: '/community/boards/new',
    koTitle: '글쓰기',
    thTitle: 'เขียนโพสต์',
    koHint: '/community/boards/new',
    thHint: '/community/boards/new',
    koBlob: '글쓰기 새글 등록 작성 포스트 올리기',
    thBlob: 'โพสต์ เขียน สร้างโพสต์ ใหม่',
  },
  {
    href: '/minihome',
    koTitle: '미니홈',
    thTitle: 'มินิโฮม',
    koHint: '/minihome',
    thHint: '/minihome',
    koBlob: '미니홈 싸이 공간 프로필 방 꾸미기 BGM',
    thBlob: 'มินิโฮม โปรไฟล์ ห้อง ตกแต่ง',
  },
  {
    href: '/news',
    koTitle: '뉴스 스냅샷·속보',
    thTitle: 'สรุปข่าว·ฮอต',
    koHint: '/news',
    thHint: '/news',
    koBlob: '뉴스 스냅샷 속보 요약 기사 processed news 허브 목록',
    thBlob: 'ข่าว สรุป ฮอต รายการข่าว news snapshot',
  },
  {
    href: '/tips',
    koTitle: '태국 생활 꿀팁',
    thTitle: 'ทิปส์ชีวิตในไทย',
    koHint: '/tips',
    thHint: '/tips',
    koBlob: '꿀팁 태국 생활 정보 비회원 훅 로그인 전체',
    thBlob: 'ทิปส์ ไทย ชีวิต ข้อมูล ล็อกอิน',
  },
  {
    href: '/minihome/shop',
    koTitle: '미니홈 스타일 상점',
    thTitle: 'ร้านสไตล์มินิโฮม',
    koHint: '/minihome/shop',
    thHint: '/minihome/shop',
    koBlob: '스타일 점수 미니미 스킨 코스메틱 상점 꾸미기',
    thBlob: 'สไตล์พอยต์ มินิมี สกิน ร้านค้า แต่งมินิโฮม',
  },
  {
    href: '/ilchon',
    koTitle: '일촌 · 친구함',
    thTitle: 'อิลชอน · กล่องเพื่อน',
    koHint: '/ilchon',
    thHint: '/ilchon',
    koBlob: '일촌 친구 신청 받은함 보낸함 cy 싸이 맺기',
    thBlob: 'อิลชอน เพื่อน กล่องข้อความ คำขอ รับ เพื่อนในไทย',
  },
  {
    href: '/auth/login',
    koTitle: '로그인',
    thTitle: 'เข้าสู่ระบบ',
    koHint: '/auth/login',
    thHint: '/auth/login',
    koBlob: '로그인 sign in 로그인하기 계정',
    thBlob: 'ล็อกอิน เข้าสู่ระบบ บัญชี',
  },
  {
    href: '/auth/signup',
    koTitle: '회원가입',
    thTitle: 'สมัครสมาชิก',
    koHint: '/auth/signup',
    thHint: '/auth/signup',
    koBlob: '회원가입 가입 계정 만들기 register',
    thBlob: 'สมัคร สมาชิก ลงทะเบียน',
  },
];
