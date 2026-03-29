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

export type HeroSiteCopyKey = (typeof HERO_SITE_COPY_KEYS)[number];

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
  };
}
