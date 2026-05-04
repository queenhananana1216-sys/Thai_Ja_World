import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale } from '@/i18n/get-locale';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import {
  fetchThailandCitiesWeather,
  type ThailandCityWeather,
} from '@/lib/weather/fetchThailandCitiesWeather';

const CITY_NAMES_KO: Record<ThailandCityWeather['key'], string> = {
  bangkok: '방콕',
  pattaya: '파타야',
  chiang_mai: '치앙마이',
};

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const ui = await loadSiteUiSettings();
  const url = absoluteUrl('/weather');
  const title = `${ui.siteDisplayName} — 날씨(방콕·파타야·치앙마이)`;
  const description = trimForMetaDescription(
    'Open-Meteo 실측 기반 태국 3도시 현재 기온·하늘 상태. 알림·위젯에서 이 페이지로 연결됩니다.',
  );
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: ui.siteDisplayName,
      locale: 'ko_KR',
    },
  };
}

export default async function WeatherHubPage() {
  const locale = await getLocale();
  const th = locale === 'th';
  const { cities, updatedAt } = await fetchThailandCitiesWeather(locale);

  return (
    <main className="mx-auto min-h-[60vh] max-w-lg px-4 py-10 text-slate-100">
      <nav className="mb-6 text-sm">
        <Link href="/" className="text-violet-300 no-underline hover:underline">
          {th ? 'กลับหน้าแรก' : '홈으로'}
        </Link>
      </nav>
      <h1 className="text-2xl font-black tracking-tight text-white">
        {th ? 'สภาพอากาศ 3 เมืองหลัก' : '태국 주요 3도시 날씨'}
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        {th
          ? 'ข้อมูลจาก Open-Meteo · รีเฟรชประมาณทุก 1–10 นาที'
          : 'Open-Meteo 실측 · 약 10분 단위로 갱신됩니다.'}
      </p>

      <ul className="mt-8 space-y-3 rounded-xl border border-white/10 bg-slate-900/80 p-4 shadow-inner ring-1 ring-white/5">
        {cities.length > 0 ? (
          cities.map((c) => {
            const name =
              th ? (c.key === 'chiang_mai' ? 'เชียงใหม่' : c.key.replace('_', ' ')) : CITY_NAMES_KO[c.key] ?? c.key;
            return (
              <li
                key={c.key}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/5 pb-3 last:border-0 last:pb-0"
              >
                <span className="font-bold text-white">{name}</span>
                <span className="text-right text-sm text-slate-300">
                  {c.temperature_c != null ? `${c.temperature_c}°C` : '—'}{' '}
                  <span className="text-slate-500">{c.condition}</span>
                </span>
              </li>
            );
          })
        ) : (
          <li className="text-sm text-amber-200/90">
            {th ? 'โหลดสภาพอากาศไม่ได้ ลองรีเฟรช' : '날씨를 불러오지 못했습니다. 새로고침 해 주세요.'}
          </li>
        )}
      </ul>

      {updatedAt ? (
        <p className="mt-4 text-center text-xs text-slate-500">
          {new Date(updatedAt).toLocaleString(th ? 'th-TH' : 'ko-KR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      ) : null}
    </main>
  );
}
