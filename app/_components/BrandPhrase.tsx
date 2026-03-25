/**
 * '태국에 살자' — '태'·'자'만 크기·색 강조 (브랜드 약자 태자가 한눈에)
 */
export type BrandPhraseVariant = 'light' | 'dark';

export function BrandPhrase({ variant = 'light' }: { variant?: BrandPhraseVariant }) {
  const root =
    'brand-phrase' + (variant === 'dark' ? ' brand-phrase--dark' : '');
  return (
    <span className={root} translate="no" lang="ko">
      <span className="brand-phrase__tai">태</span>
      <span className="brand-phrase__mid">국에 살</span>
      <span className="brand-phrase__ja">자</span>
    </span>
  );
}
