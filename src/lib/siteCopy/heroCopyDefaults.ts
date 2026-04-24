import { getDictionary } from '@/i18n/dictionaries';

export const HERO_SITE_COPY_KEYS = [
  'home_hero_brand_tai',
  'home_hero_brand_mid',
  'home_hero_brand_suffix',
  'home_hero_title',
  'home_hero_tag',
  'home_hero_kicker',
  'home_hero_lead',
  'home_hero_sub',
] as const;

/** 히어로 아래 — 비회원 안내 카드·한 줄 제보(핫) 띠 */
export const MAIN_HOME_SITE_COPY_KEYS = [
  'home_guest_public_label',
  'home_guest_public_body',
  'home_guest_member_label',
  'home_guest_member_body',
  'home_guest_login_cta',
  'home_hot_label',
  'home_hot_footnote',
] as const;

/** 히어로 안 연한 박스 — 미니홈 티저 문단(조각별, 링크 구간 포함) */
export const DREAM_HOME_SITE_COPY_KEYS = [
  'home_dream_intro',
  'home_dream_minihome',
  'home_dream_mid',
  'home_dream_personal',
  'home_dream_outro',
] as const;

/** 랜딩 Problem / Service / Testimonial — `site_copy` 한 행(ko)에 JSON */
export const LANDING_PAGE_COPY_JSON_KEY = 'home_landing_sections' as const;

export const SITE_COPY_HOME_KEYS = [
  ...HERO_SITE_COPY_KEYS,
  ...MAIN_HOME_SITE_COPY_KEYS,
  ...DREAM_HOME_SITE_COPY_KEYS,
  LANDING_PAGE_COPY_JSON_KEY,
] as const;

export type HeroSiteCopyKey = (typeof HERO_SITE_COPY_KEYS)[number];
export type MainHomeSiteCopyKey = (typeof MAIN_HOME_SITE_COPY_KEYS)[number];
export type DreamHomeSiteCopyKey = (typeof DREAM_HOME_SITE_COPY_KEYS)[number];
export type SiteCopyHomeKey = (typeof SITE_COPY_HOME_KEYS)[number];

export type MergedHeroSiteCopy = {
  brandTai: string;
  brandMid: string;
  brandSuffix: string;
  titleKo: string;
  titleTh: string;
  tagKo: string;
  tagTh: string;
  heroKickerKo: string;
  heroKickerTh: string;
  heroLeadKo: string;
  heroLeadTh: string;
  heroSubKo: string;
  heroSubTh: string;
  guestPublicLabelKo: string;
  guestPublicLabelTh: string;
  guestPublicBodyKo: string;
  guestPublicBodyTh: string;
  guestMemberLabelKo: string;
  guestMemberLabelTh: string;
  guestMemberBodyKo: string;
  guestMemberBodyTh: string;
  guestLoginCtaKo: string;
  guestLoginCtaTh: string;
  hotLabelKo: string;
  hotLabelTh: string;
  hotFootnoteKo: string;
  hotFootnoteTh: string;
  dreamIntroKo: string;
  dreamIntroTh: string;
  dreamMinihomeKo: string;
  dreamMinihomeTh: string;
  dreamMidKo: string;
  dreamMidTh: string;
  dreamPersonalKo: string;
  dreamPersonalTh: string;
  dreamOutroKo: string;
  dreamOutroTh: string;
};

export function getMergedDefaultsFromI18n(): MergedHeroSiteCopy {
  const ko = getDictionary('ko').home;
  const th = getDictionary('th').home;
  return {
    brandTai: '태',
    brandMid: '국에 살',
    brandSuffix: '자',
    titleKo: ko.title,
    titleTh: th.title,
    tagKo: ko.tag,
    tagTh: th.tag,
    heroKickerKo: ko.heroKicker,
    heroKickerTh: th.heroKicker,
    heroLeadKo: ko.heroLead,
    heroLeadTh: th.heroLead,
    heroSubKo: ko.heroSub,
    heroSubTh: th.heroSub,
    guestPublicLabelKo: ko.guestHomePublicLabel,
    guestPublicLabelTh: th.guestHomePublicLabel,
    guestPublicBodyKo: ko.guestHomePublicBody,
    guestPublicBodyTh: th.guestHomePublicBody,
    guestMemberLabelKo: ko.guestHomeMemberLabel,
    guestMemberLabelTh: th.guestHomeMemberLabel,
    guestMemberBodyKo: ko.guestHomeMemberBody,
    guestMemberBodyTh: th.guestHomeMemberBody,
    guestLoginCtaKo: ko.guestHomeLoginCta,
    guestLoginCtaTh: th.guestHomeLoginCta,
    hotLabelKo: ko.hotLabel,
    hotLabelTh: th.hotLabel,
    hotFootnoteKo: ko.hotFootnote,
    hotFootnoteTh: th.hotFootnote,
    dreamIntroKo: ko.dreamIntro,
    dreamIntroTh: th.dreamIntro,
    dreamMinihomeKo: ko.dreamMinihome,
    dreamMinihomeTh: th.dreamMinihome,
    dreamMidKo: ko.dreamMid,
    dreamMidTh: th.dreamMid,
    dreamPersonalKo: ko.dreamPersonal,
    dreamPersonalTh: th.dreamPersonal,
    dreamOutroKo: ko.dreamOutro,
    dreamOutroTh: th.dreamOutro,
  };
}

/** 관리자 폼 초기값 — DB 덮어쓰기 전 i18n·브랜드 기본 */
export function adminHomeSiteCopyInitialRecord(defaults: MergedHeroSiteCopy): Record<string, string> {
  return {
    'home_hero_brand_tai:ko': defaults.brandTai,
    'home_hero_brand_mid:ko': defaults.brandMid,
    'home_hero_brand_suffix:ko': defaults.brandSuffix,
    'home_hero_title:ko': defaults.titleKo,
    'home_hero_title:th': defaults.titleTh,
    'home_hero_tag:ko': defaults.tagKo,
    'home_hero_tag:th': defaults.tagTh,
    'home_hero_kicker:ko': defaults.heroKickerKo,
    'home_hero_kicker:th': defaults.heroKickerTh,
    'home_hero_lead:ko': defaults.heroLeadKo,
    'home_hero_lead:th': defaults.heroLeadTh,
    'home_hero_sub:ko': defaults.heroSubKo,
    'home_hero_sub:th': defaults.heroSubTh,
    'home_guest_public_label:ko': defaults.guestPublicLabelKo,
    'home_guest_public_label:th': defaults.guestPublicLabelTh,
    'home_guest_public_body:ko': defaults.guestPublicBodyKo,
    'home_guest_public_body:th': defaults.guestPublicBodyTh,
    'home_guest_member_label:ko': defaults.guestMemberLabelKo,
    'home_guest_member_label:th': defaults.guestMemberLabelTh,
    'home_guest_member_body:ko': defaults.guestMemberBodyKo,
    'home_guest_member_body:th': defaults.guestMemberBodyTh,
    'home_guest_login_cta:ko': defaults.guestLoginCtaKo,
    'home_guest_login_cta:th': defaults.guestLoginCtaTh,
    'home_hot_label:ko': defaults.hotLabelKo,
    'home_hot_label:th': defaults.hotLabelTh,
    'home_hot_footnote:ko': defaults.hotFootnoteKo,
    'home_hot_footnote:th': defaults.hotFootnoteTh,
    'home_dream_intro:ko': defaults.dreamIntroKo,
    'home_dream_intro:th': defaults.dreamIntroTh,
    'home_dream_minihome:ko': defaults.dreamMinihomeKo,
    'home_dream_minihome:th': defaults.dreamMinihomeTh,
    'home_dream_mid:ko': defaults.dreamMidKo,
    'home_dream_mid:th': defaults.dreamMidTh,
    'home_dream_personal:ko': defaults.dreamPersonalKo,
    'home_dream_personal:th': defaults.dreamPersonalTh,
    'home_dream_outro:ko': defaults.dreamOutroKo,
    'home_dream_outro:th': defaults.dreamOutroTh,
  };
}
