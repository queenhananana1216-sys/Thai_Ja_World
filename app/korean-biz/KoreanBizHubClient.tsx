'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import KoreanBizSearch from './KoreanBizSearch';
import KoreanBizReportFab from './KoreanBizReportFab';
import type { Locale } from '@/i18n/types';
import {
  buildWhatsAppUrlFromPhone,
  isLikelySyntheticOrDemoPhone,
  isMaskedOrPlaceholderPhone,
  isDemoKoreanBizPlaceId,
  normalizeExternalChatUrl,
} from '@/lib/korean-biz/publicContact';
import type { KoreanBizCategory, KoreanBizRow } from '@/lib/korean-biz/koreanBizTypes';
import { getKoreanBizDisplayViews, koreanBizCommunityWhisper } from '@/lib/korean-biz/koreanBizVitality';
import { TjBrandElephantMark } from '@/components/brand/TjBrandElephantMark';

export type { KoreanBizCategory, KoreanBizRow } from '@/lib/korean-biz/koreanBizTypes';

const REGIONS: {
  key: KoreanBizRow['region'];
  label: Record<Locale, string>;
}[] = [
  {
    key: 'bangkok',
    label: { ko: '방콕', th: 'กรุงเทพฯ', en: 'Bangkok', zh: '曼谷' },
  },
  {
    key: 'pattaya',
    label: { ko: '파타야', th: 'พัทยา', en: 'Pattaya', zh: '芭提雅' },
  },
  {
    key: 'chiangmai',
    label: { ko: '치앙마이', th: 'เชียงใหม่', en: 'Chiang Mai', zh: '清迈' },
  },
];

const CATEGORY_LABEL: Record<Locale, Record<KoreanBizCategory, string>> = {
  ko: {
    mart: '마트',
    pharmacy: '약국',
    hospital: '병원',
    vehicle_rent: '오토바이·렌트',
    golf: '골프·투어',
    massage_spa: '마사지·스파',
  },
  th: {
    mart: 'มาร์ท',
    pharmacy: 'ร้านยา',
    hospital: 'โรงพยาบาล',
    vehicle_rent: 'เช่ารถ/มอเตอร์ไซค์',
    golf: 'กอล์ฟ·ทัวร์',
    massage_spa: 'นวด·สปา',
  },
  en: {
    mart: 'Mart',
    pharmacy: 'Pharmacy',
    hospital: 'Hospital',
    vehicle_rent: 'Bike / car rent',
    golf: 'Golf / tours',
    massage_spa: 'Massage / spa',
  },
  zh: {
    mart: '超市',
    pharmacy: '药房',
    hospital: '医院',
    vehicle_rent: '摩托/租车',
    golf: '高尔夫/行程',
    massage_spa: '按摩/水疗',
  },
};

type CategoryFilter = 'all' | KoreanBizCategory;

const SUB_CATEGORY_TABS: {
  key: CategoryFilter;
  emoji: string;
  label: Record<Locale, string>;
}[] = [
  {
    key: 'all',
    emoji: '',
    label: { ko: '전체', th: 'ทั้งหมด', en: 'All', zh: '全部' },
  },
  {
    key: 'mart',
    emoji: '🛒',
    label: { ko: '한인 마트', th: 'มาร์ทเกาหลี', en: 'Korean mart', zh: '韩人超市' },
  },
  {
    key: 'pharmacy',
    emoji: '💊',
    label: { ko: '한인 약국', th: 'ร้านยาเกาหลี', en: 'Korean pharmacy', zh: '韩人药房' },
  },
  {
    key: 'hospital',
    emoji: '🏥',
    label: {
      ko: '한인 병원',
      th: 'โรงพยาบาลเกาหลี',
      en: 'Korean hospital',
      zh: '韩人医院',
    },
  },
  {
    key: 'vehicle_rent',
    emoji: '🛵',
    label: {
      ko: '오토바이·차량 렌트',
      th: 'เช่ามอเตอร์ไซค์/รถ',
      en: 'Bike & car rental',
      zh: '摩托/租车',
    },
  },
  {
    key: 'golf',
    emoji: '⛳',
    label: {
      ko: '골프장·투어',
      th: 'กอล์ฟ·ทัวร์',
      en: 'Golf & tours',
      zh: '高尔夫/旅游',
    },
  },
  {
    key: 'massage_spa',
    emoji: '💆',
    label: {
      ko: '마사지·스파',
      th: 'นวด·สปา',
      en: 'Massage & spa',
      zh: '按摩·水疗',
    },
  },
];

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
  const intl =
    locale === 'th' ? 'th-TH' : locale === 'en' ? 'en-US' : locale === 'zh' ? 'zh-CN' : 'ko-KR';
  return new Intl.DateTimeFormat(intl, {
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
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-inner backdrop-blur-md">
            <TjBrandElephantMark size={46} animate="breathe" />
          </span>
          <p className="text-lg font-semibold leading-relaxed tracking-tight text-white/95 md:text-xl">
            현지 제보와 운영팀 교차 확인으로 태국 전역의 한인 생활·레저 업소 정보를 실시간 정리 중입니다...
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
  /** 0건일 때만 레이더 플레이스홀더 — 행이 있으면 즉시 리스트 */
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
      categoryFilter === 'all' ? inRegion : inRegion.filter((r) => r.category === categoryFilter);
    const rank = (r: KoreanBizRow) => {
      let s = 0;
      if (r.is_verified) s += 10_000;
      if (r.contact_link_ok === false) s -= 4_000;
      const line = normalizeExternalChatUrl(r.line_url);
      const wa =
        normalizeExternalChatUrl(r.whatsapp_url) ?? buildWhatsAppUrlFromPhone(r.phone);
      const hasChat = Boolean(line || wa);
      const contactChannelOk = r.contact_link_ok === true && hasChat;
      if (contactChannelOk) s += 3_500;
      else if (r.contact_link_ok === true) s += 400;
      if (hasChat) s += 900;
      if (
        (isLikelySyntheticOrDemoPhone(r.phone) || isDemoKoreanBizPlaceId(r.google_place_id)) &&
        !hasChat
      ) {
        s -= 300;
      }
      return s;
    };
    return [...base].sort((a, b) => {
      const d = rank(b) - rank(a);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name, 'ko');
    });
  }, [inRegion, categoryFilter]);

  const contactLead =
    locale === 'th'
      ? 'แชททันที (LINE / WhatsApp)'
      : '채팅 우선 (LINE / WhatsApp)';
  const chatCta = locale === 'th' ? 'แชทเลย' : '채팅하기';
  const chatAltLine = locale === 'th' ? 'เปิด LINE' : 'LINE으로';
  const chatAltWa = locale === 'th' ? 'WhatsApp' : 'WhatsApp으로';
  const phoneMissing =
    locale === 'th'
      ? 'ไม่มีเบอร์โทร'
      : locale === 'en'
        ? 'No phone on file'
        : locale === 'zh'
          ? '暂无电话'
          : '전화번호 없음';
  const contactVerifying =
    locale === 'th'
      ? 'กำลังตรวจสอบเบอร์โทรจริง — แนะนำให้เปิดแผนที่หรือแจ้งข้อมูลเพิ่ม'
      : locale === 'en'
        ? 'Verifying real contact details — use Maps or suggest an update.'
        : locale === 'zh'
          ? '正在核对真实电话 — 建议使用地图或向我们补充。'
          : '실제 연락처 확인 중. 전화·채팅 링크는 숨겨 두었습니다. 아래 구글맵으로 위치만 확인해 주세요.';
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
      : `✅ 운영팀 최근 검증: ${formatVerifiedAt(iso, locale)}`;

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
            마트 · 약국 · 병원 · 렌트 · 골프 · 스파 — 검증된 연락처를 한곳에서
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
          마트 · 약국 · 병원 · 렌트 · 골프 · 스파 — 검증된 연락처를 한곳에서
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
            const catLabel = CATEGORY_LABEL[locale][row.category];
            const integrityPending =
              isDemoKoreanBizPlaceId(row.google_place_id) ||
              isLikelySyntheticOrDemoPhone(row.phone);
            const lineU = integrityPending ? null : normalizeExternalChatUrl(row.line_url);
            const waStored = integrityPending ? null : normalizeExternalChatUrl(row.whatsapp_url);
            const waDerived = integrityPending ? null : buildWhatsAppUrlFromPhone(row.phone);
            const waU = waStored ?? waDerived;
            const phoneDisplay =
              !integrityPending &&
              !isMaskedOrPlaceholderPhone(row.phone) &&
              row.phone?.trim()
                ? row.phone.trim()
                : null;
            const contactBroken = row.contact_link_ok === false && !integrityPending;
            const checkingLabel = locale === 'th' ? 'กำลังตรวจสอบลิงก์' : '연락 링크 확인 중';
            const chatPrimary = integrityPending ? null : lineU ?? waU;
            const chatSecondary =
              integrityPending || !(lineU && waU)
                ? null
                : chatPrimary === lineU
                  ? waU
                  : lineU;
            const contactChannelOk =
              !integrityPending && row.contact_link_ok === true && Boolean(lineU || waU);
            const channelBadge =
              locale === 'th' ? 'ลิงก์ติดต่อยืนยัน' : '연락 인증됨';
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
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {contactChannelOk ? (
                          <span className="rounded-full border border-emerald-400/55 bg-emerald-950/55 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-100">
                            {channelBadge}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-cyan-400/40 bg-cyan-950/50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cyan-100">
                          {catLabel}
                        </span>
                      </div>
                    </div>
                    {!row.is_verified ? (
                      <p className="text-xs font-semibold text-rose-300/95">
                        {locale === 'th' ? 'ต้องตรวจสอบสถานะ' : '영업 상태 확인 필요'}
                      </p>
                    ) : null}
                    {integrityPending ? (
                      <p className="text-xs font-semibold text-amber-200/95">⏳ {contactVerifying}</p>
                    ) : null}
                    {contactBroken ? (
                      <p className="text-xs font-semibold text-amber-200/95">⚠ {checkingLabel}</p>
                    ) : null}
                    {row.address ? (
                      <Link
                        href={mapsHref(row)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm leading-relaxed text-sky-200/95 underline decoration-sky-400/40 underline-offset-2 transition hover:text-white"
                      >
                        <span aria-hidden className="mr-1">
                          📍
                        </span>
                        {row.address}
                      </Link>
                    ) : null}
                    <div className="mt-auto border-t border-white/10 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-200/85">
                        {contactLead}
                      </p>
                      <div className="mt-2 flex flex-col gap-2">
                        {chatPrimary ? (
                          <Link
                            href={chatPrimary}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-violet-400/50 bg-gradient-to-r from-violet-600/35 to-fuchsia-600/25 px-3 py-2.5 text-center text-sm font-black text-white no-underline shadow-[0_0_28px_rgba(167,139,250,0.25)] transition hover:border-violet-300/70"
                          >
                            {chatCta}
                          </Link>
                        ) : null}
                        {chatSecondary ? (
                          <Link
                            href={chatSecondary}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-center text-xs font-semibold text-emerald-200/90 underline decoration-emerald-500/40 underline-offset-2 hover:text-emerald-50"
                          >
                            {chatSecondary === lineU ? chatAltLine : chatAltWa}
                          </Link>
                        ) : null}
                        {phoneDisplay ? (
                          <a
                            href={`tel:${phoneDisplay.replace(/\s/g, '')}`}
                            className="text-center font-mono text-sm font-semibold tracking-wide text-amber-100/95 underline decoration-amber-500/50 underline-offset-2 hover:text-amber-50"
                          >
                            {phoneDisplay}
                          </a>
                        ) : !chatPrimary ? (
                          <p className="text-center font-mono text-sm font-semibold text-gray-500">
                            {integrityPending
                              ? locale === 'th'
                                ? 'ดูแผนที่ด้านบน'
                                : locale === 'en'
                                  ? 'See Maps above'
                                  : locale === 'zh'
                                    ? '请使用上方地图'
                                    : '위 지도 링크를 참고해 주세요'
                              : phoneMissing}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {row.address ? (
                      <Link
                        href={mapsHref(row)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-center text-xs font-semibold text-emerald-200/80 underline decoration-emerald-500/35 underline-offset-2 hover:text-emerald-100"
                      >
                        {mapsCta}
                      </Link>
                    ) : (
                      <Link
                        href={mapsHref(row)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-emerald-400/45 bg-emerald-950/40 px-3 py-2 text-center text-sm font-bold text-emerald-50 no-underline shadow-[0_0_24px_rgba(52,211,153,0.14)] transition hover:border-emerald-300/65 hover:bg-emerald-900/50"
                      >
                        {mapsCta}
                      </Link>
                    )}
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/15 bg-black/30 px-2 py-1.5">
                      <span className="shrink-0 text-[11px] text-emerald-200/75">
                        {locale === 'th' ? 'ยอดดู' : '조회'}{' '}
                        <span className="font-mono font-semibold text-emerald-100">
                          {getKoreanBizDisplayViews(row.id)}
                        </span>
                      </span>
                      <span className="min-w-0 truncate text-right text-[10px] italic text-amber-100/85">
                        {koreanBizCommunityWhisper(row.id, locale === 'th' ? 'th' : 'ko')}
                      </span>
                    </div>
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
