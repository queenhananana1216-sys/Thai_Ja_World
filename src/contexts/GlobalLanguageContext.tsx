'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getDictionary, preloadDictionary, type Dictionary } from '@/i18n/dictionaries';
import { dictionary as koStatic } from '@/i18n/locales/ko';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import { TJ_LOCALE_CHANGE_EVENT, type Locale } from '@/i18n/types';

type GlobalLanguageContextValue = {
  locale: Locale;
  dict: Dictionary;
  setLocale: (next: Locale) => Promise<boolean>;
  /** 언어 팩 청크를 받는 중 (전환 직후 이전 dict 유지로 깜빡임 최소화) */
  dictLoading: boolean;
};

const GlobalLanguageContext = createContext<GlobalLanguageContextValue | null>(null);

export function GlobalLanguageProvider({
  children,
  initialLocale,
  initialDictionary,
}: {
  children: ReactNode;
  initialLocale: Locale;
  initialDictionary: Dictionary;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dict, setDict] = useState<Dictionary>(initialDictionary);
  const [dictLoading, setDictLoading] = useState(false);

  useLayoutEffect(() => {
    setLocaleState(readLocaleCookie());
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (locale === initialLocale) {
      setDict(initialDictionary);
      setDictLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setDictLoading(true);
    preloadDictionary(locale);
    void getDictionary(locale).then((d) => {
      if (!cancelled) {
        setDict(d);
        setDictLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [locale, initialLocale, initialDictionary]);

  const setLocale = useCallback(
    async (next: Locale): Promise<boolean> => {
      if (next === locale) return true;
      preloadDictionary(next);
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
    () => ({ locale, dict, setLocale, dictLoading }),
    [locale, dict, setLocale, dictLoading],
  );

  return <GlobalLanguageContext.Provider value={value}>{children}</GlobalLanguageContext.Provider>;
}

export function useGlobalLanguage() {
  const ctx = useContext(GlobalLanguageContext);
  if (ctx) return ctx;
  return {
    locale: 'ko' as Locale,
    dict: koStatic,
    setLocale: async () => false,
    dictLoading: false,
  };
}
