'use client';

import { useMemo } from 'react';
import { useGlobalLanguage } from '@/contexts/GlobalLanguageContext';
import { useSiteDisplayName } from '@/contexts/SiteBrandContext';
import { mergeDictionarySiteBrand } from '@/lib/site-brand/mergeDictionaryBrand';

/** 클라 전용 페이지(/auth 등)에서 쿠키·언어 전환 이벤트와 맞춘 사전 */
export function useClientLocaleDictionary() {
  const { locale, dict: raw } = useGlobalLanguage();
  const siteName = useSiteDisplayName();
  const d = useMemo(() => mergeDictionarySiteBrand(raw, siteName), [raw, siteName]);
  return { locale, d };
}
