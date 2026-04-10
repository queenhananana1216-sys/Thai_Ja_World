/**
 * UI 문자열 — 1차: 네비·푸터·홈 고정 카피 (본문·게시글 번역은 다음 단계)
 */
import type { Locale } from './types';

export type Dictionary = {
  nav: {
    home: string;
    /** 공개 꿀팁 허브 (/tips) */
    tips: string;
    local: string;
    community: string;
    /** 일촌 받은함 */
    ilchon: string;
    /** 주 메뉴 줄 미니홈 (비로그인 시에도 노출 → /minihome 에서 로그인 유도) */
    minihome: string;
    botConsole: string;
    /** 로그인 시 헤더 빠른 링크 */
    memberMinihome: string;
    /** 받은 일촌 신청(메시지) */
    memberNotesInbox: string;
    /** 맺은 일촌 목록 */
    memberFriends: string;
    memberQuickNavAria: string;
    /** 글로벌 헤더 하단 주요 링크 줄 */
    mainNavAria: string;
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
    /** 히어로 키워드 줄 (제보함·맛집 등) */
    heroKicker: string;
    /** 히어로 메인 한 줄 */
    heroLead: string;
    /** 히어로 서브 설명 — 줄바꿈은 \\n */
    heroSub: string;
    /** 홈 최상단 포털형 검색 띠 제목 */
    portalMastTitle: string;
    portalMastSub: string;
    portalMastQuickAria: string;
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
    hubMinihome: string;
    hubMinihomeSub: string;
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
    tipFacebook: string;
    tipTiktok: string;
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
    /** 요약 아래 편집실 한마디 블록 */
    newsDetailEditorLabel: string;
    newsDetailExternalCta: string;
    newsDetailExternalHint: string;
    newsDetailMissing: string;
    /** 비회원 홈: 읽기 vs 참여 구분 (한·태 동일 구조) */
    guestHomePublicLabel: string;
    guestHomePublicBody: string;
    guestHomeMemberLabel: string;
    guestHomeMemberBody: string;
    guestHomeLoginCta: string;
    /** 기사 하단 — 비회원에게만 (댓글·참여 불가 안내) */
    newsDetailGuestNote: string;
    /** 비회원 — 본문(요약·편집 노트·원문) 잠금 안내 */
    newsDetailLockedLead: string;
  };
  /** 비회원 공개 꿀팁 허브 — 본문·출처는 로그인 후 광장 */
  tips: {
    pageTitle: string;
    pageLead: string;
    openCard: string;
    detailLockedLead: string;
    loginForFull: string;
    signupForFull: string;
    goLogin: string;
    goSignup: string;
    empty: string;
    backToList: string;
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
    /** 작성자 전용 글 관리 */
    postOwnerMenu: string;
    postDelete: string;
    postMakePrivate: string;
    postMakePublic: string;
    postDeleteConfirm: string;
    postBusy: string;
    postActionError: string;
    postEdit: string;
    postEditTitle: string;
    editSave: string;
    editCancel: string;
    postOwnerPasswordOptional: string;
    postOwnerPasswordRepeat: string;
    postOwnerPasswordMismatch: string;
    postOwnerPasswordPrompt: string;
    postOwnerPasswordPlaceholder: string;
    postOwnerPasswordSubmit: string;
    postOwnerPasswordCancel: string;
    postOwnerPasswordRequired: string;
    postOwnerPasswordWrong: string;
    /** 목록에서 비공개 글 배지 */
    postPrivateBadge: string;
    /** 중고·알바 허브 상단 안내 */
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
    /** 비밀번호 표시 토글(마스킹 상태에서는 브라우저가 복사를 막는 경우가 많음) */
    passwordShow: string;
    passwordHide: string;
    passwordHint: string;
    passwordTooShort: string;
    passwordTooLong: string;
    passwordNeedMix: string;
    passwordBanned: string;
    /** Supabase Phone OTP (/auth/phone) */
    phoneAuthTitle: string;
    phoneAuthSubtitle: string;
    phoneAuthPhoneLabel: string;
    phoneAuthPhonePlaceholder: string;
    phoneAuthPhoneHint: string;
    phoneAuthNickOptional: string;
    phoneAuthSendSms: string;
    phoneAuthSendSmsLoading: string;
    phoneAuthOtpLabel: string;
    phoneAuthOtpHint: string;
    phoneAuthOtpSentPrefix: string;
    phoneAuthOtpSentSuffix: string;
    phoneAuthVerify: string;
    phoneAuthVerifyLoading: string;
    phoneAuthResendSms: string;
    phoneAuthChangeNumber: string;
    phoneAuthInvalidPhone: string;
    phoneAuthNoSupabase: string;
    phoneAuthFooterEmailSignup: string;
    signupPhoneLink: string;
    loginPhoneLink: string;
  };
  minihome: {
    pageTitle: string;
    yourSpace: string;
    slugLabel: string;
    publicPage: string;
    previewOverlay: string;
    openFullPage: string;
    closeOverlay: string;
    overlayLoading: string;
    overlayLoadError: string;
    editSectionTitle: string;
    editHint: string;
    fieldTitle: string;
    fieldTagline: string;
    fieldIntro: string;
    fieldIntroHint: string;
    fieldAccent: string;
    fieldWallpaper: string;
    fieldWallpaperHint: string;
    fieldPublic: string;
    save: string;
    saving: string;
    saved: string;
    saveError: string;
    sectionIntro: string;
    sectionGuestbook: string;
    sectionPhotos: string;
    layoutHint: string;
    guestbookLocked: string;
    /** 사진첩 — 방문자(비주인) 안내 */
    cyPhotosVisitorHint: string;
    needsLogin: string;
    notProvisioned: string;
    privateOrMissing: string;
    /** 싸이 스타일 좌측 메뉴·플로팅 창 */
    cyMenuMain: string;
    cyMenuGuestbook: string;
    cyMenuVisitor: string;
    cyMenuPhotos: string;
    cyWindowClose: string;
    cyGuestbookTitle: string;
    cyVisitorTitle: string;
    cyPhotosTitle: string;
    cyGuestbookEmpty: string;
    cyVisitorEmpty: string;
    cyGuestbookWriteSoon: string;
    cyVisitorWriteSoon: string;
    /** 일촌평 창 안내 (일촌만 작성) */
    cyIlchonWriteHint: string;
    /** 방명록 창 안내 (로그인 이용자) */
    cyOpenWriteHint: string;
    cyPostSubmit: string;
    cyPostSubmitting: string;
    cyModerationHide: string;
    cyModerationUnhide: string;
    cyModerationDelete: string;
    cyHiddenBadge: string;
    cyPhotosEmpty: string;
    cyPhotosDefaultAlbum: string;
    cyPhotosUpload: string;
    cyPhotosUploading: string;
    cyPhotosDelete: string;
    /** 방명록 글 최소 길이 */
    cyBodyMinLength: string;
    /** 방명록·일촌평 삭제 확인 */
    cyDeleteEntryConfirm: string;
    cyDeletePhotoConfirm: string;
    cyPhotosAlbumCreateError: string;
    cyPhotosTypeError: string;
    cyPhotosSizeError: string;
    /** 주인 전용 — 방명록 창 하단 안내 */
    cyOwnerVisitorHint: string;
    /** 내 미니홈 설정 상단 — 싸이 방 입장 */
    roomEnterTitle: string;
    roomEnterLead: string;
    roomEnterCta: string;
    cyIntroEmpty: string;
    /** 내 미니홈 설정 화면 안내 */
    previewPanelsHint: string;
    /** 스타일 점수·가입 인사·상점 */
    styleScoreLabel: string;
    styleShopNav: string;
    greetCardTitle: string;
    greetCardLead: string;
    greetPlaceholder: string;
    greetSubmit: string;
    greetSubmitting: string;
    greetDone: string;
    greetThanks: string;
    styleShopTitle: string;
    styleShopLead: string;
    styleShopBalance: string;
    styleShopCatSkin: string;
    styleShopCatMinimi: string;
    styleShopCatBgm: string;
    styleShopCatWallpaper: string;
    styleShopCatFrame: string;
    styleShopBuy: string;
    styleShopBuyRental: string;
    styleShopBuyPerm: string;
    styleShopEquip: string;
    styleShopOwned: string;
    styleShopNeedPoints: string;
    styleShopPurchased: string;
    styleShopEquipped: string;
    styleShopLoadError: string;
    styleShopEmpty: string;
    styleShopDaysLeft: string;
    styleShopRentalTag: string;
    styleShopPermTag: string;
    styleShopCheckin: string;
    styleShopCheckedIn: string;
    dotoriLabel: string;
    styleRpcNotAuth: string;
    styleRpcGreetingDone: string;
    styleRpcGreetingShort: string;
    styleRpcGreetingLong: string;
    styleRpcNoItem: string;
    styleRpcOwned: string;
    styleRpcPoor: string;
    styleRpcNotOwned: string;
    styleRpcGeneric: string;
    /** 섹션 잠금 안내 */
    sectionLockedIlchon: string;
    sectionLockedPrivate: string;
    /** 다이어리 */
    cyMenuDiary: string;
    cyDiaryTitle: string;
    cyDiaryEmpty: string;
    cyDiaryWrite: string;
    cyDiaryWriting: string;
    cyDiarySave: string;
    cyDiarySaved: string;
    cyDiaryDelete: string;
    cyDiaryDeleteConfirm: string;
    cyDiarySecret: string;
    cyDiaryMoodHappy: string;
    cyDiaryMoodSad: string;
    cyDiaryMoodAngry: string;
    cyDiaryMoodLove: string;
    cyDiaryMoodTired: string;
    cyDiaryMoodNeutral: string;
    /** 로딩 자리 표시(한·태 동일 문자 권장) */
    loadingMark: string;
    /** 숫자 없음·대기(한·태 동일 문자 권장) */
    emDash: string;
  };
  /** 싸이 스타일 일촌 신청·수락·목록 */
  ilchon: {
    pageTitle: string;
    pageLead: string;
    needLogin: string;
    goLogin: string;
    requestButton: string;
    requestTitle: string;
    messageLabel: string;
    messagePlaceholder: string;
    proposedNickLabel: string;
    proposedNickHint: string;
    sendRequest: string;
    sending: string;
    close: string;
    alreadyIlchon: string;
    pendingOutbound: string;
    pendingInbound: string;
    openInbox: string;
    accept: string;
    reject: string;
    cancelRequest: string;
    acceptTitle: string;
    nickYouCallThem: string;
    nickTheyCallYou: string;
    nickYouCallThemHint: string;
    nickTheyCallYouHint: string;
    confirmAccept: string;
    incomingTitle: string;
    outgoingTitle: string;
    friendsTitle: string;
    incomingEmpty: string;
    outgoingEmpty: string;
    friendsEmpty: string;
    youCallThemLabel: string;
    proposedFromThem: string;
    errorGeneric: string;
    errorPendingExists: string;
    errorAlreadyIlchon: string;
    errorNotAuth: string;
    errorSelf: string;
  };
  /** 로컬 가게 미니홈(/shop) 방명록·일촌평 */
  localShop: {
    sectionIlchon: string;
    sectionOpen: string;
    emptyIlchon: string;
    emptyOpen: string;
    hintIlchon: string;
    hintOpen: string;
    placeholderIlchon: string;
    placeholderOpen: string;
    submit: string;
    submitting: string;
    loginToPost: string;
    ownerPaused: string;
    ownerModerateHint: string;
    ilchonOnlyHint: string;
    noOwnerForIlchon: string;
    hiddenBadge: string;
    hide: string;
    unhide: string;
    delete: string;
    confirmDelete: string;
    bodyTooShort: string;
    loading: string;
    ownerSettingsLead: string;
    guestbookReceive: string;
    guestbookShowSection: string;
  };
  /** 글로벌·히어로 경로 검색 */
  search: {
    ariaLabel: string;
    /** 헤더 검색 옆 짧은 눈에 띄는 라벨 */
    headerBarLabel: string;
    heroTitle: string;
    /** 홈 포털형 검색 부제 */
    portalLead: string;
    placeholder: string;
    hint: string;
    noResults: string;
    quickHeading: string;
    sectionPages: string;
    sectionNews: string;
    badgeMember: string;
    badgePublic: string;
    searching: string;
  };
  weather: { city: string; condition: string };
  /** 기본·홈 메타 (locale별) */
  seo: {
    defaultTitle: string;
    titleTemplate: string;
    defaultDescription: string;
    homeTitle: string;
    homeDescription: string;
    /** /community/boards 리스트 — 메타·OG */
    boardsListDescription: string;
    /** /community/trade — 메타·OG */
    tradeHubDescription: string;
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
    tips: '꿀팁',
    local: '로컬',
    community: '광장',
    ilchon: '일촌',
    minihome: '미니홈',
    botConsole: '관리자',
    memberMinihome: '내 미니홈',
    memberNotesInbox: '받은 신청·쪽지',
    memberFriends: '내 일촌',
    memberQuickNavAria: '회원 빠른 메뉴',
    mainNavAria: '주요 메뉴',
  },
  brandSuffix: '월드',
  logoAria: '태국에 살자 월드 홈',
  lang: { ko: '한국어', th: 'ไทย' },
  footer:
    '© 2026 Thai Ja World · thaijaworld.com | 태국 살이 정보 나눔 — 경험·피하기·정리, 제보·중고·알바·맛집·미니홈',
  tierPremium: '프리미엄',
  tierStandard: '스탠다드',
  home: {
    tag: 'THAI JA WORLD · 살이 막힐 때 정리',
    title: '태국 살이, 서로 도와서 넘기는 곳',
    heroKicker: '경험담 · 제보 · 일자리 · 동네',
    heroLead: '막히면 여기서부터',
    heroSub:
      '집·비자·병원비처럼 막히는 일, 겪은 걸 나누면 다음 사람한테 닿아요.\n홍보보다 팁·주의·정리를 먼저 — 가볍게 올려도 돼요.\n필요할 때만 들러도 괜찮아요.',
    portalMastTitle: '태자 월드 통합 검색',
    portalMastSub: '메뉴·뉴스·경로를 한 번에 — 로컬 포털처럼 쓰는 홈',
    portalMastQuickAria: '자주 찾는 메뉴',
    dreamIntro: '지금 쓸 수 있어요 · ',
    dreamMinihome: '미니홈으로 ',
    dreamMid: '내 방, 내 규칙. ',
    dreamPersonal: '배경부터 한 줄 소개까지 꾸미고, ',
    dreamOutro: '공개와 비공개는 손끝에서 정해요.',
    hubBoard: '광장 수다',
    hubBoardSub: '잡담 · 생활 정보 · 오늘은 뭐가 올라왔나',
    hubLocal: '로컬 가게',
    hubLocalSub: '동네 후기 · 찾는 법 · 연락 한곳에',
    hubNotice: '중고·알바',
    hubNoticeSub: '닉네임만 보여요 · 짧게 써도 되고 · 바로 작성',
    hubTip: '제보함',
    hubTipSoon: '채널만 연결되면 여기서 바로 열려요 · 지금은 연결 준비 중이에요',
    hubMinihome: '미니홈',
    hubMinihomeSub: '배경·소개 글 · 공개 설정',
    hotLabel: '🔥 오늘 태국 살이에 닿는 참고 한 줄',
    hotNewsBadge: '브리핑',
    hotNewsEmpty: '아직 조용해요. 곧 태국 살이에 닿는 이야기로 채울게요.',
    hotNewsLoading: '쓸 만한 소식만 고르는 중…',
    hotFootnote:
      '제목을 누르면 원문 기사로 이동해요. 회색 한 줄은 요약입니다. 광장 게시판과는 다른 코너예요.',
    shopsTitle: '🏪 동네 가게',
    shopsMore: '더 보기 →',
    shopsEmpty: '아직 소개된 가게가 없어요. 곧 채워 넣을게요.',
    shopsEmptyLink: '로컬 페이지로 이동',
    shopsLoading: '가게 목록 불러오는 중…',
    weatherTitle: '날씨 · 실측',
    weatherAttribution: 'Open-Meteo 실측 · 약 10분 단위 갱신',
    weatherBangkok: '방콕',
    weatherPattaya: '파타야',
    weatherChiangMai: '치앙마이',
    weatherLoading: '날씨 불러오는 중…',
    weatherUnavailable: '날씨를 불러오지 못했어요. 잠시 후에 다시 확인해 주세요.',
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
      styleHint:
        '💡 나중에는 모은 포인트로 리모컨과 버튼 꾸미기를 켤 예정이에요. 예전 미니홈 감성, 그대로.',
      thb: 'THB',
      krw: 'KRW',
      usd: 'USD',
      floatingHint:
        '💱 모든 페이지 오른쪽 위(처음 위치)에서 열려요. 탭하면 작은 환율 창이 뜨고, 잡고 끌면 원하는 곳에 붙여 둘 수 있어요.',
      dragHandle: '잡고 이동',
      keypadShow: '키패드',
      keypadHide: '키패드 접기',
      minimize: '접기',
      expandFab: '환율 리모컨 열기',
      menuAria: '메뉴',
      stylePreviewLine: '{own} − {cost} → {after}',
      styleOwnLine: '보유 {own}★',
    },
    tipDigestTitle: '제보함 · 연결',
    tipTelegram: 'Telegram 제보함',
    tipWhatsapp: 'WhatsApp 제보함',
    tipLine: 'LINE 제보함',
    tipFacebook: 'Facebook 제보함',
    tipTiktok: 'TikTok (홍보·소식)',
    tipEnvHint: '운영 쪽에서 링크를 넣어 두면 이 카드에서 바로 열려요.',
    newsTitle: '태국 살이 참고 스냅샷',
    newsSub:
      '밖에서 나온 기사를 짧게만 정리해 둔 코너예요. 한 줄 훅은 누구나 볼 수 있고, 정리·원문 링크·댓글은 로그인 후에 열려요.',
    newsLoading: '스냅샷 불러오는 중…',
    newsCountLine: '총 {n}건 · 여기선 5건만 미리 보기',
    newsEmpty: '아직 이야기가 없어요. 잠시 후에 다시 들러 주세요.',
    newsEmptyLink: '광장 보러 가기 →',
    newsDetailBack: '← 홈으로',
    newsDetailWitLabel: '태자 한 줄',
    newsDetailSummaryLabel: '정리',
    newsDetailEditorLabel: '편집실 한마디',
    newsDetailExternalCta: '원문 기사 열기',
    newsDetailExternalHint: '출처 언론·매체 사이트로 이동해요.',
    newsDetailMissing: '찾으시는 소식이 없거나 기간이 지났어요. 홈으로 돌아가 주세요.',
    guestHomePublicLabel: '검색·안내 (비회원 OK)',
    guestHomePublicBody:
      '홈에서 메뉴·뉴스 제목 검색, 한 줄 스냅샷 미리보기는 가능해요. 기사 전체 요약·편집 노트·원문 링크·댓글은 로그인 후예요.',
    guestHomeMemberLabel: '참여·이용 (회원)',
    guestHomeMemberBody:
      '날씨·로컬 가게·광장·중고·알바·미니홈, 기사 댓글 등 — 로그인(또는 가입) 후에만 가능해요.',
    guestHomeLoginCta: '로그인 또는 가입하고 전체 열기',
    newsDetailGuestNote:
      '요약·편집 노트·원문 링크·댓글은 로그인(또는 가입) 후에 이용할 수 있어요. 광장·거래·미니홈 등도 회원 전용이에요.',
    newsDetailLockedLead:
      '아래부터는 회원에게만 보이는 정리·출처·댓글입니다. 로그인하면 이어서 읽고 참여할 수 있어요.',
  },
  tips: {
    pageTitle: '태국 생활 꿀팁',
    pageLead:
      '짧은 훅만 미리 보여 드려요. 체크리스트·주의사항·출처 링크는 로그인(또는 가입) 후 광장에서 전체로 열립니다.',
    openCard: '자세히',
    detailLockedLead:
      '요약·체크리스트·원문 출처는 회원에게만 공개돼요. 가입하면 광장 정보 게시판에서 같은 글을 끝까지 볼 수 있어요.',
    loginForFull: '로그인하고 전체·출처 보기',
    signupForFull: '가입하고 전체·출처 보기',
    goLogin: '로그인',
    goSignup: '회원가입',
    empty: '아직 올라온 꿀팁이 없어요. 곧 채워질 거예요.',
    backToList: '꿀팁 목록',
  },
  board: {
    pageTitle: '광장 게시판',
    newPost: '글 올리기',
    login: '로그인',
    signup: '회원가입',
    logout: '로그아웃',
    empty: '첫 글은 경험이나 피한 방법부터! 맛집·살림 팁도 환영이에요.',
    category: '말머리',
    title: '제목',
    body: '내용',
    imagesHint: '사진 (최대 3장, JPG/PNG/WebP)',
    submit: '올리기',
    uploading: '올리는 중…',
    needLogin: '글을 쓰시려면 먼저 로그인해 주세요.',
    backToList: '목록으로',
    author: '작성자',
    comments: '댓글',
    commentBody: '댓글을 남겨 주세요',
    sendComment: '댓글 남기기',
    loginForComment: '로그인하고 댓글 남기기',
    views: '조회',
    postOwnerMenu: '내 글 관리',
    postDelete: '삭제',
    postMakePrivate: '비공개로 전환',
    postMakePublic: '다시 공개',
    postDeleteConfirm: '이 글을 삭제할까요? 댓글도 함께 지워져요.',
    postBusy: '처리 중…',
    postActionError: '잠시 후 다시 시도해 주세요.',
    postEdit: '수정',
    postEditTitle: '글 수정',
    editSave: '저장',
    editCancel: '취소',
    postOwnerPasswordOptional: '(선택) 이 글만의 비밀번호 — 삭제·수정·비공개 전환 시 필요',
    postOwnerPasswordRepeat: '비밀번호 확인',
    postOwnerPasswordMismatch: '비밀번호 확인이 일치하지 않습니다.',
    postOwnerPasswordPrompt: '이 글에 설정한 비밀번호를 입력하세요.',
    postOwnerPasswordPlaceholder: '글 비밀번호',
    postOwnerPasswordSubmit: '확인',
    postOwnerPasswordCancel: '취소',
    postOwnerPasswordRequired: '글 비밀번호를 입력해 주세요.',
    postOwnerPasswordWrong: '비밀번호가 맞지 않습니다.',
    postPrivateBadge: '비공개',
    gatedBanner:
      '정식 오픈 전이라 새 글 작성만 잠시 닫아 둔 구역이에요. 목록 보기와 예전 글 읽기는 그대로예요.',
    newPostDisabled: '곧 글쓰기가 열려요',
    tradeHubTitle: '중고·알바',
    tradeHubIntro:
      '중고나 일자리도 조심할 점·후기를 같이 적어 주시면 서로 도움이 돼요. 닉네임만 보이며, 목록에서 바로 이어서 쓸 수 있어요.',
    tradeFleaCta: '중고 코너 가기',
    tradeJobCta: '알바·구인 보러 가기',
    tradeAllBoards: '광장 전체보기',
    emptyGated: '이 말머리에는 아직 글이 없어요. 열리는 대로 여기서 바로 쓸 수 있어요.',
    mod: {
      nsfw:
        '올리신 글이나 이미지가 운영 정책에 맞지 않는 것으로 보여요. 내용을 고쳐서 다시 올려 주세요. 같은 일이 반복되면 이용이 제한될 수 있어요.',
      promo:
        '홍보만 두껍고 도움 정보는 얇아 보여요. 경험이나 정리 위주로 바꾸시거나 중고·알바 말머리에 맞게 고쳐 주세요. 연락처·오픈채팅 링크는 줄여 주시면 감사하겠어요.',
      banned:
        '지금은 이 계정으로 커뮤니티를 이용하실 수 없는 상태예요. 제한이 풀리면 다시 시도해 주세요.',
      imagePolicy:
        '지금은 사진까지 함께 올리기 어려운 상태예요. 잠시는 글만으로 올려 주시거나, 문의가 필요하면 제보함으로 연락 주세요.',
      scam:
        '안전을 위해 사기나 불법적인 금융 내용으로 보이는 부분이 있어 이용을 제한했어요. 잘못된 판단이라고 느끼시면 제보함으로 알려 주세요.',
      server:
        '잠시 서버 쪽에서 확인이 잘 안 되고 있어요. 잠시 후 다시 시도해 주시면 감사하겠어요.',
      auth: '로그인이 풀렸거나 만료된 것 같아요. 다시 로그인한 뒤 시도해 주세요.',
      generic:
        '지금은 등록이 어려워요. 내용을 조금 바꿔서 다시 시도해 보시겠어요?',
    },
  },
  auth: {
    suspenseLoading: '잠시만요…',
    email: '이메일',
    password: '비밀번호',
    or: '또는',
    ellipsis: '…',
    loginTitle: '로그인',
    loginSubtitle: '글쓰기와 댓글은 로그인하신 뒤에 이용하실 수 있어요.',
    honeypotLogin: '자동으로 시도된 것으로 보여요. 직접 로그인을 다시 시도해 주세요.',
    honeypotSignup: '자동으로 가입을 시도한 것으로 보여요. 직접 다시 시도해 주세요.',
    turnstileIncomplete: '아래 보안 확인을 마친 뒤 다시 시도해 주세요.',
    turnstileVerifyFailed:
      '보안 확인은 끝났는데 연결에 실패했어요. 화면을 새로고침한 뒤 다시 시도해 주세요. 그래도 안 되면 잠시 후에 다시 와 주세요.',
    submitLogin: '로그인',
    forgotPassword: '비밀번호를 잊었어요',
    noAccount: '계정이 없으신가요?',
    signupLink: '회원가입',
    signupTitle: '회원가입',
    signupSubtitle:
      '비자·생활 막힐 때 서로 정리해 나누는 곳이에요. 이메일 인증을 마치면 글과 댓글을 쓸 수 있어요.',
    nickLabel: '닉네임',
    nickPlaceholder: '프로필에 표시될 이름',
    signupSubmit: '가입하고 이메일 인증하기',
    signupSubmitLoading: '처리 중…',
    hasAccount: '이미 계정이 있으신가요?',
    loginLink: '로그인',
    checkEmailTitle: '이메일을 확인해 주세요',
    checkEmailSubtitleBefore: '가입을 마치려면 메일함의 ',
    checkEmailSubtitleStrong: '인증 링크',
    checkEmailSubtitleAfter: '를 눌러 주세요. 링크는 보통 몇 분 안에 도착해요.',
    step1Label: '메일함 열기',
    step1HintSentPrefix: '다음 주소로 보냈어요: ',
    step1HintNoEmail: '가입할 때 입력하신 이메일의 받은편지함(스팸함 포함)을 확인해 주세요.',
    step2Label: '인증 링크 누르기',
    step2Hint: '메일 안의 버튼이나 링크를 누르시면 로그인된 채로 돌아와요.',
    step3Label: '시작하기',
    step3Hint: '인증이 끝나면 글쓰기와 댓글을 이용하실 수 있어요.',
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
    newPasswordSubtitle: '다른 사이트와 똑같은 비밀번호는 안 쓰시는 게 안전해요.',
    newPasswordLabel: '새 비밀번호',
    saveAndLogin: '저장하고 로그인하기',
    callbackConnecting: '계정을 연결하는 중이에요…',
    callbackDone: '인증이 끝났어요. 곧 다음 화면으로 넘어가요.',
    callbackSessionFail:
      '로그인 연결에 실패했어요. 메일 링크가 만료됐거나 이미 한 번 사용된 경우가 많아요. 인증 메일을 다시 요청해 보세요.',
    callbackTitleOk: '가입이 완료됐어요. 환영합니다.',
    callbackTitleWait: '인증 처리',
    callbackToLogin: '로그인으로',
    callbackToCheckEmail: '이메일 인증 안내',
    googleContinue: 'Google로 계속하기',
    devGoogleBadge: '[개발]',
    devGoogleTail: ' Google 로그인: Supabase Provider + ',
    turnstileLoading: '보안 확인 로딩 중…',
    passwordShow: '비밀번호 표시',
    passwordHide: '비밀번호 숨기기',
    passwordHint: '8자 이상, 글자·숫자를 함께 사용해 주세요.',
    passwordTooShort: '비밀번호는 {min}자 이상이어야 해요.',
    passwordTooLong: '비밀번호는 {max}자 이하여야 해요.',
    passwordNeedMix: '비밀번호에 글자와 숫자를 각각 한 글자 이상 넣어 주세요.',
    passwordBanned: '너무 흔한 비밀번호예요. 다른 조합을 써 주세요.',
    phoneAuthTitle: '휴대폰 문자로 가입·로그인',
    phoneAuthSubtitle:
      '문자로 받은 인증번호만 입력하시면 돼요. 통신사 본인 확인과는 다른 방식이에요. 지금 사이트 설정에 따라 문자 인증이 제공되지 않을 수 있어요.',
    phoneAuthPhoneLabel: '휴대폰 번호',
    phoneAuthPhonePlaceholder: '0812345678 또는 +66812345678',
    phoneAuthPhoneHint:
      '태국: 081… 형식 또는 +66… / 한국: 010… 형식 또는 +82… — 하이픈·띄어쓰기는 자동으로 무시돼요.',
    phoneAuthNickOptional: '첫 가입 시에만 프로필 이름으로 쓰여요. (선택)',
    phoneAuthSendSms: '인증 문자 보내기',
    phoneAuthSendSmsLoading: '보내는 중…',
    phoneAuthOtpLabel: '인증번호',
    phoneAuthOtpHint: 'SMS에 적힌 숫자 6자리(또는 안내된 자릿수)를 입력해 주세요.',
    phoneAuthOtpSentPrefix: '다음 번호로 인증 문자를 보냈어요: ',
    phoneAuthOtpSentSuffix: '',
    phoneAuthVerify: '확인하고 시작하기',
    phoneAuthVerifyLoading: '확인 중…',
    phoneAuthResendSms: '문자 다시 받기',
    phoneAuthChangeNumber: '번호 바꾸기',
    phoneAuthInvalidPhone: '번호 형식을 확인해 주세요. (태국 081… / +66…, 한국 010… / +82…)',
    phoneAuthNoSupabase: '지금은 문자로 가입하거나 로그인할 수 없어요. 이메일로 가입해 주세요.',
    phoneAuthFooterEmailSignup: '이메일로 가입',
    signupPhoneLink: '휴대폰 문자로 가입·로그인',
    loginPhoneLink: '휴대폰 번호로 로그인',
  },
  minihome: {
    pageTitle: '내 미니홈 · 설정',
    yourSpace:
      '내 미니홈은 서버에 안전하게 저장돼요. 메인룸 글·테마는 여기서 바꾸고, 미리보기는 오버레이로 바로 확인해 보세요.',
    slugLabel: '공개 주소',
    publicPage: '전체 페이지로 열기',
    previewOverlay: '미니홈 미리보기 (오버레이)',
    openFullPage: '새 탭에서 전체 페이지',
    closeOverlay: '닫기',
    overlayLoading: '미니홈 불러오는 중…',
    overlayLoadError: '열 수 없어요. 비공개로 바뀌었거나 주소가 다른 경우가 많아요.',
    editSectionTitle: '미니홈 꾸미기',
    editHint: '제목·한 줄 소개·메인룸 글은 방문자에게 보여요. 포인트 색은 테두리에 은은하게 반영돼요.',
    fieldTitle: '미니홈 제목',
    fieldTagline: '한 줄 소개',
    fieldIntro: '메인룸 글',
    fieldIntroHint:
      '글만 입력하면 돼요. 줄바꿈도 가능해요. 나중에 다이어리·BGM도 덧붙일 예정이에요.',
    fieldAccent: '포인트 색',
    fieldWallpaper: '배경 이미지 URL (선택)',
    fieldWallpaperHint: 'HTTPS 이미지 링크. 비우면 기본 배경만 사용해요.',
    fieldPublic: '공개 미니홈 (끄면 나만 볼 수 있어요)',
    save: '저장',
    saving: '저장 중…',
    saved: '저장됐어요.',
    saveError: '저장이 잘 안 됐어요. 잠시 후에 다시 눌러 주세요.',
    sectionIntro: '메인룸',
    sectionGuestbook: '일촌평',
    sectionPhotos: '사진첩',
    layoutHint: '화면을 맞추는 순서(메인룸 → 일촌평 → 사진첩)는 차례로 열어 갈 예정이에요.',
    guestbookLocked: '일촌평 — 준비 중이에요. 곧 만나요.',
    cyPhotosVisitorHint: '사진은 미니홈 주인만 올릴 수 있어요. 갤러리는 그대로 볼 수 있어요.',
    needsLogin: '미니홈은 로그인 후 이용할 수 있어요.',
    notProvisioned:
      '미니홈을 불러오지 못했어요. 아직 준비 중이거나 일시적인 문제일 수 있어요. 새로고침 후에도 같다면 운영에 문의해 주세요.',
    privateOrMissing: '비공개로 설정됐거나, 없는 주소예요.',
    cyMenuMain: '메인룸',
    cyMenuGuestbook: '일촌평',
    cyMenuVisitor: '방명록',
    cyMenuPhotos: '사진첩',
    cyWindowClose: '닫기',
    cyGuestbookTitle: '일촌평',
    cyVisitorTitle: '방명록',
    cyPhotosTitle: '사진첩',
    cyGuestbookEmpty: '아직 일촌 글이 없어요.',
    cyVisitorEmpty: '아직 방명이 없어요.',
    cyGuestbookWriteSoon: '일촌에게 남길 한마디를 적어 주세요.',
    cyVisitorWriteSoon: '방명록에 남길 인사를 적어 주세요.',
    cyIlchonWriteHint: '일촌을 맺은 친구만 일촌평을 남길 수 있어요.',
    cyOpenWriteHint: '로그인한 분이라면 누구나 방명록을 남길 수 있어요.',
    cyPostSubmit: '등록',
    cyPostSubmitting: '등록 중…',
    cyModerationHide: '숨기기',
    cyModerationUnhide: '다시 보이기',
    cyModerationDelete: '삭제',
    cyHiddenBadge: '숨김',
    cyPhotosEmpty: '올린 사진이 없어요.',
    cyPhotosDefaultAlbum: '기본 앨범',
    cyPhotosUpload: '사진 올리기',
    cyPhotosUploading: '업로드 중…',
    cyPhotosDelete: '삭제',
    cyBodyMinLength: '2자 이상 입력해 주세요.',
    cyDeleteEntryConfirm: '이 글을 삭제할까요?',
    cyDeletePhotoConfirm: '이 사진을 삭제할까요?',
    cyPhotosAlbumCreateError: '앨범을 만들 수 없습니다.',
    cyPhotosTypeError: 'JPEG, PNG, WebP, GIF만 올릴 수 있어요.',
    cyPhotosSizeError: '파일당 최대 5MB입니다.',
    cyOwnerVisitorHint: '다른 분들이 남긴 방명록이에요. 숨기기·삭제는 이 창에서 할 수 있어요.',
    roomEnterTitle: '미니홈 방',
    roomEnterLead: '싸이월드 감성의 메인룸·일촌평·방명록·사진첩 창을 열고 닫으며 둘러보세요.',
    roomEnterCta: '미니홈 방 입장',
    cyIntroEmpty: '메인룸 소개 글이 아직 없어요.',
    previewPanelsHint:
      '미리보기·공개 페이지에서 왼쪽 메뉴로 일촌평·방명록·사진첩 창을 열고 닫을 수 있어요. (싸이 스타일 플로팅 창)',
    styleScoreLabel: '스타일 점수',
    styleShopNav: '스타일 상점',
    greetCardTitle: '가입 인사 한 줄',
    greetCardLead:
      '내 미니홈 방명록에 첫 인사를 남기면 스타일 점수를 드려요. 그 점수로 스킨·미니미를 살 수 있어요.',
    greetPlaceholder: '예: 태국에서 잘 지낼게요. 반가워요!',
    greetSubmit: '인사 남기고 점수 받기',
    greetSubmitting: '처리 중…',
    greetDone: '가입 인사를 완료했어요.',
    greetThanks: '스타일 점수가 지급됐어요. 아래 상점에서 꾸밈 아이템을 사 보세요.',
    styleShopTitle: '미니홈 스타일 상점',
    styleShopLead: '스타일 점수로 방 분위기(포인트 색)와 미니미를 살 수 있어요. 구매 즉시 내 미니홈에 적용돼요.',
    styleShopBalance: '보유 점수',
    styleShopCatSkin: '룸 스킨',
    styleShopCatMinimi: '미니미',
    styleShopCatBgm: 'BGM',
    styleShopCatWallpaper: '배경',
    styleShopCatFrame: '프레임',
    styleShopBuy: '구매',
    styleShopBuyRental: '{days}일 대여',
    styleShopBuyPerm: '영구 구매',
    styleShopEquip: '장착',
    styleShopOwned: '보유 중',
    styleShopNeedPoints: '도토리가 부족해요.',
    styleShopPurchased: '구매했어요. 미니홈에서 확인해 보세요.',
    styleShopEquipped: '장착했어요.',
    styleShopLoadError: '상점 목록을 불러오지 못했어요.',
    styleShopEmpty: '이 카테고리에 상품이 아직 없어요.',
    styleShopDaysLeft: 'D-{n}',
    styleShopRentalTag: '{days}일',
    styleShopPermTag: '영구',
    styleShopCheckin: '출석 체크',
    styleShopCheckedIn: '오늘 출석 완료!',
    dotoriLabel: '도토리',
    styleRpcNotAuth: '로그인이 필요해요.',
    styleRpcGreetingDone: '이미 가입 인사 보상을 받았어요.',
    styleRpcGreetingShort: '인사말을 조금만 더 길게 써 주세요.',
    styleRpcGreetingLong: '인사말이 너무 길어요.',
    styleRpcNoItem: '없는 상품이에요.',
    styleRpcOwned: '이미 구매한 아이템이에요.',
    styleRpcPoor: '스타일 점수가 부족해요.',
    styleRpcNotOwned: '아직 사지 않은 아이템이에요.',
    styleRpcGeneric: '처리 중 문제가 났어요. 잠시 후 다시 시도해 주세요.',
    sectionLockedIlchon: '일촌에게만 공개된 섹션이에요',
    sectionLockedPrivate: '비공개 섹션이에요',
    cyMenuDiary: '다이어리',
    cyDiaryTitle: '다이어리',
    cyDiaryEmpty: '아직 쓴 일기가 없어요.',
    cyDiaryWrite: '일기 쓰기',
    cyDiaryWriting: '저장 중…',
    cyDiarySave: '저장',
    cyDiarySaved: '저장됐어요!',
    cyDiaryDelete: '삭제',
    cyDiaryDeleteConfirm: '이 일기를 정말 삭제할까요?',
    cyDiarySecret: '비밀 일기',
    cyDiaryMoodHappy: '😊',
    cyDiaryMoodSad: '😢',
    cyDiaryMoodAngry: '😠',
    cyDiaryMoodLove: '❤️',
    cyDiaryMoodTired: '😩',
    cyDiaryMoodNeutral: '😐',
    loadingMark: '…',
    emDash: '—',
  },
  ilchon: {
    pageTitle: '일촌',
    pageLead:
      '신청을 보내고, 상대가 수락하면 서로 부르는 일촌명이 정해져요. 받은 신청은 여기서 수락·거절할 수 있어요.',
    needLogin: '일촌은 로그인한 뒤 이용할 수 있어요.',
    goLogin: '로그인하기',
    requestButton: '일촌 신청',
    requestTitle: '일촌 신청 보내기',
    messageLabel: '메시지 (선택)',
    messagePlaceholder: '짧게 인사를 남겨도 돼요.',
    proposedNickLabel: '내가 상대를 부를 이름 (선택)',
    proposedNickHint: '수락 화면에서 상대가 확인·수정할 수 있어요.',
    sendRequest: '신청 보내기',
    sending: '보내는 중…',
    close: '닫기',
    alreadyIlchon: '이미 일촌이에요.',
    pendingOutbound: '신청을 보냈어요. 상대 수락을 기다리는 중이에요.',
    pendingInbound: '상대가 보낸 신청이 있어요. 일촌함에서 확인해 주세요.',
    openInbox: '일촌함 열기',
    accept: '수락',
    reject: '거절',
    cancelRequest: '신청 취소',
    acceptTitle: '일촌 맺기',
    nickYouCallThem: '내가 신청자를 부를 이름',
    nickTheyCallYou: '신청자가 나를 부를 이름',
    nickYouCallThemHint: '내 미니홈·목록에 쓸 애칭이에요.',
    nickTheyCallYouHint: '상대가 제안했으면 그대로 두거나 고쳐 주세요.',
    confirmAccept: '일촌 맺기',
    incomingTitle: '받은 신청',
    outgoingTitle: '보낸 신청',
    friendsTitle: '내 일촌',
    incomingEmpty: '받은 신청이 없어요.',
    outgoingEmpty: '보낸 대기 중인 신청이 없어요.',
    friendsEmpty: '아직 맺은 일촌이 없어요. 미니홈에서 신청해 보세요.',
    youCallThemLabel: '내가 부르는 이름',
    proposedFromThem: '신청자가 나를 부르고 싶어 하는 이름(제안)',
    errorGeneric: '잠시 안 됐어요. 다시 시도해 주세요.',
    errorPendingExists: '이미 진행 중인 신청이 있어요.',
    errorAlreadyIlchon: '이미 일촌이에요.',
    errorNotAuth: '로그인이 필요해요.',
    errorSelf: '자기 자신에게는 보낼 수 없어요.',
  },
  localShop: {
    sectionIlchon: '일촌평',
    sectionOpen: '방명록',
    emptyIlchon: '아직 일촌 글이 없어요.',
    emptyOpen: '아직 방명이 없어요.',
    hintIlchon: '가게 담당자와 일촌을 맺은 분만 일촌평을 남길 수 있어요.',
    hintOpen: '로그인한 분이라면 누구나 방명록을 남길 수 있어요.',
    placeholderIlchon: '일촌 한마디를 적어 주세요.',
    placeholderOpen: '방명록에 인사를 남겨 주세요.',
    submit: '등록',
    submitting: '등록 중…',
    loginToPost: '글을 남기려면 로그인해 주세요.',
    ownerPaused: '지금은 방명록을 받지 않는 설정입니다. 방문자에게는 이 칸이 보이지 않아요.',
    ownerModerateHint: '숨기기·삭제는 가게 담당 계정으로만 할 수 있어요.',
    ilchonOnlyHint: '일촌을 맺으면 여기에 글을 남길 수 있어요.',
    noOwnerForIlchon: '가게 담당 계정이 연결되면 일촌평을 쓸 수 있어요.',
    hiddenBadge: '숨김',
    hide: '숨기기',
    unhide: '다시 보이기',
    delete: '삭제',
    confirmDelete: '이 글을 삭제할까요?',
    bodyTooShort: '2자 이상 입력해 주세요.',
    loading: '불러오는 중…',
    ownerSettingsLead: '방명록·일촌평은 아래에서 켜고 끄고, 미니홈에 칸을 보일지도 정할 수 있어요.',
    guestbookReceive: '방명록·일촌평 받기',
    guestbookShowSection: '미니홈에 방명록 칸 표시',
  },
  search: {
    ariaLabel: '태자 월드 안에서 메뉴·뉴스 검색',
    headerBarLabel: '통합 검색',
    heroTitle: '무엇을 찾고 계신가요?',
    portalLead:
      '메뉴 경로와 공개 뉴스 제목을 실시간으로 찾아요. 요약·댓글·광장·거래 등 본격적인 읽기와 참여는 로그인 후에만 열려요.',
    placeholder: '검색… (예: 비자, 맛집, 방콕, /local)',
    hint: '한글 초성·태국어·주소 일부도 됩니다. 결과에서 «어디가 맞았는지»를 함께 보여 드려요.',
    noResults: '맞는 메뉴나 뉴스 제목이 없어요. 다른 단어로 해보세요.',
    quickHeading: '자주 가는 곳',
    sectionPages: '사이트 메뉴·페이지',
    sectionNews: '참고 뉴스(제목·정리 문구)',
    badgeMember: '로그인 후 열람·참여',
    badgePublic: '바로 이동',
    searching: '검색 중…',
  },
  weather: { city: '방콕', condition: '맑음' },
  seo: {
    defaultTitle: '태자 월드 (Thai Ja World)',
    titleTemplate: '%s | 태자 월드',
    defaultDescription:
      '태국 살이 정보 나눔 — 경험·정리·제보, 중고·알바·맛집·로컬·미니홈',
    homeTitle: '홈 — 태자 월드',
    homeDescription:
      '태국 살이 막힐 때 — 광장·거래·제보·동네·참고 뉴스·미니홈(준비 중)',
    boardsListDescription:
      '한국어로 나누는 태국 살이 — 후기·정보·거래할 때 조심할 점. 방콕·파타야 동네 이야기.',
    tradeHubDescription:
      '중고·일자리도 후기·주의를 같이 나누는 곳 — 말머리에서 바로 들어가 보세요.',
  },
  push: {
    optInTitle: '🛟 막힐 때 열어 보는 짧은 정리',
    optInLead:
      '광고·마케팅 수신 동의가 아니에요. 살이에 쓸 짧은 정리 한 통이에요. 알림은 원하실 때만, 거절하셔도 가입·이용은 그대로예요.',
    optInHook:
      '집 구하기·TM30·병원비처럼 막히는 일, 그날 참고할 소식과 방콕 날씨를 한국어·태국어로 짧게만 묶어 보내 드려요. 길게 홍보하지 않고, 열었을 때 도움이 되게요.',
    optInCookie:
      '그 정리를 보내 드리려면 브라우저 알림 허용과, 동작에 필요한 아주 적은 저장(쿠키)만 씁니다. 부담이 되시면 이 카드에서 끄시거나 브라우저 설정에서 막으셔도 돼요.',
    enable: '짧은 정리, 받아볼게요',
    disable: '정리 알림만 끄기',
    dismiss: '괜찮아요, 다음에',
    needLogin: '로그인하시고 이메일 인증까지 끝나신 뒤에 켜실 수 있어요.',
    notSupported:
      '지금 쓰시는 환경에서는 웹 알림이 잘 안 될 수 있어요. iPhone은 홈 화면에 사이트를 추가한 뒤 열면 되는 경우가 많아요. 안 되셔도 괜찮아요. 사이트 쓰는 데는 지장 없어요.',
    working: '잠깐만요…',
    enabledOk: '정리해 둘게요. 부담 없게 짧게만 보낼게요.',
    error: '잠시 안 됐어요. 나중에 다시 눌러 주세요.',
    permissionDenied:
      '알림이 꺼져 있어요. 바꾸고 싶으시면 주소창 옆 자물쇠에서 알림을 허용으로 바꿔 주세요. 그대로 두셔도 사이트는 그대로 쓰실 수 있어요.',
  },
};

const th: Dictionary = {
  nav: {
    home: 'หน้าแรก',
    tips: 'ทิปส์',
    local: 'ร้านท้องถิ่น',
    community: 'ลานชุมชน',
    ilchon: 'เพื่อน (อิลชอน)',
    minihome: 'มินิโฮม',
    botConsole: 'ผู้ดูแล',
    memberMinihome: 'มินิโฮมของฉัน',
    memberNotesInbox: 'คำขอ·ข้อความ',
    memberFriends: 'เพื่อนของฉัน',
    memberQuickNavAria: 'เมนูด่วนสมาชิก',
    mainNavAria: 'เมนูหลัก',
  },
  brandSuffix: 'เวิลด์',
  logoAria: 'Thai Ja World — หน้าแรก',
  lang: { ko: '한국어', th: 'ไทย' },
  footer:
    '© 2026 Thai Ja World · thaijaworld.com | แบ่งปันข้อมูลชีวิตในไทย — ประสบการณ์·เลี่ยงปัญหา·สรุป, แจ้งเรื่อง·มือสอง·งาน·ร้าน·มินิโฮม',
  tierPremium: 'พรีเมียม',
  tierStandard: 'สแตนดาร์ด',
  home: {
    tag: 'THAI JA WORLD · ติดขัดเมื่อไหร่ก็มาอ่าน',
    title: 'ชีวิตที่ไทย — ช่วยกันผ่านไป',
    heroKicker: 'ประสบการณ์ · แจ้งเรื่อง · งาน · ท้องถิ่น',
    heroLead: 'ติดขัดตรงไหน — เริ่มที่นี่',
    heroSub:
      'บ้าน·วีซ่า·ค่ารพ ที่ติดขัด แชร์ประสบการณ์แล้วคนถัดไปได้ประโยชน์\nเน้นช่วยเหลือ·ข้อควรระวัง·สรุป มากกว่าโฆษณา — โพสต์สั้นๆ ก็ได้\nอยากเข้ามาตอนไหนก็ได้',
    portalMastTitle: 'ค้นหา Thai Ja World',
    portalMastSub: 'เมนู·ข่าว·พาธในที่เดียว — หน้าแรกแบบพอร์ทัล',
    portalMastQuickAria: 'ทางลัดเมนูยอดนิยม',
    dreamIntro: 'ใช้ได้แล้วตอนนี้ · ',
    dreamMinihome: 'ไปมินิโฮม ',
    dreamMid: 'ห้องของฉัน กฎของฉัน ',
    dreamPersonal: 'ตั้งแต่วอลเปเปอร์ถึงคำโปรยบรรทัดเดียว แต่งได้เลย ',
    dreamOutro: 'เปิดเผยหรือส่วนตัว เลือกที่ปลายนิ้ว',
    hubBoard: 'ลานคุย',
    hubBoardSub: 'คุยเล่น · ข่าวคราว · วันนี้มีอะไรมาใหม่',
    hubLocal: 'ร้านท้องถิ่น',
    hubLocalSub: 'รีวิว · วิธีหา · ติดต่อในที่เดียว',
    hubNotice: 'มือสอง · ซื้อขาย·หางาน',
    hubNoticeSub: 'เห็นแค่ชื่อเล่น · สั้นก็ได้ · โพสต์ได้ทันที',
    hubTip: 'กล่องแจ้งเรื่อง',
    hubTipSoon: 'เชื่อมช่องแล้วเปิดจากตรงนี้ได้เลย · ตอนนี้กำลังเตรียมการ',
    hubMinihome: 'มินิโฮม',
    hubMinihomeSub: 'พื้นหลัง·แนะนำตัว · ตั้งค่าเปิดเผย',
    hotLabel: '🔥 วันนี้ที่ไทย — บรรทัดเดียวที่ควรรู้',
    hotNewsBadge: 'สรุป',
    hotNewsEmpty: 'ยังเงียบอยู่ — เดี๋ยวเติมเรื่องที่คนอยู่ไทยต้องรู้',
    hotNewsLoading: 'กำลังคัดเฉพาะข่าวที่ใช้ได้…',
    hotFootnote:
      'กดหัวข้อเพื่อไปบทความต้นทาง บรรทัดสีเทาคือสรุป — คนละโซนกับบอร์ดลานชุมชน',
    shopsTitle: '🏪 ร้านแนะนำ',
    shopsMore: 'ดูทั้งหมด →',
    shopsEmpty: 'ยังไม่มีร้านแนะนำตอนนี้ เดี๋ยวค่อยเติมให้',
    shopsEmptyLink: 'ไปหน้าร้านท้องถิ่น',
    shopsLoading: 'กำลังโหลดร้าน…',
    weatherTitle: 'สภาพอากาศ · จริง',
    weatherAttribution: 'Open-Meteo · รีเฟรชประมาณทุก 10 นาที',
    weatherBangkok: 'กรุงเทพฯ',
    weatherPattaya: 'พัทยา',
    weatherChiangMai: 'เชียงใหม่',
    weatherLoading: 'กำลังโหลดสภาพอากาศ…',
    weatherUnavailable: 'โหลดสภาพอากาศไม่ได้ ลองใหม่ในอีกสักครู่นะ',
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
      styleHint:
        '💡 ภายหลังใช้พอยต์แต่งสกินรีโมทและปุ่มได้ — กลิ่นอายมินิโฮมสมัยก่อน ยังอยู่ครบ',
      thb: 'THB',
      krw: 'KRW',
      usd: 'USD',
      floatingHint:
        '💱 ทุกหน้า มุมขวาบน (ตำแหน่งเริ่มต้น) แตะแล้วหน้าต่างเรทเล็กๆ จะขึ้น ลากไปวางที่ไหนก็ได้',
      dragHandle: 'ลากย้าย',
      keypadShow: 'ปุ่มตัวเลข',
      keypadHide: 'ซ่อนปุ่ม',
      minimize: 'ย่อ',
      expandFab: 'เปิดรีโมทเรท',
      menuAria: 'เมนู',
      stylePreviewLine: '{own} − {cost} → {after}',
      styleOwnLine: 'มี {own}★',
    },
    tipDigestTitle: 'กล่องแจ้งเรื่อง · ลิงก์',
    tipTelegram: 'Telegram — กล่องแจ้งเรื่อง',
    tipWhatsapp: 'WhatsApp — กล่องแจ้งเรื่อง',
    tipLine: 'LINE — กล่องแจ้งเรื่อง',
    tipFacebook: 'Facebook — กล่องแจ้งเรื่อง',
    tipTiktok: 'TikTok — โปรโมชัน·อัปเดต',
    tipEnvHint: 'ฝั่งผู้ดูแลใส่ลิงก์ไว้ การ์ดนี้จะเปิดให้ทันที',
    newsTitle: 'สรุปอ้างอิงชีวิตที่ไทย',
    newsSub:
      'สรุปจากข่าวภายนอกสั้นๆ บรรทัดเดียวอ่านได้ทุกคน สรุปเต็ม·ลิงก์ต้นทาง·ความคิดเห็น — หลังเข้าสู่ระบบ',
    newsLoading: 'กำลังโหลด…',
    newsCountLine: 'ทั้งหมด {n} รายการ — แสดง 5 รายการที่นี่',
    newsEmpty: 'ยังไม่มีเรื่องในช่องนี้ แวะใหม่ภายหลังนะ',
    newsEmptyLink: 'ไปดูลานชุมชน →',
    newsDetailBack: '← กลับหน้าแรก',
    newsDetailWitLabel: 'ทีเด็ด Thai Ja',
    newsDetailSummaryLabel: 'สรุป',
    newsDetailEditorLabel: 'จากโต๊ะบรรณาธิการ',
    newsDetailExternalCta: 'เปิดบทความต้นทาง',
    newsDetailExternalHint: 'จะไปเว็บสื่อต้นทาง',
    newsDetailMissing: 'หาเรื่องนี้ไม่เจอหรือหมดอายุแล้ว กลับหน้าแรกได้เลย',
    guestHomePublicLabel: 'ค้นหา·ดูตัวอย่าง (ไม่ต้องสมัคร)',
    guestHomePublicBody:
      'ค้นหาเมนู·หัวข้อข่าว และดูตัวอย่างบรรทัดเดียวในหน้าแรกได้ สรุปเต็ม·โน้ตบรรณาธิการ·ลิงก์ต้นทาง·ความคิดเห็น — หลังเข้าสู่ระบบ',
    guestHomeMemberLabel: 'มีส่วนร่วม (สมาชิก)',
    guestHomeMemberBody:
      'สภาพอากาศ·ร้านท้องถิ่น·บอร์ด·มือสอง·งานพาร์ทไทม์·มินิโฮม ความคิดเห็นข่าว — ต้องเข้าสู่ระบบหรือสมัครสมาชิก',
    guestHomeLoginCta: 'เข้าสู่ระบบหรือสมัครเพื่อเปิดทั้งหมด',
    newsDetailGuestNote:
      'สรุปเต็ม·ลิงก์ต้นทาง·ความคิดเห็น — ใช้ได้หลังเข้าสู่ระบบหรือสมัคร บอร์ด·ซื้อขาย·มินิโฮมก็เฉพาะสมาชิก',
    newsDetailLockedLead:
      'ด้านล่างนี้เป็นสรุป·แหล่งที่มา·ความคิดเห็นสำหรับสมาชิก — เข้าสู่ระบบเพื่ออ่านต่อและร่วมพูดคุย',
  },
  tips: {
    pageTitle: 'ทิปส์ชีวิตในไทย',
    pageLead:
      'แสดงเฉพาะหัวข้อกับคำโปรยสั้นๆ รายการเช็ก·ข้อควรระวัง·ลิงก์แหล่งข่าว — ดูเต็มได้หลังเข้าสู่ระบบหรือสมัครที่บอร์ดข้อมูลในลานชุมชน',
    openCard: 'ดูต่อ',
    detailLockedLead:
      'สรุปเต็ม·เช็กลิสต์·ลิงก์ต้นทาง — สำหรับสมาชิกเท่านั้น สมัครแล้วเปิดโพสต์เดิมในบอร์ดได้ครบ',
    loginForFull: 'เข้าสู่ระบบเพื่ออ่านเต็ม·ลิงก์',
    signupForFull: 'สมัครเพื่ออ่านเต็ม·ลิงก์',
    goLogin: 'เข้าสู่ระบบ',
    goSignup: 'สมัครสมาชิก',
    empty: 'ยังไม่มีทิปส์ — เร็วๆ นี้จะเพิ่ม',
    backToList: 'กลับรายการทิปส์',
  },
  board: {
    pageTitle: 'บอร์ดลานชุมชน',
    newPost: 'โพสต์เลย',
    login: 'เข้าสู่ระบบ',
    signup: 'สมัครสมาชิก',
    logout: 'ออกจากระบบ',
    empty: 'โพสต์แรกจากประสบการณ์หรือวิธีเลี่ยงปัญหาก็ได้ ร้านเด็ด·ทิปชีวิตยินดี',
    category: 'หมวด',
    title: 'หัวข้อ',
    body: 'เนื้อหา',
    imagesHint: 'รูปภาพ (สูงสุด 3 รูป, JPG/PNG/WebP)',
    submit: 'ส่งเลย',
    uploading: 'กำลังอัปโหลด…',
    needLogin: 'โพสต์ได้หลังเข้าสู่ระบบเท่านั้นนะ',
    backToList: 'กลับรายการ',
    author: 'ผู้เขียน',
    comments: 'ความคิดเห็น',
    commentBody: 'พิมพ์ความคิดเห็นที่นี่',
    sendComment: 'ส่งความคิดเห็น',
    loginForComment: 'ล็อกอินแล้วแสดงความคิดเห็น',
    views: 'ดู',
    postOwnerMenu: 'จัดการโพสต์ของฉัน',
    postDelete: 'ลบ',
    postMakePrivate: 'ทำเป็นส่วนตัว',
    postMakePublic: 'เปิดเป็นสาธารณะอีกครั้ง',
    postDeleteConfirm: 'ลบโพสต์นี้? ความคิดเห็นจะถูกลบด้วย',
    postBusy: 'กำลังดำเนินการ…',
    postActionError: 'ลองอีกครั้งในอีกสักครู่',
    postEdit: 'แก้ไข',
    postEditTitle: 'แก้ไขโพสต์',
    editSave: 'บันทึก',
    editCancel: 'ยกเลิก',
    postOwnerPasswordOptional: '(เลือกได้) รหัสเฉพาะโพสต์ — ต้องใส่เมื่อลบ·แก้ไข·ตั้งส่วนตัว',
    postOwnerPasswordRepeat: 'ยืนยันรหัส',
    postOwnerPasswordMismatch: 'รหัสยืนยันไม่ตรงกัน',
    postOwnerPasswordPrompt: 'ใส่รหัสที่ตั้งไว้กับโพสต์นี้',
    postOwnerPasswordPlaceholder: 'รหัสโพสต์',
    postOwnerPasswordSubmit: 'ตกลง',
    postOwnerPasswordCancel: 'ยกเลิก',
    postOwnerPasswordRequired: 'กรุณาใส่รหัสโพสต์',
    postOwnerPasswordWrong: 'รหัสไม่ถูกต้อง',
    postPrivateBadge: 'ส่วนตัว',
    gatedBanner:
      'ก่อนเปิดตัวจริง — โพสต์ใหม่ปิดชั่วคราว ดูรายการและโพสต์เดิมได้ตามปกติ',
    newPostDisabled: 'จะเปิดให้โพสต์เร็วๆ นี้',
    tradeHubTitle: 'มือสอง · ซื้อขาย·หางาน',
    tradeHubIntro:
      'มือสองและงาน — แนะนำให้ใส่ข้อควรระวังหรือประสบการณ์ด้วย จะช่วยกันได้มาก เห็นแค่ชื่อเล่น ดูจากรายการหรือกดเขียนต่อได้เลย',
    tradeFleaCta: 'ไปโซนมือสอง',
    tradeJobCta: 'ดูงาน·จ้าง',
    tradeAllBoards: 'ไปลานทั้งหมด',
    emptyGated: 'หมวดนี้ยังว่าง — พอเปิดแล้วโพสต์ที่นี่ได้เลย',
    mod: {
      nsfw:
        'ข้อความหรือรูปนี้ยังไม่ตรงกฎของเรา ลองแก้แล้วโพสต์ใหม่นะ ทำซ้ำหลายครั้งอาจถูกจำกัดบัญชี',
      promo:
        'โฆษณาหนาแน่นกว่าข้อมูลที่ช่วยเหลือ ลองเขียนแบบประสบการณ์หรือสรุป หรือย้ายไปหมวดมือสอง/หางาน ลดลิงก์ติดต่อลงหน่อย ขอบคุณที่ช่วยกันรักษาบรรยากาศ',
      banned: 'บัญชีนี้ใช้บอร์ดไม่ได้ชั่วคราว พอครบกำหนดแล้วลองใหม่ได้',
      imagePolicy:
        'ตอนนี้ยังแนบรูปพร้อมโพสต์ยากอยู่ ลองโพสต์แค่ข้อความก่อน หรือทักกล่องแจ้งเรื่องถ้าต้องการความช่วยเหลือ',
      scam:
        'เพื่อความปลอดภัย เราจำกัดบัญชีไว้ก่อนเพราะเนื้อหาคล้ายหลอกลวงหรือการเงินผิดกฎ ถ้าคิดว่าเข้าใจผิด แจ้งที่กล่องแจ้งเรื่องได้เลย',
      server: 'ฝั่งเซิร์ฟเวอร์ขัดข้องชั่วคราว รอสักครู่แล้วลองใหม่อีกทีนะ',
      auth: 'เซสชันหมดหรือล็อกเอาต์ไปแล้ว ล็อกอินใหม่แล้วลองอีกครั้ง',
      generic: 'โพสต์ไม่สำเร็จตอนนี้ ลองปรับเนื้อหานิดหน่อยแล้วลองใหม่นะ',
    },
  },
  auth: {
    suspenseLoading: 'รอสักครู่…',
    email: 'อีเมล',
    password: 'รหัสผ่าน',
    or: 'หรือ',
    ellipsis: '…',
    loginTitle: 'เข้าสู่ระบบ',
    loginSubtitle: 'โพสต์และคอมเมนต์ — เข้าสู่ระบบก่อนแล้วค่อยใช้งานได้เต็มที่',
    honeypotLogin: 'ตรวจพบการล็อกอินอัตโนมัติ ลองล็อกอินเองอีกครั้งนะ',
    honeypotSignup: 'ตรวจพบการสมัครอัตโนมัติ ถ้าเป็นคนจริงลองสมัครใหม่ได้เลย',
    turnstileIncomplete: 'ทำการยืนยันความปลอดภัยด้านล่างให้ครบ แล้วลองอีกครั้ง',
    turnstileVerifyFailed:
      'ยืนยันความปลอดภัยแล้ว แต่เชื่อมต่อไม่สำเร็จ รีเฟรชหน้าแล้วลองใหม่ ถ้ายังไม่ได้ค่อยกลับมาใหม่ภายหลัง',
    submitLogin: 'เข้าสู่ระบบ',
    forgotPassword: 'ลืมรหัสผ่าน',
    noAccount: 'ยังไม่มีบัญชี?',
    signupLink: 'สมัครสมาชิก',
    signupTitle: 'สมัครสมาชิก',
    signupSubtitle:
      'วีซ่า·ชีวิตติดขัด มาแชร์สรุปกัน ยืนยันอีเมลแล้วโพสต์และคอมเมนต์ได้เต็มที่',
    nickLabel: 'ชื่อที่โชว์',
    nickPlaceholder: 'ชื่อบนโปรไฟล์',
    signupSubmit: 'สมัครและยืนยันอีเมล',
    signupSubmitLoading: 'กำลังดำเนินการ…',
    hasAccount: 'มีบัญชีแล้ว?',
    loginLink: 'เข้าสู่ระบบ',
    checkEmailTitle: 'เช็กอีเมลของคุณ',
    checkEmailSubtitleBefore: 'จะสมัครให้เสร็จ กด ',
    checkEmailSubtitleStrong: 'ลิงก์ยืนยัน',
    checkEmailSubtitleAfter: ' ในกล่องจดหมาย — มักมาถึงภายในไม่กี่นาที',
    step1Label: 'เปิดกล่องจดหมาย',
    step1HintSentPrefix: 'ส่งไปที่ ',
    step1HintNoEmail: 'เช็กอีเมลที่ใช้สมัคร (รวมโฟลเดอร์สแปม)',
    step2Label: 'กดลิงก์ยืนยัน',
    step2Hint: 'กดปุ่มหรือลิงก์ในเมล แล้วจะกลับมาในสถานะล็อกอิน',
    step3Label: 'เริ่มใช้งาน',
    step3Hint: 'ยืนยันเสร็จแล้วโพสต์กับคอมเมนต์ได้เต็มที่',
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
    newPasswordSubtitle: 'ใช้รหัสคนละชุดกับเว็บอื่นจะปลอดภัยกว่า',
    newPasswordLabel: 'รหัสผ่านใหม่',
    saveAndLogin: 'บันทึกแล้วเข้าสู่ระบบ',
    callbackConnecting: 'กำลังเชื่อมบัญชี…',
    callbackDone: 'ยืนยันเสร็จแล้ว เดี๋ยวพาไปหน้าถัดไป',
    callbackSessionFail:
      'ล็อกอินไม่สำเร็จ ลิงก์ในเมลอาจหมดอายุหรือใช้ไปแล้ว ลองขอเมลยืนยันใหม่ได้',
    callbackTitleOk: 'สมัครเสร็จแล้ว ยินดีต้อนรับ',
    callbackTitleWait: 'กำลังยืนยัน',
    callbackToLogin: 'ไปเข้าสู่ระบบ',
    callbackToCheckEmail: 'คำแนะนำยืนยันอีเมล',
    googleContinue: 'ดำเนินการต่อด้วย Google',
    devGoogleBadge: '[dev]',
    devGoogleTail: ' Google login: Supabase Provider + ',
    turnstileLoading: 'กำลังโหลดการยืนยันความปลอดภัย…',
    passwordShow: 'แสดงรหัสผ่าน',
    passwordHide: 'ซ่อนรหัสผ่าน',
    passwordHint: 'อย่างน้อย 8 ตัว มีทั้งตัวอักษรและตัวเลข',
    passwordTooShort: 'รหัสผ่านต้องมีอย่างน้อย {min} ตัว',
    passwordTooLong: 'รหัสผ่านต้องไม่เกิน {max} ตัว',
    passwordNeedMix: 'ใส่ทั้งตัวอักษรและตัวเลขอย่างน้อยอย่างละหนึ่งตัว',
    passwordBanned: 'รหัสนี้ค่อนข้างธรรมดา — ลองชุดอื่น',
    phoneAuthTitle: 'สมัคร/เข้าสู่ระบบด้วย SMS',
    phoneAuthSubtitle:
      'ใส่รหัสจาก SMS เท่านั้น (ไม่ใช่การยืนยันตัวตนกับค่ายมือถือ) ฟีเจอร์นี้อาจยังไม่เปิดตามการตั้งค่าเว็บ',
    phoneAuthPhoneLabel: 'เบอร์โทรศัพท์',
    phoneAuthPhonePlaceholder: '0812345678 หรือ +66812345678',
    phoneAuthPhoneHint:
      'ไทย: 081… หรือ +66… / เกาหลี: 010… หรือ +82… — ขีด/ช่องว่างจะตัดออกให้',
    phoneAuthNickOptional: 'ใช้ตอนสมัครครั้งแรกเท่านั้น (ไม่บังคับ)',
    phoneAuthSendSms: 'ส่ง SMS ยืนยัน',
    phoneAuthSendSmsLoading: 'กำลังส่ง…',
    phoneAuthOtpLabel: 'รหัสยืนยัน',
    phoneAuthOtpHint: 'ใส่ตัวเลข 6 หลัก (หรือตาม SMS)',
    phoneAuthOtpSentPrefix: 'ส่งไปที่ ',
    phoneAuthOtpSentSuffix: ' แล้ว',
    phoneAuthVerify: 'ยืนยันและเริ่ม',
    phoneAuthVerifyLoading: 'กำลังตรวจ…',
    phoneAuthResendSms: 'ส่ง SMS อีกครั้ง',
    phoneAuthChangeNumber: 'เปลี่ยนเบอร์',
    phoneAuthInvalidPhone: 'รูปแบบเบอร์ไม่ถูกต้อง',
    phoneAuthNoSupabase: 'ตอนนี้สมัคร/ล็อกอินด้วย SMS ไม่ได้ ใช้อีเมลแทนได้เลย',
    phoneAuthFooterEmailSignup: 'สมัครด้วยอีเมล',
    signupPhoneLink: 'สมัคร/เข้าสู่ระบบด้วย SMS',
    loginPhoneLink: 'เข้าสู่ระบบด้วยเบอร์โทร',
  },
  minihome: {
    pageTitle: 'มินิโฮมของฉัน · ตั้งค่า',
    yourSpace:
      'มินิโฮมของคุณเก็บบนเซิร์ฟเวอร์อย่างปลอดภัย แก้หัวข้อ·คำโปรย·ห้องหลักได้ที่นี่ ดูตัวอย่างแบบโอเวอร์เลย์ได้ทันที',
    slugLabel: 'ลิงก์สาธารณะ',
    publicPage: 'เปิดเต็มหน้า',
    previewOverlay: 'ดูตัวอย่าง (โอเวอร์เลย์)',
    openFullPage: 'แท็บใหม่ — เต็มหน้า',
    closeOverlay: 'ปิด',
    overlayLoading: 'กำลังโหลดมินิโฮม…',
    overlayLoadError: 'เปิดไม่ได้ อาจตั้งเป็นส่วนตัวหรือลิงก์ไม่ตรง',
    editSectionTitle: 'แต่งมินิโฮม',
    editHint: 'หัวข้อ·คำโปรย·ห้องหลัก ผู้เยี่ยมจะเห็น สีเน้นแสดงที่กรอบอย่างนุ่มนวล',
    fieldTitle: 'ชื่อมินิโฮม',
    fieldTagline: 'คำโปรยบรรทัดเดียว',
    fieldIntro: 'ข้อความห้องหลัก',
    fieldIntroHint:
      'พิมพ์ข้อความธรรมดาได้ ขึ้นบรรทัดใหม่ได้ ภายหลังจะเพิ่มไดอารี่·BGM ได้ตามลำดับ',
    fieldAccent: 'สีเน้น',
    fieldWallpaper: 'URL รูปพื้นหลัง (ไม่บังคับ)',
    fieldWallpaperHint: 'ลิงก์ HTTPS เท่านั้น — ว่าง = พื้นหลังเริ่มต้น',
    fieldPublic: 'เปิดมินิโฮมสาธารณะ (ปิด = เห็นแค่เจ้าของ)',
    save: 'บันทึก',
    saving: 'กำลังบันทึก…',
    saved: 'บันทึกแล้ว',
    saveError: 'บันทึกไม่สำเร็จ รอสักครู่แล้วกดอีกทีนะ',
    sectionIntro: 'ห้องหลัก',
    sectionGuestbook: 'ทักทาย',
    sectionPhotos: 'อัลบั้ม',
    layoutHint: 'ลำดับการแสดง (ห้องหลัก → ทักทาย → อัลบั้ม) จะเปิดทีละส่วนในลำดับถัดไป',
    guestbookLocked: 'ทักทาย — กำลังเตรียม เร็วๆ นี้เจอกัน',
    cyPhotosVisitorHint: 'เจ้าของมินิโฮมเท่านั้นที่อัปโหลดได้ ดูรูปได้ตามปกติ',
    needsLogin: 'ใช้มินิโฮมได้หลังล็อกอินเท่านั้นนะ',
    notProvisioned:
      'โหลดมินิโฮมยังไม่สำเร็จ อาจยังไม่พร้อมหรือขัดข้องชั่วคราว รีเฟรชแล้วลองใหม่ หรือติดต่อผู้ดูแล',
    privateOrMissing: 'ตั้งเป็นส่วนตัว หรือไม่มีลิงก์นี้',
    cyMenuMain: 'ห้องหลัก',
    cyMenuGuestbook: 'ทักทาย',
    cyMenuVisitor: 'สมุดเยี่ยม',
    cyMenuPhotos: 'อัลบั้ม',
    cyWindowClose: 'ปิด',
    cyGuestbookTitle: 'ทักทาย',
    cyVisitorTitle: 'สมุดเยี่ยม',
    cyPhotosTitle: 'อัลบั้ม',
    cyGuestbookEmpty: 'ยังไม่มีข้อความทักทาย',
    cyVisitorEmpty: 'ยังไม่มีชื่อผู้เยี่ยม',
    cyGuestbookWriteSoon: 'พิมพ์ข้อความทักทายให้เพื่อนอิลชอน',
    cyVisitorWriteSoon: 'พิมพ์ข้อความในสมุดเยี่ยม',
    cyIlchonWriteHint: 'เฉพาะเพื่อนอิลชอนที่ผูกแล้วเท่านั้นที่โพสต์ได้',
    cyOpenWriteHint: 'สมาชิกที่ล็อกอินแล้วสามารถเซ็นสมุดเยี่ยมได้',
    cyPostSubmit: 'โพสต์',
    cyPostSubmitting: 'กำลังโพสต์…',
    cyModerationHide: 'ซ่อน',
    cyModerationUnhide: 'แสดงอีกครั้ง',
    cyModerationDelete: 'ลบ',
    cyHiddenBadge: 'ซ่อนแล้ว',
    cyPhotosEmpty: 'ยังไม่มีรูป',
    cyPhotosDefaultAlbum: 'อัลบั้มหลัก',
    cyPhotosUpload: 'อัปโหลดรูป',
    cyPhotosUploading: 'กำลังอัปโหลด…',
    cyPhotosDelete: 'ลบ',
    cyBodyMinLength: 'พิมพ์อย่างน้อย 2 ตัวอักษร',
    cyDeleteEntryConfirm: 'ลบข้อความนี้หรือไม่?',
    cyDeletePhotoConfirm: 'ลบรูปนี้หรือไม่?',
    cyPhotosAlbumCreateError: 'สร้างอัลบั้มไม่สำเร็จ',
    cyPhotosTypeError: 'อัปโหลดได้เฉพาะ JPEG, PNG, WebP, GIF',
    cyPhotosSizeError: 'ไฟล์ละสูงสุด 5MB',
    cyOwnerVisitorHint: 'ข้อความจากผู้เยี่ยม คุณสามารถซ่อน/ลบได้ในหน้าต่างนี้',
    roomEnterTitle: 'ห้องมินิโฮม',
    roomEnterLead: 'เปิด·ปิดหน้าต่างหลัก·ทักทาย·สมุดเยี่ยม·อัลบั้มแบบไซเวิลด์',
    roomEnterCta: 'เข้าห้องมินิโฮม',
    cyIntroEmpty: 'ยังไม่มีข้อความแนะนำในห้องหลัก',
    previewPanelsHint:
      'ตัวอย่าง/หน้าสาธารณะ — เปิด-ปิด ทักทาย·สมุดเยี่ยม·อัลบั้ม จากเมนูซ้าย (สไตล์หน้าต่างลอยแบบไซเวิลด์)',
    styleScoreLabel: 'สไตล์พอยต์',
    styleShopNav: 'ร้านสไตล์',
    greetCardTitle: 'ทักทายครั้งแรก',
    greetCardLead:
      'ทิ้งข้อความทักทายในสมุดเยี่ยมมินิโฮมของคุณ รับสไตล์พอยต์ — ใช้ซื้อสกินห้องหรือมินิมีได้',
    greetPlaceholder: 'เช่น สวัสดีค่ะ/ครับ ยินดีที่ได้รู้จัก',
    greetSubmit: 'ส่งทักทายและรับพอยต์',
    greetSubmitting: 'กำลังดำเนินการ…',
    greetDone: 'ทักทายต้อนรับเสร็จแล้ว',
    greetThanks: 'ได้รับสไตล์พอยต์แล้ว ลองซื้อไอเท็มแต่งมินิโฮมได้ด้านล่าง',
    styleShopTitle: 'ร้านสไตล์มินิโฮม',
    styleShopLead: 'ใช้พอยต์ซื้อโทนสีห้องและมินิมี — ซื้อแล้วใช้กับมินิโฮมทันที',
    styleShopBalance: 'พอยต์คงเหลือ',
    styleShopCatSkin: 'สกินห้อง',
    styleShopCatMinimi: 'มินิมี',
    styleShopCatBgm: 'BGM',
    styleShopCatWallpaper: 'วอลเปเปอร์',
    styleShopCatFrame: 'เฟรม',
    styleShopBuy: 'ซื้อ',
    styleShopBuyRental: 'เช่า {days} วัน',
    styleShopBuyPerm: 'ซื้อถาวร',
    styleShopEquip: 'สวมใส่',
    styleShopOwned: 'มีแล้ว',
    styleShopNeedPoints: 'โดโตริไม่พอ',
    styleShopPurchased: 'ซื้อแล้ว — ดูที่มินิโฮมได้เลย',
    styleShopEquipped: 'สวมใส่แล้ว',
    styleShopLoadError: 'โหลดร้านไม่สำเร็จ',
    styleShopEmpty: 'ยังไม่มีสินค้าในหมวดนี้',
    styleShopDaysLeft: 'D-{n}',
    styleShopRentalTag: '{days} วัน',
    styleShopPermTag: 'ถาวร',
    styleShopCheckin: 'เช็คอิน',
    styleShopCheckedIn: 'เช็คอินวันนี้แล้ว!',
    dotoriLabel: 'โดโตริ',
    styleRpcNotAuth: 'ต้องล็อกอินก่อน',
    styleRpcGreetingDone: 'รับรางวัลทักทายไปแล้ว',
    styleRpcGreetingShort: 'พิมพ์ข้อความให้ยาวขึ้นอีกนิด',
    styleRpcGreetingLong: 'ข้อความยาวเกินไป',
    styleRpcNoItem: 'ไม่มีสินค้านี้',
    styleRpcOwned: 'ซื้อไปแล้ว',
    styleRpcPoor: 'พอยต์ไม่พอ',
    styleRpcNotOwned: 'ยังไม่ได้ซื้อสินค้านี้',
    styleRpcGeneric: 'มีข้อผิดพลาด ลองใหม่ภายหลัง',
    sectionLockedIlchon: 'ส่วนนี้เปิดให้เฉพาะเพื่อน (อิลชอน)',
    sectionLockedPrivate: 'ส่วนนี้ถูกซ่อนไว้',
    cyMenuDiary: 'ไดอารี่',
    cyDiaryTitle: 'ไดอารี่',
    cyDiaryEmpty: 'ยังไม่มีไดอารี่',
    cyDiaryWrite: 'เขียนไดอารี่',
    cyDiaryWriting: 'กำลังบันทึก…',
    cyDiarySave: 'บันทึก',
    cyDiarySaved: 'บันทึกแล้ว!',
    cyDiaryDelete: 'ลบ',
    cyDiaryDeleteConfirm: 'ลบไดอารี่นี้จริงหรือ?',
    cyDiarySecret: 'ไดอารี่ลับ',
    cyDiaryMoodHappy: '😊',
    cyDiaryMoodSad: '😢',
    cyDiaryMoodAngry: '😠',
    cyDiaryMoodLove: '❤️',
    cyDiaryMoodTired: '😩',
    cyDiaryMoodNeutral: '😐',
    loadingMark: '…',
    emDash: '—',
  },
  ilchon: {
    pageTitle: 'เพื่อน (อิลชอน)',
    pageLead:
      'ส่งคำขอ — เมื่ออีกฝ่ายยอมรับ จะตั้งชื่อเรียกกันได้สองทาง ดูคำขอที่ได้รับและยอมรับ/ปฏิเสธได้ที่นี่',
    needLogin: 'ล็อกอินก่อนถึงใช้ฟีเจอร์นี้ได้',
    goLogin: 'ไปล็อกอิน',
    requestButton: 'ขอเป็นเพื่อน',
    requestTitle: 'ส่งคำขอเป็นเพื่อน',
    messageLabel: 'ข้อความ (ไม่บังคับ)',
    messagePlaceholder: 'ทักทายสั้นๆ ก็ได้',
    proposedNickLabel: 'ชื่อที่ฉันเรียกอีกฝ่าย (ไม่บังคับ)',
    proposedNickHint: 'ตอนยอมรับ อีกฝ่ายจะเห็นและแก้ได้',
    sendRequest: 'ส่งคำขอ',
    sending: 'กำลังส่ง…',
    close: 'ปิด',
    alreadyIlchon: 'เป็นเพื่อนกันแล้ว',
    pendingOutbound: 'ส่งคำขอแล้ว — รออีกฝ่ายยอมรับ',
    pendingInbound: 'มีคำขอจากอีกฝ่าย — เปิดกล่องเพื่อนดู',
    openInbox: 'เปิดกล่องเพื่อน',
    accept: 'ยอมรับ',
    reject: 'ปฏิเสธ',
    cancelRequest: 'ยกเลิกคำขอ',
    acceptTitle: 'ยืนยันเป็นเพื่อน',
    nickYouCallThem: 'ชื่อที่ฉันเรียกคนที่ขอ',
    nickTheyCallYou: 'ชื่อที่คนที่ขอจะเรียกฉัน',
    nickYouCallThemHint: 'ใช้ในมินิโฮม/รายชื่อของคุณ',
    nickTheyCallYouHint: 'ถ้าอีกฝ่ายเสนอมาแล้ว แก้หรือคงไว้ก็ได้',
    confirmAccept: 'ยืนยันเป็นเพื่อน',
    incomingTitle: 'คำขอที่ได้รับ',
    outgoingTitle: 'คำขอที่ส่งไป',
    friendsTitle: 'เพื่อนของฉัน',
    incomingEmpty: 'ยังไม่มีคำขอ',
    outgoingEmpty: 'ไม่มีคำขอที่รออยู่',
    friendsEmpty: 'ยังไม่มีเพื่อน — ลองขอจากมินิโฮม',
    youCallThemLabel: 'ชื่อที่ฉันเรียก',
    proposedFromThem: 'ชื่อที่คนขออยากเรียกคุณ (ข้อเสนอ)',
    errorGeneric: 'ไม่สำเร็จชั่วคราว ลองอีกครั้ง',
    errorPendingExists: 'มีคำขอค้างอยู่แล้ว',
    errorAlreadyIlchon: 'เป็นเพื่อนกันแล้ว',
    errorNotAuth: 'ต้องล็อกอิน',
    errorSelf: 'ส่งหาตัวเองไม่ได้',
  },
  localShop: {
    sectionIlchon: 'ทักทาย (อิลชอน)',
    sectionOpen: 'สมุดเยี่ยม',
    emptyIlchon: 'ยังไม่มีข้อความจากเพื่อน',
    emptyOpen: 'ยังไม่มีลายเซ็น',
    hintIlchon: 'เฉพาะผู้ที่เป็นอิลชอนกับเจ้าของร้านเท่านั้น',
    hintOpen: 'สมาชิกที่ล็อกอินแล้วลงชื่อได้',
    placeholderIlchon: 'ฝากข้อความถึงเพื่อนเจ้าของร้าน',
    placeholderOpen: 'ฝากข้อความในสมุดเยี่ยม',
    submit: 'โพสต์',
    submitting: 'กำลังโพสต์…',
    loginToPost: 'ล็อกอินเพื่อโพสต์',
    ownerPaused: 'ปิดรับข้อความชั่วคราว — ผู้เยี่ยมจะไม่เห็นส่วนนี้',
    ownerModerateHint: 'ซ่อน/ลบได้เฉพาะบัญชีเจ้าของร้าน',
    ilchonOnlyHint: 'เป็นอิลชอนกับเจ้าของร้านแล้วค่อยโพสต์ได้',
    noOwnerForIlchon: 'เมื่อผูกบัญชีเจ้าของร้านแล้ว จะมีทักทายแบบอิลชอน',
    hiddenBadge: 'ซ่อน',
    hide: 'ซ่อน',
    unhide: 'แสดงอีกครั้ง',
    delete: 'ลบ',
    confirmDelete: 'ลบข้อความนี้หรือไม่?',
    bodyTooShort: 'พิมพ์อย่างน้อย 2 ตัวอักษร',
    loading: 'กำลังโหลด…',
    ownerSettingsLead: 'เปิด/ปิดรับข้อความ และแสดงบล็อกในหน้ามินิโฮมได้ด้านล่าง',
    guestbookReceive: 'รับสมุดเยี่ยม·ทักทายอิลชอน',
    guestbookShowSection: 'แสดงบล็อกสมุดในหน้ามินิโฮม',
  },
  search: {
    ariaLabel: 'ค้นหาเมนูและข่าวใน Thai Ja World',
    headerBarLabel: 'ค้นหา',
    heroTitle: 'กำลังมองหาอะไรอยู่?',
    portalLead:
      'ค้นหาเมนูและหัวข้อข่าวที่เปิดเผยแบบเรียลไทม์ การอ่านเต็ม·สรุป·ลิงก์ต้นทาง·ความคิดเห็น — ต้องเข้าสู่ระบบหลังเข้าร่วม',
    placeholder: 'ค้นหา… (เช่น วีซ่า, ร้านอาหาร, กรุงเทพ, /local)',
    hint: 'พิมพ์ไทย·เกาหลี หรือส่วนพาธได้ · แสดงว่าตรงกับส่วนไหน',
    noResults: 'ไม่พบเมนูหรือข่าว — ลองคำอื่น',
    quickHeading: 'ทางลัด',
    sectionPages: 'เมนู·หน้าเว็บ',
    sectionNews: 'ข่าวอ้างอิง (หัวข้อ·สรุป)',
    badgeMember: 'เข้าสู่ระบบเพื่ออ่าน·แสดงความคิดเห็น',
    badgePublic: 'ไปทันที',
    searching: 'กำลังค้นหา…',
  },
  weather: { city: 'กรุงเทพฯ', condition: 'แจ่มใส' },
  seo: {
    defaultTitle: 'Thai Ja World (태자 월드)',
    titleTemplate: '%s | Thai Ja World',
    defaultDescription:
      'แบ่งปันข้อมูลชีวิตในไทย — ประสบการณ์·สรุป·แจ้งเรื่อง · มือสอง·งาน · ร้าน · มินิโฮม',
    homeTitle: 'หน้าแรก — Thai Ja World',
    homeDescription:
      'ชีวิตที่ไทยติดขัด — ลานคุย·ซื้อขาย·งาน·แจ้งเรื่อง·ร้าน·สรุปอ้างอิง·มินิโฮม (กำลังเตรียม)',
    boardsListDescription:
      'แชร์ชีวิตที่ไทย — รีวิว·ข้อมูล·ข้อควรระวังเวลาซื้อขาย กรุงเทพ·พัทยา',
    tradeHubDescription:
      'มือสองและงาน — แนะนำแชร์ประสบการณ์และข้อควรระวัง เข้าจากหมวดในลานชุมชนได้ทันที',
  },
  push: {
    optInTitle: '🛟 ติดขัดเมื่อไหร่ — เปิดดูสรุปสั้นๆ',
    optInLead:
      'ไม่ใช่การยินยอมรับโฆษณา แค่ส่งสรุปสั้นๆ ที่ใช้ในชีวิต ปิดแจ้งเตือนก็สมัครและใช้งานได้เหมือนเดิม',
    optInHook:
      'บ้าน·TM30·ค่ารพ ที่มักมีคำถาม อากาศกรุงเทพฯ และข่าวที่ควรรู้ — รวมเป็นข้อความเดียว สั้นๆ ทั้งไทยและเกาหลี ไม่ยัดโฆษณา เปิดแล้วได้ประโยชน์เป็นหลัก',
    optInCookie:
      'ส่งสรุปได้ต้องอนุญาตแจ้งเตือนและเก็บค่าที่จำเป็นนิดหน่อย (คุกกี้) เท่านั้น ไม่สบายใจปิดจากการ์ดนี้หรือตั้งค่าเบราว์เซอร์ได้ทุกเมื่อ',
    enable: 'รับสรุปสั้นๆ',
    disable: 'ปิดแจ้งเตือนสรุปอย่างเดียว',
    dismiss: 'ไว้ทีหลังนะ',
    needLogin: 'เปิดได้หลังล็อกอินและยืนยันอีเมลเรียบร้อยแล้ว',
    notSupported:
      'เบราว์เซอร์หรือเครื่องนี้อาจยังไม่รองรับแจ้งเตือนแบบเว็บ iPhone ลองเพิ่มไปหน้าโฮมแล้วเปิด มักใช้ได้ ไม่เป็นไรถ้ายังไม่ได้—ใช้เว็บต่อได้ตามปกติ',
    working: 'รอแป๊บนึง…',
    enabledOk: 'จัดสรุปให้ ส่งสั้นๆ ไม่รบกวน',
    error: 'ตอนนี้ยังไม่สำเร็จ ลองกดใหม่ทีหลังนะ',
    permissionDenied:
      'แจ้งเตือนถูกปิดอยู่ ถ้าอยากเปลี่ยน กดแม่กุญแจข้างแถบที่อยู่แล้วอนุญาตแจ้งเตือน ปิดไว้ก็ใช้เว็บได้เหมือนเดิม',
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return locale === 'th' ? th : ko;
}
