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

const card =
  'rounded-lg border border-white/10 bg-slate-900/90 p-3 shadow-sm ring-1 ring-white/5 backdrop-blur-sm';
const link = 'text-violet-300 no-underline hover:text-violet-200';

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
    <div
      className="border-t border-white/10 bg-slate-950"
      style={{
        background: 'linear-gradient(180deg, #0a0b1a 0%, #020617 40%, #020617 100%)',
      }}
    >
      <div
        className="pointer-events-none h-2 shrink-0 bg-gradient-to-b from-[#0c0d1e] to-slate-950"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6">
        <div className={`mb-4 ${card} p-3`}>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="m-0 text-sm font-extrabold text-slate-100">
              {th
                ? 'เริ่มที่นี่ — ขาย · หางาน · ร้าน · มินิฮอม'
                : '시작 가이드 — 번개 · 구인 · 로컬 · 미니홈'}
            </h2>
            <p className="m-0 text-[11px] text-slate-500">
              {th
                ? `อัปเดต ${new Date(entryFlow.generatedAt).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}`
                : `엔트리 ${new Date(entryFlow.generatedAt).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}`}
            </p>
          </div>
          <EntryFlowQuickRow flow={entryFlow} locale={locale} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          <aside className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-3">
            <div className={`flex items-center gap-2 ${card} p-3 text-sm`}>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-800/80 text-slate-300"
                aria-hidden
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="m-0 text-xs text-slate-400">{locale === 'th' ? 'เข้าสู่ระบบ' : '로그인'}</p>
                <p className="m-0 mt-0.5 text-sm font-extrabold text-slate-100">
                  {locale === 'th' ? 'ร่วมกระดาน' : '광장·거래에 참여'}
                </p>
                <Link href="/auth/login" className={`mt-1 inline-block text-xs font-bold ${link}`} prefetch={false}>
                  {locale === 'th' ? 'ลงชื่อเข้า' : '로그인하기 →'}
                </Link>
              </div>
            </div>
            <div className={`${card} p-3 text-sm`}>
              <p className="m-0 text-xs font-bold text-slate-400">
                {locale === 'th' ? 'ร้านที่เปิด' : '공개 로컬'}
              </p>
              <p className="mt-1 m-0 text-2xl font-extrabold text-slate-100">{spotN}</p>
              {spotN === 0 ? (
                <p className="mt-2 m-0 text-xs leading-relaxed text-slate-400">
                  {locale === 'th'
                    ? 'ยังไม่มีร้านที่อนุมัติ — แต่คุณสำรวจฮับได้'
                    : '아직 승인된 가게가 없어요. 로컬 허브는 계속 열려 있습니다.'}
                </p>
              ) : null}
              <Link className={`mt-2 inline-block text-xs font-bold ${link}`} href="/local" prefetch={false}>
                {locale === 'th' ? 'ดู /local' : '로컬 둘러보기 →'}
              </Link>
            </div>

            <div className="flex flex-col gap-2 text-xs text-slate-400">
              <p className="m-0 font-extrabold text-slate-200">{locale === 'th' ? 'ฉุกเฉิน' : '비상'}</p>
              <p className="m-0 leading-relaxed">191, 199 · Tourist police 1155</p>
            </div>

            <div className={`${card} p-3 text-sm`}>
              <p className="m-0 text-xs font-bold text-slate-400">
                {th ? 'สรุปฐาน' : '사이트 집계'}
                {stats.degraded ? (
                  <span className="ml-1.5 text-[10px] font-normal text-amber-400/90">({th ? 'อ้างอิง' : '참고'})</span>
                ) : null}
              </p>
              <p className="mt-1 m-0 text-[11px] leading-relaxed text-slate-300">
                {th ? (
                  <>
                    สมาชิก <strong className="text-slate-100">{stats.memberCount.toLocaleString('th-TH')}</strong> ·
                    โพสต์ <strong className="text-slate-100">{stats.postCount.toLocaleString('th-TH')}</strong> ·
                    ข่าว <strong className="text-slate-100">{stats.newsCount.toLocaleString('th-TH')}</strong>
                  </>
                ) : (
                  <>
                    가입 <strong className="text-slate-100">{stats.memberCount.toLocaleString('ko-KR')}</strong> ·
                    게시 <strong className="text-slate-100">{stats.postCount.toLocaleString('ko-KR')}</strong> ·
                    뉴스 <strong className="text-slate-100">{stats.newsCount.toLocaleString('ko-KR')}</strong>
                  </>
                )}
              </p>
              <Link
                className={`mt-2 inline-block text-xs font-bold ${link}`}
                href="/community/boards"
                prefetch={false}
              >
                {th ? 'ไปกระดาน' : '광장 열기 →'}
              </Link>
            </div>
          </aside>

          <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-2 lg:col-span-6">
            {hasAnyPulse ? (
              <>
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                    @media (min-width: 1024px) {
                      .tj-portal-pulse-grid { display: grid; gap: 10px; grid-template-columns: repeat(${tabColumns.length}, minmax(0,1fr)); }
                    }
                    a.tj-pulse-row:hover { background: rgba(255,255,255,0.06) !important; }
                    a.tj-pulse-row:focus-visible { outline: 2px solid #a78bfa; outline-offset: 1px; }
                  `,
                  }}
                />
                <section aria-labelledby="tj-portal-pulse" className="min-w-0">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <h2 id="tj-portal-pulse" className="m-0 text-sm font-extrabold text-slate-100">
                      {th ? 'ชีพจรชุมชน' : '광장 심박'}
                    </h2>
                    {pulse.degraded ? (
                      <span className="text-[10px] font-semibold text-amber-300/90">{th ? 'บางส่วน' : '일부'}</span>
                    ) : null}
                  </div>
                  <p className="m-0 mb-2 text-[11px] text-slate-500">
                    {th ? 'ข่าว · คุย · ถาม — อัปเดต' : '뉴스 · 자유 · 질문'}
                    {pulseTime ? ` · ${pulseTime}` : ''}
                  </p>
                  <div className="tj-portal-pulse-grid hidden lg:grid">
                    {tabColumns.map((col) => (
                      <PulseCard key={col.label} col={col} locale={locale} tone="dark" />
                    ))}
                  </div>
                  <div className="lg:hidden">
                    <PulseColumnTabs columns={tabColumns} locale={locale} tone="dark" />
                  </div>
                </section>
              </>
            ) : (
              <p className="m-0 rounded border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-200/90">
                {locale === 'th' ? 'ยังไม่มีเนื้อหา — รีเฟรช' : '광장 심박 데이터가 없습니다. 잠시 후 새로고침하세요.'}
              </p>
            )}

            <div className={card}>{recentPostsBlock}</div>
          </div>

          <aside className="order-3 flex flex-col gap-3 lg:col-span-3">
            <div className={`${card} p-3 text-sm`}>
              <p className="m-0 text-xs font-bold text-slate-400">{th ? 'อากาศ (3 เมือง)' : '날씨(3곳)'}</p>
              {weatherCities.length > 0 ? (
                <ul className="mt-2 m-0 list-none space-y-1.5 p-0">
                  {weatherCities.map((c) => {
                    const name = locale === 'th' ? c.key.replace('_', ' ') : CITY_NAMES_KO[c.key] ?? c.key;
                    return (
                      <li key={c.key} className="flex items-baseline justify-between gap-2 text-xs text-slate-200">
                        <span className="font-semibold">{name}</span>
                        <span className="shrink-0 text-slate-400">
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
                <p className="mt-2 m-0 text-[10px] text-slate-500">
                  {new Date(weatherUpdatedAt).toLocaleString(locale === 'th' ? 'th-TH' : 'ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : null}
            </div>

            <div className={`${card} p-3 text-sm`}>
              <p className="m-0 text-xs font-bold text-slate-400">{th ? 'อัตราแลกเปลี่ยน' : '환율(요약)'}</p>
              <p className="mt-1 m-0 text-base font-extrabold text-slate-100">1 THB ≈ {krwPerThb(fx)} KRW</p>
              <p className="mt-0.5 m-0 text-[11px] text-slate-400">
                $1 = {Number.isFinite(fx.usdToThb) ? fx.usdToThb.toFixed(2) : '—'} THB · $1 ={' '}
                {Number.isFinite(fx.usdToKrw) ? Math.round(fx.usdToKrw).toLocaleString() : '—'} KRW
              </p>
              {fx.mock ? <p className="mt-1 m-0 text-[10px] text-amber-300/80">{th ? 'อัตราชั่วคราว' : '참고용 요율'}</p> : null}
            </div>

            <div className={`${card} p-2 text-xs`} aria-label={th ? 'ลัดไป' : '빠른 메뉴'}>
              <p className="m-0 mb-2 text-[10px] font-extrabold text-slate-500">{th ? 'ลัด' : '빠른 링크'}</p>
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
                    className="flex min-h-9 items-center justify-center rounded border border-white/10 bg-slate-800/50 text-center text-[11px] font-bold text-slate-200 no-underline transition hover:bg-slate-800/90 hover:text-slate-50"
                  >
                    {l.t}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 min-w-0 text-slate-100">
          <HomeBannerGrid locale={locale} variant="dark" />
        </div>
      </div>
    </div>
  );
}
