'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_SITE_DISPLAY_NAME } from '@/lib/site-brand/constants';

const SiteBrandContext = createContext<string>(DEFAULT_SITE_DISPLAY_NAME);

export function SiteBrandProvider({
  initialDisplayName,
  children,
}: {
  initialDisplayName: string;
  children: ReactNode;
}) {
  const [name, setName] = useState(() => {
    const t = initialDisplayName?.trim();
    return t && t.length > 0 ? t : DEFAULT_SITE_DISPLAY_NAME;
  });

  useEffect(() => {
    const t = initialDisplayName?.trim();
    setName(t && t.length > 0 ? t : DEFAULT_SITE_DISPLAY_NAME);
  }, [initialDisplayName]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/site-settings', { cache: 'no-store' });
        if (!r.ok || !alive) return;
        const j = (await r.json()) as { site_display_name?: string };
        const t = j.site_display_name?.trim();
        if (t && alive) setName(t);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return <SiteBrandContext.Provider value={name}>{children}</SiteBrandContext.Provider>;
}

export function useSiteDisplayName(): string {
  return useContext(SiteBrandContext);
}
