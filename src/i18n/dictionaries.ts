/**
 * UI 문자열 — 1차: 네비·푸터·홈 고정 카피 (본문·게시글 번역은 다음 단계)
 */
import type { Locale } from './types';

export type Dictionary = {
  nav: {
    home: string;
    local: string;
    community: string;
    botConsole: string;
  };
  brandSuffix: string;
  logoAria: string;
  lang: { ko: string; th: string };
  footer: string;
  tierPremium: string;
  tierStandard: string;
  home: {
    tag: string;
    title: string;
    leadBefore: string;
    leadAccent: string;
    leadAfter: string;
    dreamIntro: string;
    dreamMinihome: string;
    dreamMid: string;
    dreamPersonal: string;
    dreamOutro: string;
    hubBoard: string;
    hubBoardSub: string;
    hubLocal: string;
    hubLocalSub: string;
    hubNotice: string;
    hubNoticeSub: string;
    hubTip: string;
    hubTipSoon: string;
    hotLabel: string;
    hotNewsBadge: string;
    hotNewsEmpty: string;
    hotNewsLoading: string;
    hotFootnote: string;
    shopsTitle: string;
    shopsMore: string;
    shopsEmpty: string;
    shopsEmptyLink: string;
    shopsLoading: string;
    weatherTitle: string;
    /** Open-Meteo 등 출처 표기 */
    weatherAttribution: string;
    weatherBangkok: string;
    weatherPattaya: string;
    weatherChiangMai: string;
    weatherLoading: string;
    weatherUnavailable: string;
    fxTitle: string;
    fxMock: string;
    fxRemote: {
      subtitle: string;
      baseHint: string;
      amountLabel: string;
      refresh: string;
      liveLine: string;
      mockLine: string;
      updated: string;
      fallback: string;
      thaiUi: string;
      koUi: string;
      minihome: string;
      slotEmpty: string;
      slotSoon: string;
      styleHint: string;
      thb: string;
      krw: string;
      usd: string;
      /** 다이제스트에만 표시 — 실제 위젯은 플로팅 */
      floatingHint: string;
      dragHandle: string;
      keypadShow: string;
      keypadHide: string;
      minimize: string;
      expandFab: string;
      menuAria: string;
      /** 플레이스홀더 {own}{cost}{after} */
      stylePreviewLine: string;
      styleOwnLine: string;
    };
    tipDigestTitle: string;
    tipTelegram: string;
    tipWhatsapp: string;
    tipLine: string;
    tipEnvHint: string;
    newsTitle: string;
    newsSub: string;
    newsLoading: string;
    /** 플레이스홀더 {n} = 전체 뉴스 건수 */
    newsCountLine: string;
    newsEmpty: string;
    newsEmptyLink: string;
    newsDetailBack: string;
    newsDetailWitLabel: string;
    newsDetailSummaryLabel: string;
    newsDetailExternalCta: string;
    newsDetailExternalHint: string;
    newsDetailMissing: string;
  };
  board: {
    pageTitle: string;
    newPost: string;
    login: string;
    signup: string;
    logout: string;
    empty: string;
    category: string;
    title: string;
    body: string;
    imagesHint: string;
    submit: string;
    uploading: string;
    needLogin: string;
    backToList: string;
    author: string;
    comments: string;
    commentBody: string;
    sendComment: string;
    loginForComment: string;
    views: string;
    /** 익명 한줄장·구인 목록 상단 안내 */
    gatedBanner: string;
    /** 게이트 구역에서 글쓰기 버튼 대체 */
    newPostDisabled: string;
    /** /community/trade 허브 */
    tradeHubTitle: string;
    tradeHubIntro: string;
    tradeFleaCta: string;
    tradeJobCta: string;
    tradeAllBoards: string;
    emptyGated: string;
    mod: {
      nsfw: string;
      promo: string;
      banned: string;
      imagePolicy: string;
      scam: string;
      server: string;
      auth: string;
      generic: string;
    };
  };
  /** 로그인·가입·비밀번호 재설정 등 /auth 라우트 */
  auth: {
    suspenseLoading: string;
    email: string;
    password: string;
    or: string;
    ellipsis: string;
    loginTitle: string;
    loginSubtitle: string;
    honeypotLogin: string;
    honeypotSignup: string;
    turnstileIncomplete: string;
    turnstileVerifyFailed: string;
    submitLogin: string;
    forgotPassword: string;
    noAccount: string;
    signupLink: string;
    signupTitle: string;
    signupSubtitle: string;
    nickLabel: string;
    nickPlaceholder: string;
    signupSubmit: string;
    signupSubmitLoading: string;
    hasAccount: string;
    loginLink: string;
    checkEmailTitle: string;
    checkEmailSubtitleBefore: string;
    checkEmailSubtitleStrong: string;
    checkEmailSubtitleAfter: string;
    step1Label: string;
    step1HintSentPrefix: string;
    step1HintNoEmail: string;
    step2Label: string;
    step2Hint: string;
    step3Label: string;
    step3Hint: string;
    mailHelpTitle: string;
    mailHelp1: string;
    mailHelp2: string;
    mailHelp3: string;
    resendCooldown: string;
    resendSending: string;
    resendButton: string;
    resendSuccess: string;
    footerVerifiedLogin: string;
    footerOtherEmail: string;
    forgotTitle: string;
    forgotSubtitle: string;
    forgotSendLink: string;
    forgotBackLogin: string;
    forgotInfoSent: string;
    resetGateTitle: string;
    resetGateBefore: string;
    resetGateLink: string;
    resetGateAfter: string;
    resetGateHint: string;
    newPasswordTitle: string;
    newPasswordSubtitle: string;
    newPasswordLabel: string;
    saveAndLogin: string;
    callbackConnecting: string;
    callbackDone: string;
    callbackSessionFail: string;
    callbackTitleOk: string;
    callbackTitleWait: string;
    callbackToLogin: string;
    callbackToCheckEmail: string;
    googleContinue: string;
    devGoogleBadge: string;
    devGoogleTail: string;
    turnstileLoading: string;
    passwordHint: string;
    passwordTooShort: string;
    passwordTooLong: string;
    passwordNeedMix: string;
    passwordBanned: string;
  };
  minihome: {
    pageTitle: string;
    yourSpace: string;
    slugLabel: string;
    publicPage: string;
    guestbookLocked: string;
    albumLocked: string;
    needsLogin: string;
    notProvisioned: string;
    privateOrMissing: string;
  };
  weather: { city: string; condition: string };
  /** 기본·홈 메타 (locale별) */
  seo: {
    defaultTitle: string;
    titleTemplate: string;
    defaultDescription: string;
    homeTitle: string;
    homeDescription: string;
  };
  /** 일일 뉴스 웹 푸시 옵트인 (로그인·가입 화면) */
  push: {
    optInTitle: string;
    optInLead: string;
    optInHook: string;
    optInCookie: string;
    enable: string;
    disable: string;
    dismiss: string;
    needLogin: string;
    notSupported: string;
    working: string;
    enabledOk: string;
    error: string;
    permissionDenied: string;
  };
};

const ko: Dictionary = {
  nav: {
    home: '홈',
    local: '로컬',
    community: '광장',
    botConsole: '관리자',
  },
  brandSuffix: '월드',
  logoAria: '태국에 살자 월드 홈',
  lang: { ko: '한국어', th: 'ไทย' },
  footer:
    '© 2026 태자 월드 · thaijaworld.com | 익명 한줄장·알바·핫이슈·맛집·미니홈 — 태국 사는 한국어 SNS 피드',
  tierPremium: '프리미엄',
  tierStandard: '스탠다드',
  home: {
    tag: 'Thai Ja World · 미니홈 DNA, 2026 에디션 ♪',
    title: '태국 사는 한국어 피드 — 오늘 톡은 여기서',
    leadBefore: '뉴스 포털 그만 두고 ',
    leadAccent: '익명 한줄장 · 알바 · 핫이슈 · 맛집 · 로컬 · 익명 제보',
    leadAfter: ' 한 화면에 몰아넣은 동네 피드. 태국 살이 정보도 밈도 여기서.',
    dreamIntro: 'Next drop · ',
    dreamMinihome: '미니홈',
    dreamMid: ' — BGM 깔고 스킨·미니미로 ',
    dreamPersonal: '내 방',
    dreamOutro: ' 꾸미고 스타일 포인트 쌓는 그 텐션, ㄹㅇ 그 시절인데 UI만 2026. 우선은 광장부터 천천히.',
    hubBoard: '자유게시판',
    hubBoardSub: 'TMI · 정보 · 오늘 뭐 떴냐',
    hubLocal: '로컬 가게',
    hubLocalSub: '우리 동네 맛집 · 홍보 · LINE',
    hubNotice: '익명 한줄장 · 구인·거래',
    hubNoticeSub: '닉네임만 보이게 · 한줄·구인 글 바로 쓰기',
    hubTip: '익명 제보',
    hubTipSoon: '텔레·라인만 연결하면 끝 · 채널 열리면 알려 드릴게요',
    hotLabel: '🔥 지금 태국에서 포인트 잡을 이슈',
    hotNewsBadge: '브리핑',
    hotNewsEmpty: '여긴 아직 조용해요. 곧 태국 살이에 쓸 만한 이슈로 채울게요.',
    hotNewsLoading: '필요한 소식만 골라 오는 중…',
    hotFootnote:
      '제목을 누르면 원문 기사로 이동해요. 회색 한 줄은 요약이에요. 광장 게시판과는 다른 코너예요.',
    shopsTitle: '🏪 동네 가게',
    shopsMore: '더 보기 →',
    shopsEmpty: '아직 등록된 가게가 없어요.',
    shopsEmptyLink: '로컬 페이지로 이동',
    shopsLoading: '가게 목록 불러오는 중…',
    weatherTitle: '날씨 · 실측',
    weatherAttribution: 'Open-Meteo 실측 · 약 10분 단위 갱신',
    weatherBangkok: '방콕',
    weatherPattaya: '파타야',
    weatherChiangMai: '치앙마이',
    weatherLoading: '날씨 불러오는 중…',
    weatherUnavailable: '날씨를 불러오지 못했어요.',
    fxTitle: '환율 리모컨',
    fxMock: 'Frankfurter(ECB) · 새로고침으로 갱신',
    fxRemote: {
      subtitle: '누르면 바로 환산 · 나만의 홈 리모컨',
      baseHint: '기준 통화',
      amountLabel: '금액',
      refresh: '환율 새로고침',
      liveLine: 'Frankfurter(ECB) 기준 · ',
      mockLine: '네트워크 오류 — 예시 환율로 표시 중 · ',
      updated: '기준',
      fallback: '예시값',
      thaiUi: 'ไทย UI',
      koUi: '한국어 UI',
      minihome: '미니홈 플랜',
      slotEmpty: '빈 슬롯',
      slotSoon: '추가 버튼 자리 (예: 바로가기)',
      styleHint: '💡 이후 스타일 점수로 리모컨 스킨·버튼 꾸미기 예정 (싸이 감성 커스텀)',
      thb: 'THB',
      krw: 'KRW',
      usd: 'USD',
      floatingHint:
        '💱 모든 페이지 상단 오른쪽(기본) — 탭하면 미니 환율, 잡고 끌면 히어로 옆에 붙여 둘 수 있어요.',
      dragHandle: '잡고 이동',
      keypadShow: '키패드',
      keypadHide: '키패드 접기',
      minimize: '접기',
      expandFab: '환율 리모컨 열기',
      menuAria: '메뉴',
      stylePreviewLine: '{own} − {cost} → {after}',
      styleOwnLine: '보유 {own}★',
    },
    tipDigestTitle: '익명 제보 · 연락',
    tipTelegram: '텔레그램으로 익명 제보',
    tipWhatsapp: '왓츠앱으로 익명 제보',
    tipLine: '라인으로 익명 제보',
    tipEnvHint: '.env에 제보 URL 넣으면 여기서 바로 열려요.',
    newsTitle: '태국 살이 스냅샷',
    newsSub:
      '헤드라인 + 두세 줄 요약으로 기사처럼 읽히게 모았어요. 원문은 제목을 누르면 열려요. (ไทย 상단 언어 전환)',
    newsLoading: '스냅샷 불러오는 중…',
    newsCountLine: '총 {n}건 · 여기선 5건만 미리 보기',
    newsEmpty: '아직 이 코너가 비어 있어요. 잠시 후 다시 들러 주세요.',
    newsEmptyLink: '광장 보러 가기 →',
    newsDetailBack: '← 홈으로',
    newsDetailWitLabel: '태자 한마디',
    newsDetailSummaryLabel: '정리',
    newsDetailExternalCta: '원문 기사 열기',
    newsDetailExternalHint: '출처 언론·매체 사이트로 이동해요.',
    newsDetailMissing: '없거나 만료된 소식이에요. 홈으로 돌아가 주세요.',
  },
  board: {
    pageTitle: '광장 게시판',
    newPost: '글쓰기',
    login: '로그인',
    signup: '회원가입',
    logout: '로그아웃',
    empty: '첫 글을 남겨 주세요! 맛집·정보 환영해요.',
    category: '말머리',
    title: '제목',
    body: '내용',
    imagesHint: '사진 (최대 3장, JPG/PNG/WebP)',
    submit: '등록하기',
    uploading: '올리는 중…',
    needLogin: '글쓰기는 로그인 후 이용할 수 있어요.',
    backToList: '목록으로',
    author: '작성자',
    comments: '댓글',
    commentBody: '댓글을 입력하세요',
    sendComment: '댓글 등록',
    loginForComment: '댓글은 로그인 후 작성할 수 있어요.',
    views: '조회',
    gatedBanner:
      '이 구역은 정식 오픈 전입니다. 목록·기존 글은 열람만 가능하고, 새 글 작성은 잠시 닫혀 있어요.',
    newPostDisabled: '글쓰기 준비 중',
    tradeHubTitle: '익명 한줄장 · 구인·거래',
    tradeHubIntro:
      '프로필 닉만 보이는 한줄 장터·구인이에요. 목록에서 글쓰기로 바로 올릴 수 있어요.',
    tradeFleaCta: '한줄 장터 목록',
    tradeJobCta: '구인구직 목록',
    tradeAllBoards: '전체 광장으로',
    emptyGated: '아직 이 말머리로 올라온 글이 없어요. 정식 오픈 후 글쓰기가 열립니다.',
    mod: {
      nsfw: '부적절한 텍스트·이미지로 판단되어 등록할 수 없어요. 반복 시 계정 제한이 생길 수 있어요.',
      promo:
        '홍보·외부 유도 성격이 강해요. 한줄 장터·구인 말머리를 쓰거나 연락처·단톡 링크를 줄여 주세요.',
      banned: '현재 커뮤니티 이용이 제한된 계정이에요. 제한 해제 후 다시 시도해 주세요.',
      imagePolicy:
        '이미지 검사를 위해 운영 환경에 OPENAI_API_KEY 가 필요해요. 관리자에게 문의하거나 텍스트만 등록해 주세요.',
      scam: '사기·불법 금융으로 판단되어 계정이 제한되었어요. 이의가 있으면 제보 채널로 연락 주세요.',
      server: '검증 서버 오류예요. 잠시 후 다시 시도해 주세요.',
      auth: '로그인이 필요하거나 세션이 만료됐어요. 다시 로그인해 주세요.',
      generic: '등록할 수 없어요. 내용을 수정한 뒤 다시 시도해 주세요.',
    },
  },
  auth: {
    suspenseLoading: '잠시만요…',
    email: '이메일',
    password: '비밀번호',
    or: '또는',
    ellipsis: '…',
    loginTitle: '로그인',
    loginSubtitle: '게시판 글쓰기·댓글을 위해 계정으로 들어와 주세요.',
    honeypotLogin: '자동 로그인이 감지됐어요.',
    honeypotSignup: '자동 가입이 감지됐어요. 사람이면 다시 시도해 주세요.',
    turnstileIncomplete: '아래 보안 확인을 완료한 뒤 다시 시도해 주세요.',
    turnstileVerifyFailed:
      '보안 확인은 됐지만 서버 검증에 실패했어요. 새로고침 후 다시 시도해 주세요. 반복되면 Turnstile Secret Key와 Site Key가 같은 사이트에서 발급된 쌍인지 확인해 주세요.',
    submitLogin: '로그인',
    forgotPassword: '비밀번호를 잊었어요',
    noAccount: '계정이 없으신가요?',
    signupLink: '회원가입',
    signupTitle: '회원가입',
    signupSubtitle:
      '맛집·생활 정보를 나누는 커뮤니티예요. 계정은 본인 확인(이메일) 후 이용할 수 있어요.',
    nickLabel: '닉네임',
    nickPlaceholder: '프로필에 표시될 이름',
    signupSubmit: '가입하고 이메일 인증하기',
    signupSubmitLoading: '처리 중…',
    hasAccount: '이미 계정이 있으신가요?',
    loginLink: '로그인',
    checkEmailTitle: '이메일을 확인해 주세요',
    checkEmailSubtitleBefore: '가입을 마치려면 메일함의 ',
    checkEmailSubtitleStrong: '인증 링크',
    checkEmailSubtitleAfter: '를 눌러 주세요. 링크는 보통 몇 분 안에 도착합니다.',
    step1Label: '메일함 열기',
    step1HintSentPrefix: '다음 주소로 보냈어요: ',
    step1HintNoEmail: '가입할 때 입력하신 이메일의 받은편지함(스팸함 포함)을 확인해 주세요.',
    step2Label: '인증 링크 탭',
    step2Hint: '버튼 또는 링크를 누르면 로그인된 상태로 돌아옵니다.',
    step3Label: '시작하기',
    step3Hint: '인증 후 커뮤니티 글쓰기·댓글을 이용할 수 있어요.',
    mailHelpTitle: '메일이 안 오면',
    mailHelp1: '스팸·프로모션함을 확인해 보세요.',
    mailHelp2: '이메일 주소에 오타가 없었는지 확인해 보세요.',
    mailHelp3: '아래에서 인증 메일을 다시 보낼 수 있어요.',
    resendCooldown: '{n}초 후 다시 보내기',
    resendSending: '보내는 중…',
    resendButton: '인증 메일 다시 보내기',
    resendSuccess: '인증 메일을 다시 보냈어요. 잠시 뒤 메일함을 확인해 주세요.',
    footerVerifiedLogin: '이미 인증했어요 · 로그인',
    footerOtherEmail: '다른 이메일로 가입',
    forgotTitle: '비밀번호 재설정',
    forgotSubtitle:
      '가입 시 사용한 이메일을 입력하면, 안전하게 비밀번호를 바꿀 수 있는 링크를 보내 드려요.',
    forgotSendLink: '링크 보내기',
    forgotBackLogin: '로그인으로 돌아가기',
    forgotInfoSent: '재설정 링크를 보냈어요. 메일함과 스팸함을 확인해 주세요.',
    resetGateTitle: '비밀번호 바꾸기',
    resetGateBefore: '메일에 있던 링크로 들어와야 이 화면이 활성화돼요. 세션이 없다면 ',
    resetGateLink: '재설정 메일',
    resetGateAfter: '을 다시 요청해 주세요.',
    resetGateHint: '링크는 한 번만 유효할 수 있어요.',
    newPasswordTitle: '새 비밀번호',
    newPasswordSubtitle: '다른 서비스와 같은 비밀번호는 피해 주세요.',
    newPasswordLabel: '새 비밀번호',
    saveAndLogin: '저장하고 로그인하기',
    callbackConnecting: '계정을 연결하는 중이에요…',
    callbackDone: '인증이 완료됐어요. 잠시 후 이동합니다.',
    callbackSessionFail: '세션을 만들 수 없어요. 메일 링크가 만료됐거나 이미 사용됐을 수 있어요.',
    callbackTitleOk: '환영해요',
    callbackTitleWait: '인증 처리',
    callbackToLogin: '로그인으로',
    callbackToCheckEmail: '이메일 인증 안내',
    googleContinue: 'Google로 계속하기',
    devGoogleBadge: '[개발]',
    devGoogleTail: ' Google 로그인: Supabase Provider + ',
    turnstileLoading: '보안 확인 로딩 중…',
    passwordHint: '8자 이상, 글자·숫자를 함께 사용해 주세요.',
    passwordTooShort: '비밀번호는 {min}자 이상이어야 해요.',
    passwordTooLong: '비밀번호는 {max}자 이하여야 해요.',
    passwordNeedMix: '비밀번호에 글자와 숫자를 각각 한 글자 이상 넣어 주세요.',
    passwordBanned: '너무 흔한 비밀번호예요. 다른 조합을 써 주세요.',
  },
  minihome: {
    pageTitle: '내 미니홈',
    yourSpace: '개인 공간이 준비됐어요. 아래 기능은 1차 오픈 후 순차적으로 켜질 예정이에요.',
    slugLabel: '공개 주소',
    publicPage: '공개 미니홈 보기',
    guestbookLocked: '일촌평 — 준비 중 (DB만 연결됨, 작성·수정 불가)',
    albumLocked: '사진첩 — 준비 중 (앨범·업로드 UI와 스토리지는 다음 단계)',
    needsLogin: '미니홈은 로그인 후 이용할 수 있어요.',
    notProvisioned: '미니홈 행이 아직 없어요. SQL 마이그레이션 005를 적용했는지 확인해 주세요.',
    privateOrMissing: '비공개이거나 없는 미니홈이에요.',
  },
  weather: { city: '방콕', condition: '맑음' },
  seo: {
    defaultTitle: '태자 월드 (Thai Ja World)',
    titleTemplate: '%s | 태자 월드',
    defaultDescription:
      '태국 로컬 커뮤니티 — 익명 한줄장·구인·익명 제보·오늘의 이슈·미니홈 감성',
    homeTitle: '홈 — 태자 월드',
    homeDescription:
      '태국에 사는 사람들의 플랫폼 — 광장, 익명 한줄장, 익명 제보, 로컬 가게, 오늘의 소식',
  },
  push: {
    optInTitle: '🔔 하루 한 번 · 태국 핫이슈 한 줄',
    optInLead: '완전 선택이에요. 거부해도 가입·이용은 그대로예요.',
    optInHook:
      '최신 기사 한 건을 한국어·태국어로 짧게, 훅 있게만 보내 드려요. 스포일러급 한 줄로 “지금 태국 뭐가 뜨거워?”만 콕 집어요.',
    optInCookie:
      '브라우저 알림 권한과 동작에 필요한 최소 저장(쿠키)을 씁니다. 설정에서 언제든 끌 수 있어요.',
    enable: '알림 허용하고 받아보기',
    disable: '이 기기에서 알림 끄기',
    dismiss: '다음에',
    needLogin: '로그인(또는 이메일 인증 완료) 후에 켤 수 있어요.',
    notSupported:
      '이 브라우저는 웹 푸시를 지원하지 않아요. (iPhone은 홈 화면에 추가한 PWA에서 되는 경우가 많아요.)',
    working: '연결 중…',
    enabledOk: '알림 켜졌어요. 하루 한 번만 갈게요.',
    error: '잠시 후 다시 시도해 주세요.',
    permissionDenied: '알림이 꺼져 있어요. 브라우저 주소창 옆 자물쇠에서 알림을 허용해 주세요.',
  },
};

const th: Dictionary = {
  nav: {
    home: 'หน้าแรก',
    local: 'ร้านท้องถิ่น',
    community: 'ลานชุมชน',
    botConsole: 'ผู้ดูแล',
  },
  brandSuffix: 'เวิลด์',
  logoAria: 'Thai Ja World — หน้าแรก',
  lang: { ko: '한국어', th: 'ไทย' },
  footer:
    '© 2026 Thai Ja World · thaijaworld.com | ตลาดนิรนาม · หางาน · เทรนด์ · ร้าน · มินิโฮม — ฟีดภาษาเกาหลีที่ไทย',
  tierPremium: 'พรีเมียม',
  tierStandard: 'สแตนดาร์ด',
  home: {
    tag: 'Thai Ja World · DNA มินิโฮม เวอร์ชัน 2026 ♪',
    title: 'ฟีดภาษาเกาหลีที่ไทย — คุยวันนี้ที่นี่',
    leadBefore: 'เลิกเว็บข่าวทึบๆ มาเถอะ ',
    leadAccent: 'ตลาดบรรทัดเดียวแบบนิรนาม · หางาน · เทรนด์ · ร้าน · แจ้งเบาะแสนิรนาม',
    leadAfter: ' รวมหน้าเดียวเหมือนกรุ๊ปแชทหมู่บ้าน — ชีวิตที่ไทย ทั้งข่าวทั้งมีม อยู่ที่นี่',
    dreamIntro: 'Next drop · ',
    dreamMinihome: 'มินิโฮม',
    dreamMid: ' — BGM สกิน มินิมี ตกแต่ง ',
    dreamPersonal: 'ห้องฉัน',
    dreamOutro: ' เก็บสไตล์พอยต์ ฟีลยุคนั้นแต่ UI ปี 2026 — ตอนนี้เริ่มจากลานก่อน ค่อยๆ ไป',
    hubBoard: 'บอร์ดคุย',
    hubBoardSub: 'TMI · ข่าวคราว · วันนี้มีอะไรฮิต',
    hubLocal: 'ร้านท้องถิ่น',
    hubLocalSub: 'แนะนำร้าน · โปรโมท · LINE',
    hubNotice: 'ตลาดบรรทัดเดียว · ซื้อขาย·หางาน',
    hubNoticeSub: 'เห็นแค่ชื่อโปรไฟล์ · โพสต์บรรทัดเดียว/หางานได้เลย',
    hubTip: 'แจ้งเบาะแสนิรนาม',
    hubTipSoon: 'แค่เชื่อม Telegram/LINE — เปิดช่องทางเมื่อไหร่จะบอก',
    hotLabel: '🔥 เรื่องเด่นที่ไทยตอนนี้',
    hotNewsBadge: 'สรุป',
    hotNewsEmpty: 'ยังเงียบอยู่ — เดี๋ยวเติมประเด็นที่คนอยู่ไทยต้องรู้',
    hotNewsLoading: 'กำลังคัดประเด็นให้…',
    hotFootnote:
      'กดหัวข้อเพื่อไปบทความต้นทาง — คนละโซนกับบอร์ดลานชุมชนนะ',
    shopsTitle: '🏪 ร้านแนะนำ',
    shopsMore: 'ดูทั้งหมด →',
    shopsEmpty: 'ยังไม่มีร้านที่ลงทะเบียน',
    shopsEmptyLink: 'ไปหน้าร้านท้องถิ่น',
    shopsLoading: 'กำลังโหลดร้าน…',
    weatherTitle: 'สภาพอากาศ · จริง',
    weatherAttribution: 'Open-Meteo · รีเฟรชประมาณทุก 10 นาที',
    weatherBangkok: 'กรุงเทพฯ',
    weatherPattaya: 'พัทยา',
    weatherChiangMai: 'เชียงใหม่',
    weatherLoading: 'กำลังโหลดสภาพอากาศ…',
    weatherUnavailable: 'โหลดสภาพอากาศไม่ได้',
    fxTitle: 'รีโมทเรท',
    fxMock: 'Frankfurter(ECB) · กดรีเฟรช',
    fxRemote: {
      subtitle: 'กดแล้วคำนวณทันที — รีโมทส่วนตัวบนหน้าแรก',
      baseHint: 'สกุลตั้งต้น',
      amountLabel: 'จำนวนเงิน',
      refresh: 'รีเฟรชเรท',
      liveLine: 'อิง Frankfurter(ECB) · ',
      mockLine: 'เน็ตขัดข้อง — ใช้เรทตัวอย่าง · ',
      updated: 'วันที่',
      fallback: 'ตัวอย่าง',
      thaiUi: 'ไทย UI',
      koUi: 'ภาษาเกาหลี UI',
      minihome: 'แพลนมินิโฮม',
      slotEmpty: 'ช่องว่าง',
      slotSoon: 'ปุ่มเพิ่ม (ลัด ฯลฯ)',
      styleHint: '💡 ภายหลังใช้สไตล์พอยต์เปลี่ยนสกินรีโมท/ปุ่มได้ (ฟีลมินิโฮม)',
      thb: 'THB',
      krw: 'KRW',
      usd: 'USD',
      floatingHint:
        '💱 ทุกหน้า — มุมขวาบน (ค่าเริ่มต้น) แตะเปิดเครื่องคิดเรท ลากไปมุมอื่นได้',
      dragHandle: 'ลากย้าย',
      keypadShow: 'ปุ่มตัวเลข',
      keypadHide: 'ซ่อนปุ่ม',
      minimize: 'ย่อ',
      expandFab: 'เปิดรีโมทเรท',
      menuAria: 'เมนู',
      stylePreviewLine: '{own} − {cost} → {after}',
      styleOwnLine: 'มี {own}★',
    },
    tipDigestTitle: 'แจ้งเบาะแสนิรนาม · ติดต่อ',
    tipTelegram: 'แจ้งผ่าน Telegram (นิรนาม)',
    tipWhatsapp: 'แจ้งผ่าน WhatsApp (นิรนาม)',
    tipLine: 'แจ้งผ่าน LINE (นิรนาม)',
    tipEnvHint: 'ใส่ URL ใน .env แล้วลิงก์จะโผล่ที่นี่',
    newsTitle: 'สรุปชีวิตที่ไทยวันนี้',
    newsSub:
      'หัวข้อ + สรุป 2–3 บรรทัด แบบข่าวสั้น — กดหัวข้อเพื่อไปต้นฉบับ (สลับไทยที่เมนูด้านบน)',
    newsLoading: 'กำลังโหลด…',
    newsCountLine: 'ทั้งหมด {n} รายการ — แสดง 5 รายการที่นี่',
    newsEmpty: 'ยังไม่มีเนื้อหาในช่องนี้ — แวะใหม่เร็วๆ นี้นะ',
    newsEmptyLink: 'ไปดูลานชุมชน →',
    newsDetailBack: '← กลับหน้าแรก',
    newsDetailWitLabel: 'ทีเด็ด Thai Ja',
    newsDetailSummaryLabel: 'สรุป',
    newsDetailExternalCta: 'เปิดบทความต้นทาง',
    newsDetailExternalHint: 'จะไปเว็บสื่อต้นทาง',
    newsDetailMissing: 'ไม่มีเนื้อหานี้หรือหมดอายุแล้ว — กลับหน้าแรกนะ',
  },
  board: {
    pageTitle: 'บอร์ดลานชุมชน',
    newPost: 'เขียนโพสต์',
    login: 'เข้าสู่ระบบ',
    signup: 'สมัครสมาชิก',
    logout: 'ออกจากระบบ',
    empty: 'โพสต์แรกรอคุณอยู่! แชร์ร้านอร่อยหรือข้อมูลได้เลย',
    category: 'หมวด',
    title: 'หัวข้อ',
    body: 'เนื้อหา',
    imagesHint: 'รูปภาพ (สูงสุด 3 รูป, JPG/PNG/WebP)',
    submit: 'โพสต์',
    uploading: 'กำลังอัปโหลด…',
    needLogin: 'ต้องเข้าสู่ระบบก่อนเพื่อโพสต์',
    backToList: 'กลับรายการ',
    author: 'ผู้เขียน',
    comments: 'ความคิดเห็น',
    commentBody: 'แสดงความคิดเห็น',
    sendComment: 'ส่ง',
    loginForComment: 'เข้าสู่ระบบเพื่อคอมเมนต์',
    views: 'ดู',
    gatedBanner:
      'โซนนี้ยังไม่เปิดโพสต์ใหม่ — ดูรายการ/โพสต์เดิมได้เท่านั้น จะเปิดให้โพสต์พร้อมเปิดตัวจริง',
    newPostDisabled: 'โพสต์เร็วๆ นี้',
    tradeHubTitle: 'ตลาดบรรทัดเดียว · ซื้อขาย·หางาน',
    tradeHubIntro:
      'เห็นแค่ชื่อโปรไฟล์ — โพสต์จากรายการหรือปุ่มเขียนได้เลย',
    tradeFleaCta: 'ดูตลาดบรรทัดเดียว',
    tradeJobCta: 'ดูหางาน',
    tradeAllBoards: 'ไปบอร์ดทั้งหมด',
    emptyGated: 'ยังไม่มีโพสต์ในหมวดนี้ — โพสต์จะเปิดเมื่อเปิดตัวจริง',
    mod: {
      nsfw: 'ข้อความ/รูปไม่ผ่านการตรวจ — ลองแก้แล้วโพสต์ใหม่ (ทำซ้ำอาจถูกจำกัดบัญชี)',
      promo: 'คล้ายโฆษณา/ชวนออกนอกเว็บ — ใช้หมวดตลาดบรรทัดเดียว/หางาน หรือลดลิงก์·ช่องทางติดต่อ',
      banned: 'บัญชีนี้ถูกจำกัดการใช้บอร์ดชั่วคราว',
      imagePolicy: 'ตรวจรูปต้องใช้ OPENAI_API_KEY บนเซิร์ฟเวอร์ — ลองโพสต์แบบข้อความอย่างเดียวหรือติดต่อแอดมิน',
      scam: 'ตรวจพบคำที่เกี่ยวกับการหลอกลวง/การเงินผิดกฎ — บัญชีถูกจำกัด',
      server: 'เซิร์ฟเวอร์ตรวจสอบขัดข้อง — ลองใหม่ภายหลัง',
      auth: 'ต้องเข้าสู่ระบบใหม่ (เซสชันหมดอายุ)',
      generic: 'โพสต์ไม่ได้ — แก้เนื้อหาแล้วลองอีกครั้ง',
    },
  },
  auth: {
    suspenseLoading: 'รอสักครู่…',
    email: 'อีเมล',
    password: 'รหัสผ่าน',
    or: 'หรือ',
    ellipsis: '…',
    loginTitle: 'เข้าสู่ระบบ',
    loginSubtitle: 'เข้าเพื่อโพสต์และคอมเมนต์ในบอร์ด',
    honeypotLogin: 'ตรวจพบการเข้าสู่ระบบอัตโนมัติ',
    honeypotSignup: 'ตรวจพบการสมัครอัตโนมัติ — ถ้าเป็นคนจริงลองใหม่',
    turnstileIncomplete: 'ทำการยืนยันความปลอดภัยด้านล่างให้ครบ แล้วลองอีกครั้ง',
    turnstileVerifyFailed:
      'ยืนยันด้านลูกค้าแล้ว แต่เซิร์ฟเวอร์ตรวจไม่ผ่าน — รีเฟรชแล้วลองใหม่ ถ้ายังไม่ได้ ให้เช็กว่า Secret Key กับ Site Key เป็นคู่จากไซต์เดียวกัน',
    submitLogin: 'เข้าสู่ระบบ',
    forgotPassword: 'ลืมรหัสผ่าน',
    noAccount: 'ยังไม่มีบัญชี?',
    signupLink: 'สมัครสมาชิก',
    signupTitle: 'สมัครสมาชิก',
    signupSubtitle:
      'ชุมชนแชร์ร้านและไลฟ์สไตล์ — ยืนยันอีเมลแล้วค่อยใช้งานเต็มรูปแบบ',
    nickLabel: 'ชื่อที่โชว์',
    nickPlaceholder: 'ชื่อบนโปรไฟล์',
    signupSubmit: 'สมัครและยืนยันอีเมล',
    signupSubmitLoading: 'กำลังดำเนินการ…',
    hasAccount: 'มีบัญชีแล้ว?',
    loginLink: 'เข้าสู่ระบบ',
    checkEmailTitle: 'เช็กอีเมลของคุณ',
    checkEmailSubtitleBefore: 'จะสมัครให้เสร็จ กด ',
    checkEmailSubtitleStrong: 'ลิงก์ยืนยัน',
    checkEmailSubtitleAfter: ' ในกล่องจดหมาย — มักถึงภายในไม่กี่นาที',
    step1Label: 'เปิดกล่องจดหมาย',
    step1HintSentPrefix: 'ส่งไปที่ ',
    step1HintNoEmail: 'เช็กอีเมลที่ใช้สมัคร (รวมโฟลเดอร์สแปม)',
    step2Label: 'แตะลิงก์ยืนยัน',
    step2Hint: 'กดปุ่มหรือลิงก์แล้วจะกลับมาในสถานะล็อกอิน',
    step3Label: 'เริ่มใช้งาน',
    step3Hint: 'หลังยืนยันแล้วโพสต์และคอมเมนต์ได้',
    mailHelpTitle: 'ถ้ายังไม่ได้รับเมล',
    mailHelp1: 'ดูโฟลเดอร์สแปม/โปรโมชัน',
    mailHelp2: 'ตรวจสะกดอีเมลอีกครั้ง',
    mailHelp3: 'กดส่งอีเมลยืนยันอีกครั้งด้านล่าง',
    resendCooldown: 'ส่งอีกครั้งใน {n} วินาที',
    resendSending: 'กำลังส่ง…',
    resendButton: 'ส่งอีเมลยืนยันอีกครั้ง',
    resendSuccess: 'ส่งอีเมลยืนยันอีกครั้งแล้ว — เช็กกล่องจดหมาย',
    footerVerifiedLogin: 'ยืนยันแล้ว · เข้าสู่ระบบ',
    footerOtherEmail: 'สมัครด้วยอีเมลอื่น',
    forgotTitle: 'รีเซ็ตรหัสผ่าน',
    forgotSubtitle:
      'ใส่อีเมลที่สมัคร เราจะส่งลิงก์ปลอดภัยเพื่อตั้งรหัสใหม่',
    forgotSendLink: 'ส่งลิงก์',
    forgotBackLogin: 'กลับไปเข้าสู่ระบบ',
    forgotInfoSent: 'ส่งลิงก์แล้ว — เช็กอีเมลและสแปม',
    resetGateTitle: 'เปลี่ยนรหัสผ่าน',
    resetGateBefore: 'ต้องเข้าผ่านลิงก์ในเมล — ถ้าไม่มีเซสชัน ขอ ',
    resetGateLink: 'เมลรีเซ็ต',
    resetGateAfter: ' อีกครั้ง',
    resetGateHint: 'ลิงก์อาจใช้ได้ครั้งเดียว',
    newPasswordTitle: 'รหัสผ่านใหม่',
    newPasswordSubtitle: 'อย่าใช้รหัสเดียวกับเว็บอื่น',
    newPasswordLabel: 'รหัสผ่านใหม่',
    saveAndLogin: 'บันทึกแล้วเข้าสู่ระบบ',
    callbackConnecting: 'กำลังเชื่อมบัญชี…',
    callbackDone: 'ยืนยันแล้ว — กำลังพาไปต่อ',
    callbackSessionFail: 'สร้างเซสชันไม่ได้ — ลิงก์อาจหมดอายุหรือใช้ไปแล้ว',
    callbackTitleOk: 'ยินดีต้อนรับ',
    callbackTitleWait: 'กำลังยืนยัน',
    callbackToLogin: 'ไปเข้าสู่ระบบ',
    callbackToCheckEmail: 'คำแนะนำยืนยันอีเมล',
    googleContinue: 'ดำเนินการต่อด้วย Google',
    devGoogleBadge: '[dev]',
    devGoogleTail: ' Google login: Supabase Provider + ',
    turnstileLoading: 'กำลังโหลดการยืนยันความปลอดภัย…',
    passwordHint: 'อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข',
    passwordTooShort: 'รหัสผ่านต้องมีอย่างน้อย {min} ตัว',
    passwordTooLong: 'รหัสผ่านต้องไม่เกิน {max} ตัว',
    passwordNeedMix: 'ใส่ทั้งตัวอักษรและตัวเลขอย่างน้อยอย่างละหนึ่งตัว',
    passwordBanned: 'รหัสนี้ค่อนข้างธรรมดา — ลองชุดอื่น',
  },
  minihome: {
    pageTitle: 'มินิโฮมของฉัน',
    yourSpace: 'พื้นที่ส่วนตัวพร้อมแล้ว — ฟีเจอร์ด้านล่างจะเปิดทีละส่วนหลังรุ่นแรก',
    slugLabel: 'ลิงก์สาธารณะ',
    publicPage: 'ดูมินิโฮมแบบสาธารณะ',
    guestbookLocked: 'ทักทาย/ข้อความ — กำลังเตรียม (มีตารางแล้ว ยังโพสต์ไม่ได้)',
    albumLocked: 'อัลบั้มรูป — กำลังเตรียม (อัปโหลดและ UI รอลำดับถัดไป)',
    needsLogin: 'ต้องเข้าสู่ระบบก่อนใช้มินิโฮม',
    notProvisioned: 'ยังไม่มีแถวมินิโฮม — ตรวจว่ารัน migration 005 แล้วหรือยัง',
    privateOrMissing: 'มินิโฮมส่วนตัวหรือไม่มีลิงก์นี้',
  },
  weather: { city: 'กรุงเทพฯ', condition: 'แจ่มใส' },
  seo: {
    defaultTitle: 'Thai Ja World (태자 월드)',
    titleTemplate: '%s | Thai Ja World',
    defaultDescription:
      'ชุมชนคนเกาหลีในไทย — ตลาดบรรทัดเดียวแบบนิรนาม · หางาน · แจ้งเบาะแส · เทรนด์วันนี้ · มินิโฮม',
    homeTitle: 'หน้าแรก — Thai Ja World',
    homeDescription:
      'แพลตฟอร์มคนอยู่ไทย — ลานชุมชน ตลาดนิรนาม แจ้งเบาะแส ร้านท้องถิ่น ข่าววันนี้',
  },
  push: {
    optInTitle: '🔔 วันละครั้ง · ประเด็นร้อนไทย หนึ่งบรรทัด',
    optInLead: 'เลือกได้เต็มที่ — ปฏิเสธก็สมัคร/ใช้งานได้เหมือนเดิม',
    optInHook:
      'ส่งข่าวล่าสุด 1 เรื่อง สั้นๆ ทั้งไทยและเกาหลี เน้นฮุคให้หยุดอ่าน — “ตอนนี้ไทยร้อนเรื่องอะไร” แค่บรรทัดเดียว',
    optInCookie:
      'ใช้สิทธิ์แจ้งเตือนของเบราว์เซอร์และคุกกี้ที่จำเป็นเท่านั้น — ปิดได้ตลอดในการตั้งค่า',
    enable: 'อนุญาตแจ้งเตือนและรับข่าว',
    disable: 'ปิดแจ้งเตือนบนเครื่องนี้',
    dismiss: 'ทีหลัง',
    needLogin: 'ต้องเข้าสู่ระบบ (หรือยืนยันอีเมลแล้ว) ก่อนเปิด',
    notSupported:
      'เบราว์เซอร์นี้ไม่รองรับเว็บพุช (iPhone มักใช้ได้เมื่อเพิ่มไปหน้าโฮมเป็น PWA)',
    working: 'กำลังเชื่อม…',
    enabledOk: 'เปิดแจ้งเตือนแล้ว — ส่งวันละครั้ง',
    error: 'ลองใหม่ในอีกสักครู่',
    permissionDenied: 'การแจ้งเตือนถูกบล็อก — เปิดจากไอคอนแม่กุญแจข้างแถบที่อยู่',
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return locale === 'th' ? th : ko;
}
