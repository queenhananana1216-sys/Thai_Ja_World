'use client';

import { useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import { TJ_LOCALE_CHANGE_EVENT, type Locale } from '@/i18n/types';

type Props = {
  labels: { ko: string; th: string };
};

export default function LanguageSwitch({ labels }: Props) {
  const router = useRouter();
  const [active, setActive] = useState<Locale>('ko');

  useLayoutEffect(() => {
    setActive(readLocaleCookie());
  }, []);

  async function setLocale(next: Locale) {
    if (next === active) return;
    const res = await fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: next }),
    });
    if (!res.ok) return;
    setActive(next);
    window.dispatchEvent(
      new CustomEvent<Locale>(TJ_LOCALE_CHANGE_EVENT, { detail: next }),
    );
    router.refresh();
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
        onClick={() => void setLocale('ko')}
      >
        {labels.ko}
      </button>
      <button
        type="button"
        className={'lang-switch__btn' + (active === 'th' ? ' lang-switch__btn--active' : '')}
        onClick={() => void setLocale('th')}
      >
        {labels.th}
      </button>
    </div>
  );
}
