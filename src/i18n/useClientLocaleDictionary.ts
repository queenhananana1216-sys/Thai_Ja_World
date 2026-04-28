'use client';

import { useGlobalLanguage } from '@/contexts/GlobalLanguageContext';

/** 클라 전용 페이지(/auth 등)에서 쿠키·언어 전환 이벤트와 맞춘 사전 */
export function useClientLocaleDictionary() {
  const { locale, dict } = useGlobalLanguage();
  return { locale, d: dict };
}
