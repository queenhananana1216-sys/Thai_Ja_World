/**
 * UI 문자열 — shape only. Locale payloads: ./locales/*.ts
 */
export type Dictionary = {
  nav: {
    home: string;
    /** 공개 꿀팁 허브 (/tips) */
    tips: string;
    local: string;
    /** 통합 게시판 허브 (/boards) */
    boards: string;
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
  /** 헤더·푸터 한 줄 로고 텍스트 */
  brandLockup: string;
  logoAria: string;
  lang: { ko: string; th: string; en: string; zh: string };
  footer: string;
  /** 홈 하단·푸터 고정 링크 라벨 */
  footerNav: {
    terms: string;
    privacy: string;
    contact: string;
    ads: string;
  };
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
    /** 인사이트·대비책 카드 제목 */
    newsDetailInsightCardTitle: string;
    newsDetailImpactLabel: string;
    newsDetailCounterLabel: string;
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
    /** /news 허브 — 카드에서 상세로 */
    newsHubOpenDetail: string;
    /** /news 허브 상단 — 꿀팁(/tips)과 구분 */
    newsHubCrossLinkTips: string;
    /** 플레이스홀더 {n} = 현재 목록 건수 */
    newsHubListingNote: string;
    /** 홈 히어로 보조 CTA → /news */
    newsHubHeroCta: string;
    /** 홈 속보 블록 «더보기» → /news */
    newsHubSectionMore: string;
    /** 뉴스 상세 상단 «목록으로» */
    newsDetailBackToHub: string;
    /** /my-local-shop — 연결된 가게 없을 때 안내 문단 */
    myLocalShopEmptyFollowup: string;
    /** /my-local-shop — 문의 페이지로 */
    myLocalShopContactCta: string;
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
    fallbackLead: string;
    fallbackChecklistTitle: string;
    fallbackCautionsTitle: string;
    fallbackSourceLabel: string;
    backToList: string;
    /** 꿀팁 허브 하단 — 뉴스 스냅샷과 구분 */
    crossLinkNewsHub: string;
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
    /** 게시글 상세 — AI 부가 인사이트 블록 */
    aiInsightBlockTitle: string;
    aiInsightSummaryLabel: string;
    aiInsightImpactLabel: string;
    aiInsightCounterLabel: string;
    aiInsightFeedBadge: string;
    aiInsightFeedUrgent: string;
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
    /** 영문·숫자·특수문자 — 클라이언트 검증·Supabase 정책 에러 치환 공통 */
    passwordNeedLetterDigitSymbol: string;
    passwordBanned: string;
    emailRequired: string;
    emailInvalid: string;
    nickTooLong: string;
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
    /** /shop 프리미엄 부티크 안내 링크 라벨 */
    styleShopPremiumBoutiqueLink: string;
    /** 짧은 네비 라벨 */
    styleShopBoutiqueNav: string;
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
    thaiLabel: string;
    styleRpcNotAuth: string;
    styleRpcGreetingDone: string;
    styleRpcGreetingShort: string;
    styleRpcGreetingLong: string;
    styleRpcNoItem: string;
    styleRpcOwned: string;
    styleRpcPoor: string;
    styleRpcRentalUnavailable: string;
    styleRpcTierDays: string;
    styleRpcTierGrade: string;
    styleRpcAbuseHold: string;
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
    searchTitle: string;
    searchPlaceholder: string;
    searchButton: string;
    searching: string;
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
    visitMinihome: string;
    lastSeenLabel: string;
    lastSeenUnknown: string;
    onlineNow: string;
    notesTitle: string;
    notesEmpty: string;
    notesUnreadPrefix: string;
    openChat: string;
    chatWithPrefix: string;
    chatEmpty: string;
    youLabel: string;
    dmPlaceholder: string;
    dmSend: string;
    dmSending: string;
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
  /** 미션·통합 피드 등 DB 영문 원문 → ko/th 치환 */
  quests: {
    feedPhraseMap: { en: string; ko: string; th: string }[];
  };
  /** 정적 안내 페이지 (/terms, /privacy, /contact, /ads) */
  policy: {
    termsTitle: string;
    termsBody: string;
    privacyTitle: string;
    privacyBody: string;
    contactTitle: string;
    contactBody: string;
    adsTitle: string;
    adsBody: string;
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

