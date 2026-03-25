'use client';

/**
 * 일일 뉴스 웹 푸시 옵트인 — 로그인·가입 화면에 선택적으로 표시
 */
import { useCallback, useEffect, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { createBrowserClient } from '@/lib/supabase/client';

const DISMISS_KEY = 'tj_daily_push_optin_dismissed';
const OPT_IN_COOKIE = 'tj_daily_push_opt_in';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function setOptInCookie() {
  document.cookie = `${OPT_IN_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearOptInCookie() {
  document.cookie = `${OPT_IN_COOKIE}=; path=/; max-age=0`;
}

type Phase = 'idle' | 'on' | 'unsupported';

export default function DailyNewsPushOptIn() {
  const { d } = useClientLocaleDictionary();
  const p = d.push;
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  const refreshState = useCallback(async () => {
    if (!VAPID_PUBLIC || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPhase('unsupported');
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setPhase('unsupported');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      setPhase(sub ? 'on' : 'idle');
    } catch {
      setPhase('idle');
    }
  }, []);

  useEffect(() => {
    if (!mounted || dismissed || !VAPID_PUBLIC) return;
    void refreshState();
  }, [mounted, dismissed, refreshState]);

  const onDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const onEnable = async () => {
    setMsg(null);
    if (!VAPID_PUBLIC) return;

    const sb = createBrowserClient();
    const { data: sess } = await sb.auth.getSession();
    if (!sess.session?.access_token) {
      setMsg(p.needLogin);
      return;
    }

    setWorking(true);
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await reg.update();
      const ready = await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setMsg(p.permissionDenied);
        return;
      }

      const sub = await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error('bad_subscription');
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sess.session.access_token}`,
        },
        body: JSON.stringify({ subscription: json }),
      });

      if (!res.ok) {
        throw new Error('subscribe_api');
      }

      setOptInCookie();
      setPhase('on');
      setMsg(p.enabledOk);
    } catch {
      setMsg(p.error);
    } finally {
      setWorking(false);
    }
  };

  const onDisable = async () => {
    setMsg(null);
    setWorking(true);
    try {
      const sb = createBrowserClient();
      const { data: sess } = await sb.auth.getSession();
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub && sess.session?.access_token) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sess.session.access_token}`,
          },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      clearOptInCookie();
      setPhase('idle');
    } catch {
      setMsg(p.error);
    } finally {
      setWorking(false);
    }
  };

  if (!mounted || dismissed || !VAPID_PUBLIC) {
    return null;
  }

  if (phase === 'unsupported') {
    return (
      <div
        className="auth-alert auth-alert--muted"
        style={{ marginTop: 18, textAlign: 'left' }}
      >
        <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.5 }}>{p.notSupported}</p>
        <button type="button" className="auth-footer-links__a" style={{ marginTop: 8 }} onClick={onDismiss}>
          {p.dismiss}
        </button>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        marginTop: 20,
        padding: '16px 18px',
        textAlign: 'left',
        border: '1px solid var(--tj-line)',
        borderRadius: 12,
        background: 'rgba(99,102,241,0.04)',
      }}
    >
      <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>{p.optInTitle}</p>
      <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'var(--tj-muted)', lineHeight: 1.5 }}>
        {p.optInLead}
      </p>
      <p style={{ margin: '10px 0 0', fontSize: '0.82rem', lineHeight: 1.55 }}>{p.optInHook}</p>
      <p style={{ margin: '10px 0 0', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.45 }}>
        {p.optInCookie}
      </p>
      {msg ? (
        <p style={{ margin: '12px 0 0', fontSize: '0.8rem', color: 'var(--tj-link)' }}>{msg}</p>
      ) : null}
      <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {phase === 'on' ? (
          <button
            type="button"
            className="board-form__submit auth-btn--secondary"
            disabled={working}
            onClick={() => void onDisable()}
          >
            {p.disable}
          </button>
        ) : (
          <button
            type="button"
            className="board-form__submit"
            disabled={working}
            onClick={() => void onEnable()}
          >
            {working ? p.working : p.enable}
          </button>
        )}
        <button type="button" className="auth-footer-links__a" onClick={onDismiss}>
          {p.dismiss}
        </button>
      </div>
    </div>
  );
}
