'use client';

/**
 * 브랜드 한 줄 — DB(site_copy) 또는 i18n 기본: 첫·끝 글자 강조 (태·자)
 */
import { useHeroSiteCopy } from '@/contexts/HeroSiteCopyContext';

export type BrandPhraseVariant = 'light' | 'dark';

export function BrandPhrase({ variant = 'light' }: { variant?: BrandPhraseVariant }) {
  const { brandTai, brandMid, brandSuffix } = useHeroSiteCopy();
  const root =
    'brand-phrase' + (variant === 'dark' ? ' brand-phrase--dark' : '');
  return (
    <span className={root} translate="no" lang="ko">
      <span className="brand-phrase__tai">{brandTai}</span>
      <span className="brand-phrase__mid">{brandMid}</span>
      <span className="brand-phrase__ja">{brandSuffix}</span>
    </span>
  );
}
