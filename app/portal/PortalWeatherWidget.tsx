'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import { usePublicWeatherSwr } from '@/lib/hooks/usePublicWeatherSwr';
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

type OmniChaosMonkey = {
  shield_pulse?: boolean;
  defense_success_rate?: number;
  skipped?: boolean;
};

type OmniPack = { ok: boolean; status: number; json: unknown };

async function omniFetcher(url: string): Promise<OmniPack> {
  const res = await fetch(url, { cache: 'no-store' });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json };
}

function chaosShieldTooltip(locale: Locale, pulse: boolean, rate?: number): string {
  if (pulse) {
    return locale === 'th'
      ? '🛡️ โล่ Chaos ทำงาน — บริการไม่หยุดชะงัก'
      : '🛡️ 카오스 방어막 가동 중: 무중단 서비스 유지';
  }
  const pct = rate != null ? `${Math.round(rate * 100)}%` : '—';
  return locale === 'th'
    ? `การฝึก Chaos — อัตราป้องกันล่าสุด ${pct} (เมื่อซ่อมตัวเองสำเร็จ โล่จะเปล่งแสง)`
    : `카오스 훈련 최근 방어율 ${pct} — 자가 복구 시 방패에 블루 펄스가 돕니다.`;
}

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
      ? 'System All Green: ทุกระบบปกติ (สภาพอากาศ · DB · Biz · Shadow QA · Chaos)'
      : 'System All Green: 날씨 · DB · 크론 · 쉐도우 QA · 카오스 훈련 포함 전 구간 정상';
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

  const { data: weatherPayload, error: weatherError, isLoading: weatherLoading } = usePublicWeatherSwr(locale);

  const bangkok = useMemo((): WeatherCity | null => {
    const cities = weatherPayload?.cities ?? [];
    return (cities.find((c) => c.key === 'bangkok') ?? cities[0] ?? null) as WeatherCity | null;
  }, [weatherPayload]);

  const busy = weatherLoading && !weatherPayload && !weatherError;
  const err =
    Boolean(weatherError) ||
    (!busy &&
      weatherPayload !== undefined &&
      (!weatherPayload.cities || weatherPayload.cities.length === 0));

  const { data: omniPack } = useSWR('/api/health/omni-radar', omniFetcher, {
    refreshInterval: OMNI_RADAR_INTERVAL_MS,
    revalidateOnFocus: false,
    dedupingInterval: 8000,
  });

  const { omniPhase, omniErrors, chaosRadar } = useMemo(() => {
    if (!omniPack) {
      return {
        omniPhase: 'neutral' as OmniLedPhase,
        omniErrors: [] as string[],
        chaosRadar: null as OmniChaosMonkey | null,
      };
    }
    const { ok, status, json } = omniPack;
    const checks =
      json && typeof json === 'object' && !Array.isArray(json)
        ? (json as { checks?: { chaos_monkey?: OmniChaosMonkey } }).checks
        : undefined;
    const chaos = checks?.chaos_monkey ?? null;

    const healthy =
      ok &&
      json &&
      typeof json === 'object' &&
      (json as { status?: string }).status === 'healthy' &&
      (json as { all_systems_go?: boolean }).all_systems_go === true;

    if (healthy) {
      return { omniPhase: 'ok' as const, omniErrors: [] as string[], chaosRadar: chaos };
    }
    return {
      omniPhase: 'error' as const,
      omniErrors: parseOmniErrors(json, status),
      chaosRadar: chaos,
    };
  }, [omniPack]);

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

  const shieldPulse = chaosRadar?.shield_pulse === true;
  const chaosRate = chaosRadar?.defense_success_rate;
  const shieldTitle = useMemo(
    () => chaosShieldTooltip(locale, shieldPulse, chaosRate),
    [locale, shieldPulse, chaosRate],
  );

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
          <span
            className={`${styles.chaosShield} ${shieldPulse ? styles.chaosShieldPulse : ''}`}
            title={shieldTitle}
            role="img"
            aria-label={shieldTitle}
          >
            🛡️
          </span>
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
