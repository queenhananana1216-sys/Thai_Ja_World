'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import KoreanBizSearch from './KoreanBizSearch';
import KoreanBizReportFab from './KoreanBizReportFab';
import type { Locale } from '@/i18n/types';

export type KoreanBizRow = {
  id: string;
  google_place_id: string;
  name: string;
  category: 'mart' | 'pharmacy' | 'hospital';
  region: 'bangkok' | 'pattaya' | 'chiangmai';
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean;
  last_verified_at: string | null;
};

const REGIONS: {
  key: KoreanBizRow['region'];
  label: Record<Locale, string>;
}[] = [
  { key: 'bangkok', label: { ko: '방콕', th: 'กรุงเทพฯ' } },
  { key: 'pattaya', label: { ko: '파타야', th: 'พัทยา' } },
  { key: 'chiangmai', label: { ko: '치앙마이', th: 'เชียงใหม่' } },
];

const CATEGORY_LABEL: Record<Locale, Record<KoreanBizRow['category'], string>> = {
  ko: { mart: '마트', pharmacy: '약국', hospital: '병원' },
  th: { mart: 'มาร์ท', pharmacy: 'ร้านยา', hospital: 'โรงพยาบาล' },
};

type CategoryFilter = 'all' | KoreanBizRow['category'];

const SUB_CATEGORY_TABS: {
  key: CategoryFilter;
  emoji: string;
  label: Record<Locale, string>;
}[] = [
  { key: 'all', emoji: '', label: { ko: '전체', th: 'ทั้งหมด' } },
  { key: 'mart', emoji: '🛒', label: { ko: '한인 마트', th: 'มาร์ทเกาหลี' } },
  { key: 'pharmacy', emoji: '💊', label: { ko: '한인 약국', th: 'ร้านยาเกาหลี' } },
  { key: 'hospital', emoji: '🏥', label: { ko: '한인 병원', th: 'โรงพยาบาลเกาหลี' } },
];

function isBizCategory(v: string): v is KoreanBizRow['category'] {
  return v === 'mart' || v === 'pharmacy' || v === 'hospital';
}

function mapsHref(row: KoreanBizRow): string {
  if (row.latitude != null && row.longitude != null) {
    return `https://www.google.com/maps?q=${row.latitude},${row.longitude}`;
  }
  const q = [row.name, row.address].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function formatVerifiedAt(iso: string | null | undefined, locale: Locale): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function GlobalRadarPlaceholder() {
  return (
    <div className="relative mx-auto max-w-lg px-4 py-6">
      <style>{`
        @keyframes korean-biz-radar-sweep {
          0%, 100% { transform: translateX(-120%); opacity: 0.55; }
          50% { transform: translateX(320%); opacity: 1; }
        }
        .korean-biz-radar-sweep {
          animation: korean-biz-radar-sweep 2.2s ease-in-out infinite;
        }
      `}</style>
      <div
        className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/75 via-slate-950/70 to-black/60 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl md:p-10"
        role="status"
        aria-live="polite"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-amber-500/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-cyan-500/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center text-center">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl shadow-inner backdrop-blur-md">
            🤖
          </span>
          <p className="text-lg font-semibold leading-relaxed tracking-tight text-white/95 md:text-xl">
            AI 레이더가 태국 전역의 한인 마트/약국/병원 정보를 실시간으로 수집하고 검증 중입니다...
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-400">
            곧 이 화면이 최신 연락처로 채워집니다. 잠시만 기다려 주세요.
          </p>
          <div className="relative mt-8 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
            <div className="korean-biz-radar-sweep h-full w-2/5 rounded-full bg-gradient-to-r from-amber-400/95 via-rose-400/85 to-cyan-400/95 shadow-[0_0_20px_rgba(251,191,36,0.35)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KoreanBizHubClient({
  rows,
  locale = 'ko',
  globalEmpty = false,
  fetchError = false,
}: {
  rows: KoreanBizRow[];
  locale?: Locale;
  /** 0건일 때만 AI 레이더 플레이스홀더 — 행이 있으면 즉시 리스트 */
  globalEmpty?: boolean;
  /** Supabase 조회 에러(데이터는 없음): 플레이스홀더와 동일 처리 가능 */
  fetchError?: boolean;
}) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<KoreanBizRow['region']>('bangkok');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [pool, setPool] = useState(rows);

  useEffect(() => {
    setPool(rows);
  }, [rows]);

  const onFilteredPoolChange = useCallback((next: KoreanBizRow[]) => {
    setPool(next);
  }, []);

  useEffect(() => {
    const focus = searchParams.get('focus')?.trim();
    if (!focus) return;
    const tid = window.setTimeout(() => {
      document.getElementById(`korean-biz-row-${focus}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);
    return () => window.clearTimeout(tid);
  }, [searchParams]);

  const inRegion = useMemo(
    () => pool.filter((r) => r.region === tab),
    [pool, tab],
  );

  const filtered = useMemo(() => {
    const base =
      categoryFilter === 'all'
        ? inRegion
        : inRegion.filter((r) => {
            const c = r.category;
            return isBizCategory(c) ? c === categoryFilter : false;
          });
    return [...base].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [inRegion, categoryFilter]);

  const contactLead =
    locale === 'th' ? 'เบอร์ติดต่อล่าสุด (ที่มีอยู่จริง)' : '현존하는 최신 연락처';
  const phoneMissing = locale === 'th' ? 'ไม่มีเบอร์โทร' : '전화번호 없음';
  const mapsCta = locale === 'th' ? 'Google Maps' : '구글맵 바로가기';
  const emptyCategoryHint =
    locale === 'th'
      ? 'ไม่มีรายการในหมวดนี้ในภูมิภาคนี้ — ลองเปลี่ยนแท็บย่อยหรือภูมิภาค'
      : '이 지역·검색 결과에 해당 업종 업소가 없습니다. 다른 업종 탭이나 지역을 선택해 보세요.';
  const emptySearchPool =
    locale === 'th'
      ? 'ไม่พบรายการที่ตรงกับการค้นหา — ลองเปลี่ยนคำค้น'
      : '검색 조건에 맞는 업소가 없습니다. 검색어를 바꿔 보세요.';
  const emptyRegionPool =
    locale === 'th'
      ? 'ยังไม่มีรายการในภูมิภาคนี้ — ลองเปลี่ยนภูมิภาคหรือกลับมาใหม่ภายหลัง'
      : '이 지역에 표시할 업소가 아직 없습니다. 다른 지역 탭을 눌러 보시거나 잠시 후 다시 확인해 주세요.';
  const verifiedLine = (iso: string | null) =>
    locale === 'th'
      ? `✅ ตรวจสอบล่าสุดโดย AI: ${formatVerifiedAt(iso, locale)}`
      : `✅ AI가 최근 검증함: ${formatVerifiedAt(iso, locale)}`;

  if (globalEmpty) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <header className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/90">
            🇰🇷 Biz Radar
          </p>
          <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            한인 생활망
          </h1>
          <p className="mt-2 text-base text-gray-300">
            마트 · 약국 · 병원 — 검증된 연락처를 한곳에서
          </p>
          {fetchError ? (
            <p className="mt-3 text-sm text-rose-300/95">
              {locale === 'th'
                ? 'ชั่วคราวโหลดรายการไม่สำเร็จ — โปรดรีเฟรชหรือลองใหม่ภายหลัง'
                : '목록을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'}
            </p>
          ) : null}
        </header>
        <GlobalRadarPlaceholder />
        <KoreanBizReportFab defaultRegion={tab} locale={locale} />
      </div>
    );
  }

  const subTabAria = locale === 'th' ? 'เลือกประเภทธุรกิจ' : '업종별 필터';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/90">
          🇰🇷 Biz Radar
        </p>
        <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">
          한인 생활망
        </h1>
        <p className="mt-2 text-base text-gray-300">
          마트 · 약국 · 병원 — 검증된 연락처를 한곳에서
        </p>
      </header>

      <div
        className="mb-6 flex flex-wrap justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/50 p-1.5 backdrop-blur-xl"
        role="tablist"
        aria-label={locale === 'th' ? 'เลือกภูมิภาค' : '지역 선택'}
      >
        {REGIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-11 flex-1 rounded-xl px-4 py-2 text-sm font-bold transition sm:flex-none ${
              tab === key
                ? 'border border-amber-400/50 bg-gradient-to-br from-amber-500/25 to-rose-600/20 text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.15)]'
                : 'border border-transparent text-gray-300 hover:border-white/15 hover:bg-white/5'
            }`}
          >
            {label[locale]}
          </button>
        ))}
      </div>

      <div
        className="mb-6 flex flex-wrap justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl"
        role="tablist"
        aria-label={subTabAria}
      >
        {SUB_CATEGORY_TABS.map(({ key, emoji, label }) => {
          const active = categoryFilter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategoryFilter(key)}
              className={`min-h-10 flex-1 rounded-xl px-3 py-2 text-xs font-bold transition sm:flex-none sm:px-4 sm:text-sm ${
                active
                  ? 'border border-violet-400/45 bg-gradient-to-br from-violet-500/25 to-fuchsia-600/20 text-white shadow-[0_0_20px_rgba(167,139,250,0.18)]'
                  : 'border border-transparent text-gray-400 hover:border-white/12 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              {emoji ? (
                <span className="mr-1 inline" aria-hidden>
                  {emoji}
                </span>
              ) : null}
              {label[locale]}
            </button>
          );
        })}
      </div>

      <KoreanBizSearch rows={rows} onFilteredPoolChange={onFilteredPoolChange} />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <li className="col-span-full">
            <div
              className="rounded-2xl border border-white/12 bg-gradient-to-br from-slate-900/50 via-slate-950/60 to-black/45 px-5 py-12 text-center text-gray-300 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
            >
              {pool.length === 0 && rows.length > 0
                ? emptySearchPool
                : inRegion.length === 0
                  ? emptyRegionPool
                  : emptyCategoryHint}
            </div>
          </li>
        ) : (
          filtered.map((row) => {
            const cat = isBizCategory(row.category) ? row.category : 'mart';
            const catLabel = CATEGORY_LABEL[locale][cat];
            return (
              <li key={row.id} id={`korean-biz-row-${row.id}`} className="min-w-0">
                <article
                  className={`flex h-full flex-col rounded-2xl border border-white/14 bg-gradient-to-br from-slate-900/55 via-slate-950/70 to-black/55 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl transition hover:border-white/22 hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)] ${
                    row.is_verified ? '' : 'opacity-90 ring-1 ring-rose-500/30'
                  }`}
                >
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="min-w-0 flex-1 text-base font-bold leading-snug text-white md:text-lg">
                        {row.name}
                      </h2>
                      <span className="shrink-0 rounded-full border border-cyan-400/40 bg-cyan-950/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cyan-100">
                        {catLabel}
                      </span>
                    </div>
                    {!row.is_verified ? (
                      <p className="text-xs font-semibold text-rose-300/95">
                        {locale === 'th' ? 'ต้องตรวจสอบสถานะ' : '영업 상태 확인 필요'}
                      </p>
                    ) : null}
                    {row.address ? (
                      <p className="text-sm leading-relaxed text-gray-300">{row.address}</p>
                    ) : null}
                    <div className="mt-auto border-t border-white/10 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/85">
                        {contactLead}
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-amber-100 md:text-base">
                        {row.phone?.trim() ? row.phone : phoneMissing}
                      </p>
                    </div>
                    <Link
                      href={mapsHref(row)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-emerald-400/45 bg-emerald-950/40 px-3 py-2 text-center text-sm font-bold text-emerald-50 no-underline shadow-[0_0_24px_rgba(52,211,153,0.14)] transition hover:border-emerald-300/65 hover:bg-emerald-900/50"
                    >
                      {mapsCta}
                    </Link>
                    <p className="text-[11px] leading-relaxed text-gray-500">
                      {row.is_verified ? (
                        <>{verifiedLine(row.last_verified_at)}</>
                      ) : locale === 'th' ? (
                        <>
                          ⚠️ ไม่พบข้อมูลการเปิดให้บริการในการตรวจสอบล่าสุด — โปรดโทรยืนยันก่อนเข้าใช้บริการ
                        </>
                      ) : (
                        <>
                          ⚠️ 최근 검증에서 영업 정보를 확인하지 못했습니다. 방문 전 전화 확인을 권장합니다.
                        </>
                      )}
                    </p>
                  </div>
                </article>
              </li>
            );
          })
        )}
      </ul>
      <KoreanBizReportFab defaultRegion={tab} locale={locale} />
    </div>
  );
}
