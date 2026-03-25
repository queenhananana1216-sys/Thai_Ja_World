'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { getDictionary } from '@/i18n/dictionaries';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import { TJ_LOCALE_CHANGE_EVENT, type Locale } from '@/i18n/types';

/** 클라 전용 페이지(/auth 등)에서 쿠키·언어 전환 이벤트와 맞춘 사전 */
export function useClientLocaleDictionary() {
  const [locale, setLocale] = useState<Locale>('ko');

  useLayoutEffect(() => {
    setLocale(readLocaleCookie());
  }, []);

  useEffect(() => {
    function onLocaleChange(e: Event) {
      const ce = e as CustomEvent<Locale>;
      if (ce.detail === 'ko' || ce.detail === 'th') setLocale(ce.detail);
    }
    window.addEventListener(TJ_LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(TJ_LOCALE_CHANGE_EVENT, onLocaleChange);
  }, []);

  const d = useMemo(() => getDictionary(locale), [locale]);
  return { locale, d };
}
