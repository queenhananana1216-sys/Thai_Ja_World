'use client';

/**
 * Turnstile 미설정 시 아무것도 안 그림. 설정 시에만 스크립트 로드.
 */
import { useEffect, useRef, useState, type MutableRefObject } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          /** 만료 직전 자동 재발급 — 방치 후 로그인 시 timeout-or-duplicate 완화 */
          'refresh-expired'?: 'auto' | 'manual' | 'never';
        },
      ) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';

type Props = {
  tokenRef: MutableRefObject<string | null>;
  loadingLabel: string;
};

export default function TurnstileField({ tokenRef, loadingLabel }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!SITE_KEY || !hostRef.current) return;

    let cancelled = false;
    const el = hostRef.current;

    function loadScript(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (window.turnstile) {
          resolve();
          return;
        }
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('turnstile script'));
        document.head.appendChild(s);
      });
    }

    void (async () => {
      try {
        await loadScript();
        if (cancelled || !window.turnstile || !hostRef.current) return;
        const id = window.turnstile.render(hostRef.current, {
          sitekey: SITE_KEY,
          'refresh-expired': 'auto',
          callback: (t) => {
            tokenRef.current = t;
          },
          'error-callback': () => {
            tokenRef.current = null;
          },
          'expired-callback': () => {
            tokenRef.current = null;
          },
        });
        widgetIdRef.current = id;
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) tokenRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
      tokenRef.current = null;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
      }
      widgetIdRef.current = null;
      el.innerHTML = '';
    };
  }, [tokenRef]);

  if (!SITE_KEY) {
    return null;
  }

  return (
    <div style={{ marginTop: 12, marginBottom: 8 }}>
      <div ref={hostRef} />
      {!ready && (
        <p style={{ fontSize: '0.75rem', color: 'var(--tj-muted)' }}>{loadingLabel}</p>
      )}
    </div>
  );
}
