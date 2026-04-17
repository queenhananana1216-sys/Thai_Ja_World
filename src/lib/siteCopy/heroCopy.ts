import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import {
  getMergedDefaultsFromI18n,
  SITE_COPY_HOME_KEYS,
  type MergedHeroSiteCopy,
} from '@/lib/siteCopy/heroCopyDefaults';
import { createServerClient } from '@/lib/supabase/server';

export type {
  DreamHomeSiteCopyKey,
  HeroSiteCopyKey,
  MainHomeSiteCopyKey,
  MergedHeroSiteCopy,
  SiteCopyHomeKey,
} from '@/lib/siteCopy/heroCopyDefaults';
export {
  DREAM_HOME_SITE_COPY_KEYS,
  HERO_SITE_COPY_KEYS,
  MAIN_HOME_SITE_COPY_KEYS,
  SITE_COPY_HOME_KEYS,
} from '@/lib/siteCopy/heroCopyDefaults';

const KO_NOISY_HOME_COPY_PATTERNS: RegExp[] = [
  /태국에\s*사는\s*한국인\s*\d+\s*명/i,
  /아직도\s*채팅방/i,
  /채팅방이\s*아닌/i,
];

function shouldUseDefaultHomeCopy(key: string, locale: string, value: string | null | undefined): boolean {
  const v = value?.trim();
  if (!v) return true;

  if (locale === 'ko' && key.startsWith('home_hero_')) {
    return KO_NOISY_HOME_COPY_PATTERNS.some((pattern) => pattern.test(v));
  }
  return false;
}

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

    const row = (k: string, loc: string, fallback: string) => {
      const candidate = data.find((r) => r.key === k && r.locale === loc)?.value?.trim();
      return shouldUseDefaultHomeCopy(k, loc, candidate) ? fallback : (candidate ?? fallback);
    };

    return {
      brandTai: row('home_hero_brand_tai', 'ko', defaults.brandTai),
      brandMid: row('home_hero_brand_mid', 'ko', defaults.brandMid),
      brandSuffix: row('home_hero_brand_suffix', 'ko', defaults.brandSuffix),
      titleKo: row('home_hero_title', 'ko', defaults.titleKo),
      titleTh: row('home_hero_title', 'th', defaults.titleTh),
      tagKo: row('home_hero_tag', 'ko', defaults.tagKo),
      tagTh: row('home_hero_tag', 'th', defaults.tagTh),
      heroKickerKo: row('home_hero_kicker', 'ko', defaults.heroKickerKo),
      heroKickerTh: row('home_hero_kicker', 'th', defaults.heroKickerTh),
      heroLeadKo: row('home_hero_lead', 'ko', defaults.heroLeadKo),
      heroLeadTh: row('home_hero_lead', 'th', defaults.heroLeadTh),
      heroSubKo: row('home_hero_sub', 'ko', defaults.heroSubKo),
      heroSubTh: row('home_hero_sub', 'th', defaults.heroSubTh),
      guestPublicLabelKo: row('home_guest_public_label', 'ko', defaults.guestPublicLabelKo),
      guestPublicLabelTh: row('home_guest_public_label', 'th', defaults.guestPublicLabelTh),
      guestPublicBodyKo: row('home_guest_public_body', 'ko', defaults.guestPublicBodyKo),
      guestPublicBodyTh: row('home_guest_public_body', 'th', defaults.guestPublicBodyTh),
      guestMemberLabelKo: row('home_guest_member_label', 'ko', defaults.guestMemberLabelKo),
      guestMemberLabelTh: row('home_guest_member_label', 'th', defaults.guestMemberLabelTh),
      guestMemberBodyKo: row('home_guest_member_body', 'ko', defaults.guestMemberBodyKo),
      guestMemberBodyTh: row('home_guest_member_body', 'th', defaults.guestMemberBodyTh),
      guestLoginCtaKo: row('home_guest_login_cta', 'ko', defaults.guestLoginCtaKo),
      guestLoginCtaTh: row('home_guest_login_cta', 'th', defaults.guestLoginCtaTh),
      hotLabelKo: row('home_hot_label', 'ko', defaults.hotLabelKo),
      hotLabelTh: row('home_hot_label', 'th', defaults.hotLabelTh),
      hotFootnoteKo: row('home_hot_footnote', 'ko', defaults.hotFootnoteKo),
      hotFootnoteTh: row('home_hot_footnote', 'th', defaults.hotFootnoteTh),
      dreamIntroKo: row('home_dream_intro', 'ko', defaults.dreamIntroKo),
      dreamIntroTh: row('home_dream_intro', 'th', defaults.dreamIntroTh),
      dreamMinihomeKo: row('home_dream_minihome', 'ko', defaults.dreamMinihomeKo),
      dreamMinihomeTh: row('home_dream_minihome', 'th', defaults.dreamMinihomeTh),
      dreamMidKo: row('home_dream_mid', 'ko', defaults.dreamMidKo),
      dreamMidTh: row('home_dream_mid', 'th', defaults.dreamMidTh),
      dreamPersonalKo: row('home_dream_personal', 'ko', defaults.dreamPersonalKo),
      dreamPersonalTh: row('home_dream_personal', 'th', defaults.dreamPersonalTh),
      dreamOutroKo: row('home_dream_outro', 'ko', defaults.dreamOutroKo),
      dreamOutroTh: row('home_dream_outro', 'th', defaults.dreamOutroTh),
    };
  } catch {
    return defaults;
  }
}
