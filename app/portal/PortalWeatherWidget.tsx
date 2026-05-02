'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import styles from './portal-2026.module.css';

const OMNI_RADAR_INTERVAL_MS = 60_000;

function iconForWmo(code: number | null | undefined): string {
  if (code == null) return '☀️';
  if (code === 0) return '☀️';
  if (code <= 3) return '🌤️';
  if (code <= 48) return '☁️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌧️';
  return '⛈️';
}

type WeatherCity = {
  key: string;
  temperature_c: number | null;
  weather_code?: number | null;
  condition: string;
};

type OmniLedPhase = 'neutral' | 'ok' | 'error';

function parseOmniErrors(body: unknown, httpStatus: number): string[] {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const errs = (body as { errors?: unknown }).errors;
    if (Array.isArray(errs)) return errs.map((x) => String(x)).filter(Boolean);
  }
  return [`http_${httpStatus}`];
}

function omniLedTooltip(
  phase: OmniLedPhase,
  isAdmin: boolean,
  errors: string[],
  locale: Locale,
): string {
  if (phase === 'neutral') {
    return locale === 'th' ? 'กำลังตรวจสอบระบบ…' : '시스템 상태 확인 중…';
  }
  if (phase === 'ok') {
    return locale === 'th'
      ? 'System All Green: ทุกระบบปกติ (สภาพอากาศ · DB · ครอนบอท)'
      : 'System All Green: 모든 파이프라인 정상 가동 중';
  }
  if (isAdmin && errors.length > 0) {
    return `Pipeline 경고 (관리자 전용): ${errors.join(' · ')}`;
  }
  return locale === 'th'
    ? 'บางระบบไม่พร้อม — รายละเอียดสำหรับผู้ดูแลระบบเท่านั้น'
    : '일부 백엔드 파이프라인에 문제가 있습니다. 상세 원인은 관리자에게만 표시됩니다.';
}

export default function PortalWeatherWidget({
  locale,
  isAdmin = false,
}: {
  locale: Locale;
  /** 관리자만 옴니 레이더 경고 툴팁에 원인 노출 */
  isAdmin?: boolean;
}) {
  const copy = getPortal2026Copy(locale);
  const [bangkok, setBangkok] = useState<WeatherCity | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(false);

  const [omniPhase, setOmniPhase] = useState<OmniLedPhase>('neutral');
  const [omniErrors, setOmniErrors] = useState<string[]>([]);

  const fetchOmniRadar = useCallback(async () => {
    try {
      const res = await fetch('/api/health/omni-radar', { cache: 'no-store' });
      let json: unknown = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      const healthy =
        res.ok &&
        json &&
        typeof json === 'object' &&
        (json as { status?: string }).status === 'healthy' &&
        (json as { all_systems_go?: boolean }).all_systems_go === true;

      if (healthy) {
        setOmniPhase('ok');
        setOmniErrors([]);
      } else {
        setOmniPhase('error');
        setOmniErrors(parseOmniErrors(json, res.status));
      }
    } catch {
      setOmniPhase('error');
      setOmniErrors(['network_or_unreachable']);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setErr(false);
      try {
        const loc = locale === 'th' ? 'th' : 'ko';
        const res = await fetch(`/api/weather?locale=${loc}`);
        if (!res.ok) {
          if (!cancelled) {
            setBangkok(null);
            setErr(true);
          }
          return;
        }
        const body = (await res.json()) as { cities?: WeatherCity[] };
        const first = body.cities?.find((c) => c.key === 'bangkok') ?? body.cities?.[0] ?? null;
        if (!cancelled) {
          setBangkok(first);
          setErr(!first);
        }
      } catch {
        if (!cancelled) {
          setBangkok(null);
          setErr(true);
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    void fetchOmniRadar();
    const id = window.setInterval(() => void fetchOmniRadar(), OMNI_RADAR_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fetchOmniRadar]);

  const tempLabel =
    bangkok?.temperature_c != null ? `${bangkok.temperature_c.toFixed(1)}°C` : '—';
  const icon = iconForWmo(bangkok?.weather_code ?? null);
  const cond = bangkok?.condition?.trim() || '';

  const ledClass =
    omniPhase === 'ok'
      ? styles.omniLedGreen
      : omniPhase === 'error'
        ? styles.omniLedRed
        : styles.omniLedNeutral;

  const ledTitle = useMemo(
    () => omniLedTooltip(omniPhase, isAdmin, omniErrors, locale),
    [omniPhase, isAdmin, omniErrors, locale],
  );

  const ledAria =
    omniPhase === 'ok'
      ? '시스템 정상'
      : omniPhase === 'error'
        ? '시스템 경고'
        : '시스템 상태 확인 중';

  return (
    <section
      className={`${styles.glassGold} overflow-hidden p-2.5`}
      aria-label={copy.weatherWidgetAria}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`${styles.weatherIconWrap} flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/35 bg-slate-950/40 text-2xl leading-none shadow-inner`}>
          <span aria-hidden>{icon}</span>
          <span
            className={`${styles.omniLed} ${ledClass}`}
            title={ledTitle}
            role="status"
            aria-label={ledAria}
          />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-amber-100/90">
            {locale === 'th' ? 'กรุงเทพฯ' : '방콕'}
          </p>
          {busy ? (
            <p className="mt-0.5 truncate text-sm text-gray-300">{copy.weatherLoading}</p>
          ) : err ? (
            <p className="mt-0.5 line-clamp-2 break-words text-sm text-gray-400">{copy.weatherUnavailable}</p>
          ) : (
            <>
              <p className="mt-0.5 truncate text-xl font-black tabular-nums tracking-tight text-white">{tempLabel}</p>
              {cond ? (
                <p className="line-clamp-2 break-words text-sm leading-snug text-gray-200">{cond}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
