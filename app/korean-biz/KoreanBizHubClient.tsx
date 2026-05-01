'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
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

const CATEGORY_KO: Record<KoreanBizRow['category'], string> = {
  mart: '마트',
  pharmacy: '약국',
  hospital: '병원',
};

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
}: {
  rows: KoreanBizRow[];
  locale?: Locale;
  /** 조회 실패·0건: 글라스 안내 카드만 강조 */
  globalEmpty?: boolean;
}) {
  const [tab, setTab] = useState<KoreanBizRow['region']>('bangkok');

  const filtered = useMemo(
    () => rows.filter((r) => r.region === tab).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [rows, tab],
  );

  const contactLead =
    locale === 'th' ? 'เบอร์ติดต่อล่าสุด (ที่มีอยู่จริง)' : '현존하는 최신 연락처';
  const phoneMissing = locale === 'th' ? 'ไม่มีเบอร์โทร' : '전화번호 없음';
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
        </header>
        <GlobalRadarPlaceholder />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
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

      <ul className="space-y-4">
        {filtered.length === 0 ? (
          <li
            className="rounded-2xl border border-white/12 bg-gradient-to-br from-slate-900/55 to-slate-950/50 px-5 py-10 text-center text-gray-300 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            이 지역에 표시할 업소가 아직 없습니다. 다른 지역 탭을 눌러 보시거나 잠시 후 다시 확인해 주세요.
          </li>
        ) : (
          filtered.map((row) => (
            <li key={row.id}>
              <article
                className={`rounded-2xl border border-white/12 bg-gradient-to-br from-slate-900/65 via-slate-950/75 to-black/50 px-5 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
                  row.is_verified ? '' : 'opacity-85 ring-1 ring-rose-500/25'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-white">{row.name}</h2>
                      <span className="shrink-0 rounded-full border border-cyan-400/35 bg-cyan-950/40 px-2.5 py-0.5 text-xs font-semibold text-cyan-100">
                        {CATEGORY_KO[row.category]}
                      </span>
                      {!row.is_verified ? (
                        <span className="text-xs font-semibold text-rose-300">영업 상태 확인 필요</span>
                      ) : null}
                    </div>
                    {row.address ? (
                      <p className="mt-2 text-sm leading-relaxed text-gray-300">{row.address}</p>
                    ) : null}
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-cyan-200/90">
                      {contactLead}
                    </p>
                    <p className="mt-1 font-mono text-base font-semibold tracking-wide text-amber-100">
                      {row.phone?.trim() ? row.phone : phoneMissing}
                    </p>
                  </div>
                  <Link
                    href={mapsHref(row)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-950/35 px-4 py-2 text-sm font-bold text-emerald-50 no-underline shadow-[0_0_20px_rgba(52,211,153,0.12)] transition hover:border-emerald-300/60 hover:bg-emerald-900/45"
                  >
                    구글맵 바로가기
                  </Link>
                </div>
                <p className="mt-4 border-t border-white/5 pt-3 text-xs text-gray-400">
                  {row.is_verified ? (
                    <>{verifiedLine(row.last_verified_at)}</>
                  ) : locale === 'th' ? (
                    <>
                      ⚠️ ไม่พบข้อมูลการเปิดให้บริการในการตรวจสอบล่าสุด — โปรดโทรยืนยันก่อนเข้าใช้บริการ
                    </>
                  ) : (
                    <>⚠️ 최근 검증에서 영업 정보를 확인하지 못했습니다. 방문 전 전화 확인을 권장합니다.</>
                  )}
                </p>
              </article>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
