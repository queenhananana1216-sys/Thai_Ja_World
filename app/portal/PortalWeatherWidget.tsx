'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import styles from './portal-2026.module.css';

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

export default function PortalWeatherWidget({ locale }: { locale: Locale }) {
  const copy = getPortal2026Copy(locale);
  const [bangkok, setBangkok] = useState<WeatherCity | null>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(false);

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

  const tempLabel =
    bangkok?.temperature_c != null ? `${bangkok.temperature_c.toFixed(1)}°C` : '—';
  const icon = iconForWmo(bangkok?.weather_code ?? null);
  const cond = bangkok?.condition?.trim() || '';

  return (
    <section
      className={`${styles.glassGold} overflow-hidden p-2.5`}
      aria-label={copy.weatherWidgetAria}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/35 bg-slate-950/40 text-2xl leading-none shadow-inner" aria-hidden>
          {icon}
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
