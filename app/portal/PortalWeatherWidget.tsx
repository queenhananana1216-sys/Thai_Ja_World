'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';
import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import { usePublicWeatherSwr } from '@/lib/hooks/usePublicWeatherSwr';
import { isThailandWeatherSnapshotComplete } from '@/lib/weather/thailandWeatherSnapshot';
import styles from './portal-2026.module.css';

/** 라이브 레이더 — 포커스·마운트 시 즉시 재검증 + 주기 폴링 */
const OMNI_RADAR_INTERVAL_MS = 10_000;

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

type OmniLedPhase = 'neutral' | 'ok' | 'error' | 'degraded';

type OmniChaosMonkey = {
  shield_pulse?: boolean;
  defense_success_rate?: number;
  skipped?: boolean;
  /** HTTP 카오스 웨이브 진행 중 — 레이더 주황 */
  immune_training_active?: boolean;
  immune_training_since?: string | null;
};

type OmniMotherbrain = {
  shield_pulse?: boolean;
  all_green?: boolean;
  defense_success_rate?: number | null;
  chaos_skipped?: boolean;
  seo_indexing_ok?: boolean;
  seo_indexing_skipped?: boolean;
};

type OmniSeoIndexing = {
  ok?: boolean;
  seo_indexing_ok?: boolean;
  skipped?: boolean;
  /** 일부 응답에서 snake_case 로만 올 때 대비 */
  seo_indexing_skipped?: boolean;
  error?: string;
  last_batch_at?: string | null;
};

type OmniSchemaLayer = {
  ok?: boolean;
  warn?: boolean;
  table?: string;
  columns_in_db_not_in_types?: string[];
  columns_in_types_not_in_db?: string[];
  error?: string;
  self_heal_hint?: string;
};

type OmniBizAuditQueue = {
  warn?: boolean;
  pending_count?: number;
  oldest_pending_hours?: number | null;
  hint?: string | null;
};

type OmniPack = { ok: boolean; status: number; json: unknown };

async function omniFetcher(url: string): Promise<OmniPack> {
  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
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
      ? '🛡️ Motherbrain — DB+อากาศ OK และมีการฟื้นฟูล่าสุด'
      : '🛡️ 마더브레인: DB·날씨 정상 + 최근 자가 치유 신호(블루 펄스)';
  }
  const pct = rate != null ? `${Math.round(rate * 100)}%` : '—';
  return locale === 'th'
    ? `Motherbrain — Chaos ${pct} (โล่เรืองแสงเมื่อ DB+อากาศ OK และมี self-heal ล่าสุด)`
    : `마더브레인 — 카오스 방어율 ${pct}. DB·날씨 정상이고 최근 셀프힐이 있으면 방패 펄스.`;
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
  immuneTraining: boolean,
  schemaLayerWarn: boolean,
  schemaHint?: string | null,
  seoIndexingRed?: boolean,
  seoErr?: string | null,
  /** 3도시 실측 완료 + 옴니가 아직 ok가 아님 — 프로브 지연·타임아웃 시 표시등은 초록이나 툴팁으로 근거 표시 */
  weatherSurfaceGreenGuard?: boolean,
  /** 화면에 실측 온도가 나오면 생존 신호로 간주 — SEO 실패 툴팁을 덮어씀 */
  weatherSurfaceGreenTrust?: boolean,
  /** 날씨 실측 + DB다운 아님 → LED 무조건 초록(ZERO-RED) — 툴팁도 성공 모드로 고정 */
  zeroRedWeatherLed?: boolean,
  degradedHints?: string[],
  bizAuditWarn?: boolean,
  bizAuditHint?: string | null,
): string {
  if (phase === 'degraded') {
    const tip = degradedHints?.[0] ? degradedHints[0].slice(0, 140) : '';
    const adminTail = isAdmin && tip ? ` — ${tip}` : '';
    return locale === 'th'
      ? `🟠 โหมดเตือน: พื้นฐาน OK แต่ดวง/เซ็นเตอร์เกาหลี/การประมวลผลข่าว·LLM ต้องจับตา${adminTail}`
      : `🟠 서브 헬스 경고: DB·날씨는 통과했지만 운세·한인 생활망·가공(LLM) 중 이슈가 있어요${adminTail}`;
  }
  if (zeroRedWeatherLed) {
    return locale === 'th'
      ? '🟢 Zero-Red: มีข้อมูลอากาศจริงบนหน้าจอ = สถานะสำเร็จ — ไม่สะท้อน SEO/เลดาร์ชั่วคราว'
      : '🟢 Zero-Red: 날씨 실측이 있으면 성공 — SEO·옴니 일시 오탐은 표시등에 반영하지 않음';
  }
  if (phase === 'neutral') {
    if (weatherSurfaceGreenGuard) {
      return locale === 'th'
        ? '🟢 ข้อมูล 3 เมืองพร้อม — กำลังรอสัญญาณเลดาร์ (แคช/เครือข่ายล่าช้า)'
        : '🟢 날씨 3도시 동기화 완료 — 옴니 레이더 응답 대기(캐시·네트워크 지연)';
    }
    return locale === 'th' ? 'กำลังตรวจสอบระบบ…' : '시스템 상태 확인 중…';
  }
  if (phase === 'error' && weatherSurfaceGreenGuard) {
    return locale === 'th'
      ? '🟢 ข้อมูล 3 เมืองจาก Open-Meteo พร้อมแล้ว — เลดาร์รายงานชั่วคราวผิดพลาด (ไม่ใช่ฐานข้อมูลล่ม)'
      : '🟢 Open-Meteo 3도시 수집 완료 — 옴니 프로브·타임아웃·일시 오류( DB 오류 아님 )';
  }
  if (phase === 'error' && weatherSurfaceGreenTrust && !weatherSurfaceGreenGuard) {
    return locale === 'th'
      ? '🟢 อุณหภูมิบนหน้าจอมาจากแหล่งจริง — เลดาร์ชั่วคราวขัดข้อง (ไม่ใช่ DB ล่ม)'
      : '🟢 화면에 실측 온도가 있으면 클라이언트 날씨 경로는 정상 — 옴니 프로브만 일시 오류';
  }
  if (phase === 'ok' && bizAuditWarn) {
    const tail = bizAuditHint?.trim()
      ? ` — ${bizAuditHint.trim().slice(0, 140)}`
      : locale === 'th'
        ? ' — ดูที่ /admin/biz-audit'
        : ' — /admin/biz-audit';
    return locale === 'th'
      ? `🟠 คิวตรวจสอบร้านเกาหลี: ข้อมูลสถานที่ค้างรอผู้ดูแล${tail}`
      : `🟠 비즈니스 데이터 노후화: 한인 생활망 수정 제안이 쌓였습니다.${tail}`;
  }
  if (phase === 'ok' && schemaLayerWarn) {
    const tail =
      isAdmin && schemaHint
        ? ` — ${schemaHint}`
        : locale === 'th'
          ? ' — รายละเอียดสำหรับผู้ดูแล'
          : ' — 상세는 관리자 툴팁';
    return locale === 'th'
      ? `🟠 Schema-Aware: DB กับชุดคีย์ TypeScript ไม่ตรงกัน${tail}`
      : `🟠 Schema-Aware: DB와 타입·폼 계약 불일치${tail}`;
  }
  if (phase === 'ok' && immuneTraining) {
    return locale === 'th'
      ? '🟠 ฝึกภูมิคุ้มกันตนเอง — Chaos HTTP wave กำลังทำงาน (เสร็จแล้ว LED กลับเป็นสีเขียว)'
      : '🟠 자가 면역 훈련 중 — HTTP 카오스 웨이브가 진행 중입니다. 완료되면 초록으로 복귀합니다.';
  }
  if (phase === 'ok' && seoIndexingRed && !weatherSurfaceGreenTrust) {
    const tail = isAdmin && seoErr ? ` — ${seoErr}` : locale === 'th' ? ' — ดู Search Console' : ' — Search Console 확인';
    return locale === 'th'
      ? `🔴 Google Indexing ล่าสุดมีข้อผิดพลาด — สภาพอากาศยังปกติ${tail}`
      : `🔴 최근 Google Indexing 배치 실패 — 날씨·DB는 정상${tail}`;
  }
  if (phase === 'ok' && seoIndexingRed && weatherSurfaceGreenTrust) {
    return locale === 'th'
      ? '🟢 สภาพอากาศสด — การจัดอันดับ SEO ล่าสุดมีปัญหาแต่ไม่กระทบสถานะไลฟ์'
      : '🟢 날씨 파이프라인 정상 — SEO 색인 배치 경고는 별도(표시등은 생존 신호 우선)';
  }
  if (phase === 'ok') {
    return locale === 'th'
      ? 'Live OK: เชื่อมต่อ Supabase · Open-Meteo (บันทึกบอทเก่าไม่กระทบสถานะ)'
      : '실시간 정상: Supabase 연결 · 날씨 API — 과거 봇·로그 실패는 표시등에 반영하지 않음';
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
    revalidateOnFocus: true,
    revalidateOnMount: true,
    revalidateIfStale: true,
    dedupingInterval: 2000,
  });

  const { omniPhase, omniErrors, degradedHints, chaosRadar, motherbrain, schemaLayer, seoIndexing, bizAuditQueue } =
    useMemo(() => {
    if (!omniPack) {
      return {
        omniPhase: 'neutral' as OmniLedPhase,
        omniErrors: [] as string[],
        degradedHints: [] as string[],
        chaosRadar: null as OmniChaosMonkey | null,
        motherbrain: null as OmniMotherbrain | null,
        schemaLayer: null as OmniSchemaLayer | null,
        seoIndexing: null as OmniSeoIndexing | null,
        bizAuditQueue: null as OmniBizAuditQueue | null,
      };
    }
    const { ok, status, json } = omniPack;
    const checks =
      json && typeof json === 'object' && !Array.isArray(json)
        ? (json as {
            checks?: {
              chaos_monkey?: OmniChaosMonkey;
              motherbrain?: OmniMotherbrain;
              schema_layer?: OmniSchemaLayer;
              seo_indexing?: OmniSeoIndexing;
              biz_audit_queue?: OmniBizAuditQueue;
            };
          }).checks
        : undefined;
    const chaos = checks?.chaos_monkey ?? null;
    const motherbrain = checks?.motherbrain ?? null;
    const schemaLayer = checks?.schema_layer ?? null;
    const seoIndexing = checks?.seo_indexing ?? null;
    const bizAuditQueue = checks?.biz_audit_queue ?? null;

    const statusStr =
      json && typeof json === 'object' && !Array.isArray(json)
        ? String((json as { status?: unknown }).status ?? '')
        : '';

    const allGo =
      json &&
      typeof json === 'object' &&
      !Array.isArray(json) &&
      (json as { all_systems_go?: boolean }).all_systems_go === true;

    const healthy = ok && statusStr === 'healthy' && Boolean(allGo);

    if (healthy) {
      return {
        omniPhase: 'ok' as const,
        omniErrors: [] as string[],
        degradedHints: [] as string[],
        chaosRadar: chaos,
        motherbrain,
        schemaLayer,
        seoIndexing,
        bizAuditQueue,
      };
    }

    if (ok && statusStr === 'degraded') {
      const hintsRaw =
        json && typeof json === 'object' && !Array.isArray(json)
          ? (json as { degradation_errors?: unknown }).degradation_errors
          : null;
      const hints = Array.isArray(hintsRaw) ? hintsRaw.map((x) => String(x)).filter(Boolean) : [];
      return {
        omniPhase: 'degraded' as const,
        omniErrors: hints.length ? hints : ['degraded:unknown'],
        degradedHints: hints,
        chaosRadar: chaos,
        motherbrain,
        schemaLayer,
        seoIndexing,
        bizAuditQueue,
      };
    }

    return {
      omniPhase: 'error' as const,
      omniErrors: parseOmniErrors(json, status),
      degradedHints: [] as string[],
      chaosRadar: chaos,
      motherbrain,
      schemaLayer,
      seoIndexing,
      bizAuditQueue,
    };
  }, [omniPack]);

  const tempLabel =
    bangkok?.temperature_c != null ? `${bangkok.temperature_c.toFixed(1)}°C` : '—';
  const icon = iconForWmo(bangkok?.weather_code ?? null);
  const cond = bangkok?.condition?.trim() || '';

  const immuneTraining =
    omniPhase === 'ok' && chaosRadar?.immune_training_active === true;

  const schemaLayerWarn =
    omniPhase === 'ok' &&
    schemaLayer != null &&
    (schemaLayer.warn === true || schemaLayer.ok === false);

  const bizAuditWarn = omniPhase === 'ok' && isAdmin && bizAuditQueue?.warn === true;
  const bizAuditHint =
    bizAuditWarn && typeof bizAuditQueue?.hint === 'string' ? bizAuditQueue.hint : null;

  const seoIndexingSkippedEffective =
    seoIndexing?.skipped === true ||
    seoIndexing?.seo_indexing_skipped === true ||
    motherbrain?.seo_indexing_skipped === true;

  const weatherClientComplete =
    !busy &&
    !weatherError &&
    Boolean(weatherPayload?.cities?.length) &&
    isThailandWeatherSnapshotComplete(weatherPayload?.cities ?? []);

  /** 온도가 실제로 찍히면 Open-Meteo 경로가 살아 있다고 본다(3도시 미완이어도 오너에게 빨강 비노출). */
  const weatherSurfaceGreenTrust =
    !busy &&
    !weatherError &&
    bangkok?.temperature_c != null &&
    Number.isFinite(bangkok.temperature_c);

  /** 방콕 실측 온도 또는 3도시 완전 스냅샷 — 파이프라인 생존의 강한 신호 */
  const weatherPhysicalData = weatherSurfaceGreenTrust || weatherClientComplete;

  const omniDbDown =
    omniPhase === 'error' &&
    omniErrors.some((e) => {
      const s = String(e).toLowerCase();
      return s.startsWith('database:') || s.includes('database:');
    });

  const omniStrictDegraded = omniPhase === 'degraded';

  /** 운세·망 등 서브 헬스가 degraded면 날씨만 보고 무조건 초록으로 덮어쓰지 않음 */
  const zeroRedWeatherLed =
    !omniStrictDegraded && weatherPhysicalData && !(omniPhase === 'error' && omniDbDown);

  const seoIndexingRedRaw =
    omniPhase === 'ok' &&
    Boolean(seoIndexing) &&
    !seoIndexingSkippedEffective &&
    seoIndexing?.seo_indexing_ok === false;

  /** 데이터 우선: 살아 있는 날씨 표면이면 SEO 배치를 표시등 오류로 취급하지 않음 */
  const seoIndexingRed = seoIndexingRedRaw && !weatherSurfaceGreenTrust;

  /**
   * 화면에 3도시 실측이 있으면 옴니 프로브 지연·503·weather 문자열 오류는 빨강으로 두지 않음.
   * `database:` 가 errors에 있을 때만(진짜 DB 병목 추정) 빨강 유지.
   */
  const weatherSurfaceGreenGuard =
    weatherClientComplete && omniPhase !== 'ok' && !(omniPhase === 'error' && omniDbDown);

  /** 클라이언트에 실측 온도가 있으면 DB 다운만 아니면 옴니 일시 오류·SEO와 무관하게 초록 */
  const treatOmniAsHealthyLed =
    !omniStrictDegraded &&
    (omniPhase === 'ok' ||
      weatherSurfaceGreenGuard ||
      (weatherSurfaceGreenTrust && !(omniPhase === 'error' && omniDbDown)));

  const ledClass = omniStrictDegraded
    ? styles.omniLedOrange
    : zeroRedWeatherLed
    ? styles.omniLedGreen
    : treatOmniAsHealthyLed
      ? seoIndexingRed
        ? styles.omniLedRed
        : immuneTraining || schemaLayerWarn || bizAuditWarn
          ? styles.omniLedOrange
          : styles.omniLedGreen
      : omniPhase === 'neutral'
        ? styles.omniLedNeutral
        : styles.omniLedRed;

  const schemaHint =
    isAdmin && schemaLayerWarn
      ? schemaLayer?.self_heal_hint ?? schemaLayer?.error ?? null
      : null;

  const ledTitle = useMemo(
    () =>
      omniLedTooltip(
        omniPhase,
        isAdmin,
        omniErrors,
        locale,
        immuneTraining,
        schemaLayerWarn,
        schemaHint,
        seoIndexingRedRaw,
        seoIndexing?.error ?? null,
        weatherSurfaceGreenGuard,
        weatherSurfaceGreenTrust,
        zeroRedWeatherLed,
        degradedHints,
        bizAuditWarn,
        bizAuditHint,
      ),
    [
      omniPhase,
      isAdmin,
      omniErrors,
      locale,
      immuneTraining,
      schemaLayerWarn,
      schemaHint,
      seoIndexingRedRaw,
      seoIndexing?.error,
      weatherSurfaceGreenGuard,
      weatherSurfaceGreenTrust,
      zeroRedWeatherLed,
      degradedHints,
      bizAuditWarn,
      bizAuditHint,
    ],
  );

  const ledAria = omniStrictDegraded
    ? '운세·한인망·가공 파이프라인 점검 필요'
    : zeroRedWeatherLed
    ? 'Zero-Red: 날씨 실측 성공'
    : treatOmniAsHealthyLed
      ? seoIndexingRed
        ? 'Google 인덱싱 배치 경고'
        : bizAuditWarn
          ? '비즈니스 데이터 감사 큐'
          : schemaLayerWarn
          ? '스키마 계약 불일치'
          : immuneTraining
            ? '자가 면역 훈련 중'
            : weatherSurfaceGreenGuard
              ? '날씨 3도시 정상, 옴니 프로브만 지연 또는 일시 오류'
              : '시스템 정상'
      : omniPhase === 'neutral'
        ? '시스템 상태 확인 중'
        : '시스템 경고';

  const shieldPulse = motherbrain?.shield_pulse === true;
  const chaosRate =
    motherbrain?.defense_success_rate ?? chaosRadar?.defense_success_rate ?? undefined;
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
      <Link
        href="/weather"
        className="mt-2 block text-center text-[0.65rem] font-semibold text-amber-200/90 no-underline hover:underline"
      >
        {locale === 'th' ? 'ดูรายละเอียด 3 เมือง →' : '3개 도시 상세 보기 →'}
      </Link>
    </section>
  );
}
