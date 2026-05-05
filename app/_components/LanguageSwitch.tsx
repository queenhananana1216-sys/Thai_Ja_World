'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { useGlobalLanguage } from '@/contexts/GlobalLanguageContext';
import { preloadDictionary } from '@/i18n/dictionaries';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import type { Locale } from '@/i18n/types';

type Props = {
  labels: { ko: string; th: string };
};

export default function LanguageSwitch({ labels }: Props) {
  const { locale, setLocale: setGlobalLocale } = useGlobalLanguage();
  const [active, setActive] = useState<Locale>('ko');

  useLayoutEffect(() => {
    setActive(readLocaleCookie());
  }, []);

  useEffect(() => {
    setActive(locale);
  }, [locale]);

  async function setLocale(next: Locale) {
    if (next === active) return;
    const ok = await setGlobalLocale(next);
    if (!ok) return;
    setActive(next);
  }

  return (
    <div
      className="lang-switch"
      role="group"
      aria-label="언어 / Language"
    >
      <button
        type="button"
        className={'lang-switch__btn' + (active === 'ko' ? ' lang-switch__btn--active' : '')}
        onMouseEnter={() => preloadDictionary('ko')}
        onClick={() => void setLocale('ko')}
      >
        {labels.ko}
      </button>
      <button
        type="button"
        className={'lang-switch__btn' + (active === 'th' ? ' lang-switch__btn--active' : '')}
        onMouseEnter={() => preloadDictionary('th')}
        onClick={() => void setLocale('th')}
      >
        {labels.th}
      </button>
    </div>
  );
}
