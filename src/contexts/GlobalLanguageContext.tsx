'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { getDictionary, type Dictionary } from '@/i18n/dictionaries';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import { TJ_LOCALE_CHANGE_EVENT, type Locale } from '@/i18n/types';

type GlobalLanguageContextValue = {
  locale: Locale;
  dict: Dictionary;
  setLocale: (next: Locale) => Promise<boolean>;
};

const GlobalLanguageContext = createContext<GlobalLanguageContextValue | null>(null);

export function GlobalLanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useLayoutEffect(() => {
    setLocaleState(readLocaleCookie());
  }, []);

  const setLocale = useCallback(
    async (next: Locale): Promise<boolean> => {
      if (next === locale) return true;
      const res = await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
      if (!res.ok) return false;
      setLocaleState(next);
      window.dispatchEvent(new CustomEvent<Locale>(TJ_LOCALE_CHANGE_EVENT, { detail: next }));
      return true;
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, dict: getDictionary(locale), setLocale }),
    [locale, setLocale],
  );

  return <GlobalLanguageContext.Provider value={value}>{children}</GlobalLanguageContext.Provider>;
}

export function useGlobalLanguage() {
  const ctx = useContext(GlobalLanguageContext);
  if (!ctx) {
    throw new Error('useGlobalLanguage must be used within GlobalLanguageProvider');
  }
  return ctx;
}
