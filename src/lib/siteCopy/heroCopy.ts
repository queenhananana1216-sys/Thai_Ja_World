import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import {
  getMergedDefaultsFromI18n,
  SITE_COPY_HOME_KEYS,
  type MergedHeroSiteCopy,
} from '@/lib/siteCopy/heroCopyDefaults';
import { createServerClient } from '@/lib/supabase/server';

export type {
  HeroSiteCopyKey,
  MainHomeSiteCopyKey,
  MergedHeroSiteCopy,
  SiteCopyHomeKey,
} from '@/lib/siteCopy/heroCopyDefaults';
export { HERO_SITE_COPY_KEYS, MAIN_HOME_SITE_COPY_KEYS, SITE_COPY_HOME_KEYS } from '@/lib/siteCopy/heroCopyDefaults';

/** 레이아웃 SSR용 — 테이블·네트워크 오류 시 i18n 기본값 */
export async function fetchMergedHeroSiteCopy(): Promise<MergedHeroSiteCopy> {
  noStore();
  const defaults = getMergedDefaultsFromI18n();
  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('site_copy')
      .select('key, locale, value')
      .in('key', [...SITE_COPY_HOME_KEYS]);

    if (error || !data?.length) {
      return defaults;
    }

    const row = (k: string, loc: string) =>
      data.find((r) => r.key === k && r.locale === loc)?.value?.trim();

    return {
      brandTai: row('home_hero_brand_tai', 'ko') || defaults.brandTai,
      brandMid: row('home_hero_brand_mid', 'ko') || defaults.brandMid,
      brandSuffix: row('home_hero_brand_suffix', 'ko') || defaults.brandSuffix,
      titleKo: row('home_hero_title', 'ko') || defaults.titleKo,
      titleTh: row('home_hero_title', 'th') || defaults.titleTh,
      tagKo: row('home_hero_tag', 'ko') || defaults.tagKo,
      tagTh: row('home_hero_tag', 'th') || defaults.tagTh,
      heroKickerKo: row('home_hero_kicker', 'ko') || defaults.heroKickerKo,
      heroKickerTh: row('home_hero_kicker', 'th') || defaults.heroKickerTh,
      heroLeadKo: row('home_hero_lead', 'ko') || defaults.heroLeadKo,
      heroLeadTh: row('home_hero_lead', 'th') || defaults.heroLeadTh,
      heroSubKo: row('home_hero_sub', 'ko') || defaults.heroSubKo,
      heroSubTh: row('home_hero_sub', 'th') || defaults.heroSubTh,
      guestPublicLabelKo: row('home_guest_public_label', 'ko') || defaults.guestPublicLabelKo,
      guestPublicLabelTh: row('home_guest_public_label', 'th') || defaults.guestPublicLabelTh,
      guestPublicBodyKo: row('home_guest_public_body', 'ko') || defaults.guestPublicBodyKo,
      guestPublicBodyTh: row('home_guest_public_body', 'th') || defaults.guestPublicBodyTh,
      guestMemberLabelKo: row('home_guest_member_label', 'ko') || defaults.guestMemberLabelKo,
      guestMemberLabelTh: row('home_guest_member_label', 'th') || defaults.guestMemberLabelTh,
      guestMemberBodyKo: row('home_guest_member_body', 'ko') || defaults.guestMemberBodyKo,
      guestMemberBodyTh: row('home_guest_member_body', 'th') || defaults.guestMemberBodyTh,
      guestLoginCtaKo: row('home_guest_login_cta', 'ko') || defaults.guestLoginCtaKo,
      guestLoginCtaTh: row('home_guest_login_cta', 'th') || defaults.guestLoginCtaTh,
      hotLabelKo: row('home_hot_label', 'ko') || defaults.hotLabelKo,
      hotLabelTh: row('home_hot_label', 'th') || defaults.hotLabelTh,
      hotFootnoteKo: row('home_hot_footnote', 'ko') || defaults.hotFootnoteKo,
      hotFootnoteTh: row('home_hot_footnote', 'th') || defaults.hotFootnoteTh,
    };
  } catch {
    return defaults;
  }
}
