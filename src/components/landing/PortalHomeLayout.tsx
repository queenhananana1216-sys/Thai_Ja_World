import Link from 'next/link';
import { HomeBannerGrid } from '@/components/sections/landing/HomeBannerGrid';
import { RecentPostsFeed } from '@/components/sections/landing/RecentPostsFeed';
import { PulseCard } from '@/components/sections/landing/pulse/PulseCard';
import { PulseColumnTabs } from '@/components/sections/landing/pulse/PulseColumnTabs';
import { EntryFlowQuickRow } from '@/components/landing/EntryFlowQuickRow';
import type { CommunityPulse, PulseColumn } from '@/lib/landing/fetchCommunityPulse';
import type { EntryFlowResponse, StatsResponse } from '@/lib/landing/types';
import type { ThailandCityWeather } from '@/lib/weather/fetchThailandCitiesWeather';
import type { FxSnapshot } from '@/lib/fx/types';
import type { Locale } from '@/i18n/types';

type Props = {
  locale: Locale;
  pulse: CommunityPulse;
  entryFlow: EntryFlowResponse;
  /** fetchLandingStatsSSR: 집계 + (실패 시) degraded */
  stats: StatsResponse & { degraded?: boolean };
  /** SSR 날씨 (3도시) */
  weatherCities: ThailandCityWeather[];
  /** /api/weather·Open-Meteo */
  weatherUpdatedAt: string | null;
  /** Frankfurter USD→THB/KRW */
  fx: FxSnapshot;
};

function krwPerThb(fx: FxSnapshot): string {
  const t = (fx.usdToKrw ?? 0) / (fx.usdToThb || 1);
  if (!Number.isFinite(t) || t <= 0) return '—';
  return t.toFixed(1);
}

function pickThreePulseColumns(
  pulse: CommunityPulse,
  locale: Locale,
): { tabs: PulseColumn[]; usedFallback: boolean } {
  const { columns } = pulse;
  if (columns.length === 0) return { tabs: [], usedFallback: true };

  const firstLabel = (columns[0]?.label ?? '').toLowerCase();
  const isNews =
    firstLabel === '뉴스' ||
    firstLabel === 'ข่าว' ||
    firstLabel === 'ข่าวสาร' ||
    firstLabel.includes('news');
  if (isNews) {
    const freeCol =
      columns.find((c) => (locale === 'th' ? c.label.includes('คุย') : c.label.includes('자유'))) ?? null;
    const questionCol =
      columns.find((c) => (locale === 'th' ? c.label.includes('ถาม') : c.label.includes('질문'))) ?? null;
    const newsCol = columns[0];
    if (newsCol && freeCol && questionCol) {
      return { tabs: [newsCol, freeCol, questionCol], usedFallback: false };
    }
  }

  const withItems = columns.filter((c) => c.items.length > 0);
  if (withItems.length >= 3) {
    return { tabs: withItems.slice(0, 3), usedFallback: true };
  }
  if (columns.length >= 3) {
    return { tabs: columns.slice(0, 3), usedFallback: true };
  }
  return { tabs: columns, usedFallback: true };
}

const CITY_NAMES_KO: Record<ThailandCityWeather['key'], string> = {
  bangkok: '방콕',
  pattaya: '파타야',
  chiang_mai: '치앙마이',
};

export async function PortalHomeLayout({
  locale,
  pulse,
  entryFlow,
  stats,
  weatherCities,
  weatherUpdatedAt,
  fx,
}: Props) {
  const recentPostsBlock = await RecentPostsFeed({ locale, variant: 'portal', limit: 16 });
  const { tabs: tabColumns } = pickThreePulseColumns(pulse, locale);
  const hasAnyPulse = tabColumns.length > 0;
  const spotN = Math.max(0, stats.spotCount);
  const th = locale === 'th';
  const pulseTime =
    typeof pulse.generatedAt === 'string' && pulse.generatedAt
      ? new Date(pulse.generatedAt).toLocaleString(th ? 'th-TH' : 'ko-KR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

  return (
    <div className="border-t border-slate-200/80 bg-slate-100" style={{ background: '#f3f4f6' }}>
      <div className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6">
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="m-0 text-sm font-extrabold text-slate-900">
              {th
                ? 'เริ่มที่นี่ — ขาย · หางาน · ร้าน · มินิฮอม'
                : '시작 가이드 — 번개 · 구인 · 로컬 · 미니홈'}
            </h2>
            <p className="m-0 text-[11px] text-slate-500">
              {th
                ? `อัปเดต ${new Date(entryFlow.generatedAt).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}`
                : `엔트리 흐름 ${new Date(entryFlow.generatedAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}`}
            </p>
          </div>
          <EntryFlowQuickRow flow={entryFlow} locale={locale} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          {/* Left */}
          <aside className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600"
                aria-hidden
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="m-0 text-xs text-slate-500">{locale === 'th' ? 'เข้าสู่ระบบ' : '로그인'}</p>
                <p className="m-0 mt-0.5 text-sm font-extrabold text-slate-900">
                  {locale === 'th' ? 'ร่วมกระดาน' : '광장·거래에 참여'}
                </p>
                <Link
                  href="/auth/login"
                  className="mt-1 inline-block text-xs font-bold text-blue-600 no-underline"
                  prefetch={false}
                >
                  {locale === 'th' ? 'ลงชื่อเข้า' : '로그인하기 →'}
                </Link>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
              <p className="m-0 text-xs font-bold text-slate-500">
                {locale === 'th' ? 'ร้านที่เปิด' : '공개 로컬'}
              </p>
              <p className="mt-1 m-0 text-2xl font-extrabold text-slate-900">{spotN}</p>
              {spotN === 0 ? (
                <p className="mt-2 m-0 text-xs leading-relaxed text-slate-600">
                  {locale === 'th' ? 'ยังไม่มีร้านที่อนุมัติ — แต่คุณสำรวจฮับได้' : '아직 승인된 가게가 없어요. 로컬 허브는 계속 열려 있습니다.'}
                </p>
              ) : null}
              <Link
                className="mt-2 inline-block text-xs font-bold text-blue-600 no-underline"
                href="/local"
                prefetch={false}
              >
                {locale === 'th' ? 'ดู /local' : '로컬 둘러보기 →'}
              </Link>
            </div>

            <div className="flex flex-col gap-2 text-xs text-slate-600">
              <p className="m-0 font-extrabold text-slate-800">{locale === 'th' ? 'ฉุกเฉิน' : '비상'}</p>
              <p className="m-0 leading-relaxed">
                191, 199 · Tourist police 1155
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
              <p className="m-0 text-xs font-bold text-slate-500">
                {th ? 'สรุปฐาน' : '사이트 집계'}
                {stats.degraded ? (
                  <span className="ml-1.5 text-[10px] font-normal text-amber-700">({th ? 'อ้างอิง' : '참고'})</span>
                ) : null}
              </p>
              <p className="mt-1 m-0 text-[11px] text-slate-600 leading-relaxed">
                {th ? (
                  <>
                    สมาชิก <strong className="text-slate-900">{stats.memberCount.toLocaleString('th-TH')}</strong> ·
                    โพสต์ <strong className="text-slate-900">{stats.postCount.toLocaleString('th-TH')}</strong> ·
                    ข่าว <strong className="text-slate-900">{stats.newsCount.toLocaleString('th-TH')}</strong>
                  </>
                ) : (
                  <>
                    가입 <strong className="text-slate-900">{stats.memberCount.toLocaleString('ko-KR')}</strong> ·
                    게시 <strong className="text-slate-900">{stats.postCount.toLocaleString('ko-KR')}</strong> ·
                    뉴스 <strong className="text-slate-900">{stats.newsCount.toLocaleString('ko-KR')}</strong>
                  </>
                )}
              </p>
              <Link
                className="mt-2 inline-block text-xs font-bold text-blue-600 no-underline"
                href="/community/boards"
                prefetch={false}
              >
                {th ? 'ไปกระดาน' : '광장 열기 →'}
              </Link>
            </div>
          </aside>

          {/* Center */}
          <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-2 lg:col-span-6">
            {hasAnyPulse ? (
              <>
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                    @media (min-width: 1024px) {
                      .tj-portal-pulse-grid { display: grid; gap: 10px; grid-template-columns: repeat(${tabColumns.length}, minmax(0,1fr)); }
                    }
                    a.tj-pulse-row--light:hover { background: #f8fafc !important; }
                    a.tj-pulse-row--light:focus-visible { outline: 2px solid #93c5fd; outline-offset: 1px; }
                  `,
                  }}
                />
                <section aria-labelledby="tj-portal-pulse" className="min-w-0">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <h2 id="tj-portal-pulse" className="m-0 text-sm font-extrabold text-slate-900">
                      {th ? 'ชีพจรชุมชน' : '광장 심박'}
                    </h2>
                    {pulse.degraded ? (
                      <span className="text-[10px] font-semibold text-amber-800">
                        {th ? 'ข้อมูลบางส่วน' : '일부 요약'}
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 mb-2 text-[11px] text-slate-500">
                    {th
                      ? 'ข่าว · คุย · ถาม — อัปเดต'
                      : '뉴스 · 자유 · 질문 — 실시간'}
                    {pulseTime ? ` · ${pulseTime}` : ''}
                  </p>
                  <div className="tj-portal-pulse-grid hidden lg:grid">
                    {tabColumns.map((col) => (
                      <PulseCard key={col.label} col={col} locale={locale} tone="light" />
                    ))}
                  </div>
                  <div className="lg:hidden">
                    <PulseColumnTabs columns={tabColumns} locale={locale} tone="light" />
                  </div>
                </section>
              </>
            ) : (
              <p className="m-0 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {locale === 'th' ? 'ยังไม่มีเนื้อหา — รีเฟรช' : '광장 심박 데이터가 없습니다. 잠시 후 새로고침하세요.'}
              </p>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              {recentPostsBlock}
            </div>
          </div>

          {/* Right */}
          <aside className="order-3 flex flex-col gap-3 lg:col-span-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
              <p className="m-0 text-xs font-bold text-slate-500">
                {locale === 'th' ? 'อากาศ (3 เมือง)' : '날씨(3곳)'}
              </p>
              {weatherCities.length > 0 ? (
                <ul className="mt-2 m-0 list-none space-y-1.5 p-0">
                  {weatherCities.map((c) => {
                    const name = locale === 'th' ? c.key.replace('_', ' ') : CITY_NAMES_KO[c.key] ?? c.key;
                    return (
                      <li key={c.key} className="flex items-baseline justify-between gap-2 text-xs text-slate-800">
                        <span className="font-semibold">{name}</span>
                        <span className="shrink-0 text-slate-600">
                          {c.temperature_c != null ? `${c.temperature_c}°C` : '—'}{' '}
                          <span className="text-slate-500">{c.condition}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1 m-0 text-xs text-slate-500">
                  {locale === 'th' ? 'ไม่สามารถดึงข้อมูล' : '날씨를 불러오지 못했어요.'}
                </p>
              )}
              {weatherUpdatedAt ? (
                <p className="mt-2 m-0 text-[10px] text-slate-400">
                  {new Date(weatherUpdatedAt).toLocaleString(locale === 'th' ? 'th-TH' : 'ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
              <p className="m-0 text-xs font-bold text-slate-500">
                {locale === 'th' ? 'อัตราแลกเปลี่ยน' : '환율(요약)'}
              </p>
              <p className="mt-1 m-0 text-base font-extrabold text-slate-900">
                1 THB ≈ {krwPerThb(fx)} KRW
              </p>
              <p className="mt-0.5 m-0 text-[11px] text-slate-500">
                $1 = {Number.isFinite(fx.usdToThb) ? fx.usdToThb.toFixed(2) : '—'} THB · $1 ={' '}
                {Number.isFinite(fx.usdToKrw) ? Math.round(fx.usdToKrw).toLocaleString() : '—'} KRW
              </p>
              {fx.mock ? (
                <p className="mt-1 m-0 text-[10px] text-amber-800">{th ? 'อัตราชั่วคราว' : '참고용 요율'}</p>
              ) : null}
            </div>

            <div
              className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-sm"
              aria-label={th ? 'ลัดไป' : '빠른 메뉴'}
            >
              <p className="m-0 mb-2 text-[10px] font-extrabold text-slate-500">
                {th ? 'ลัด' : '빠른 링크'}
              </p>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { h: '/community/boards', t: th ? 'กระดาน' : '광장' },
                  { h: '/tips', t: th ? 'เคล็ดลับ' : '꿀팁' },
                  { h: '/news', t: th ? 'ข่าว' : '뉴스' },
                  { h: '/community/trade', t: th ? 'แลก' : '거래' },
                  { h: '/community/boards?cat=job', t: th ? 'งาน' : '구인' },
                  { h: '/minihome', t: th ? 'มินิ' : '미니홈' },
                  { h: '/ilchon', t: th ? 'เพื่อน' : '일촌' },
                  { h: '/chat', t: th ? 'แชท' : '채팅' },
                  { h: '/my-local-shop', t: th ? 'ร้านฉัน' : '내가게' },
                ].map((l) => (
                  <Link
                    key={l.h}
                    href={l.h}
                    prefetch={false}
                    className="flex min-h-9 items-center justify-center rounded border border-slate-200 bg-slate-50/80 text-center text-[11px] font-bold text-slate-800 no-underline hover:bg-slate-100"
                  >
                    {l.t}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 min-w-0">
          <div className="text-slate-900">
            <HomeBannerGrid locale={locale} variant="light" />
          </div>
        </div>
      </div>
    </div>
  );
}
