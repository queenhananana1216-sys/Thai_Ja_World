import 'server-only';

import type { Locale } from '@/i18n/types';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { fetchThailandCitiesWeather, type ThailandCityWeather } from '@/lib/weather/fetchThailandCitiesWeather';
import { wmoIsPrecipitation } from '@/lib/weather/wmoWeatherCode';

function rngHourSeed(hourBucket: number, locale: string): number {
  let acc = (hourBucket * 1315423911) ^ (locale === 'th' ? 0x9e3779b9 : 0x7f4a7c15);
  acc = Math.imul(acc ^ (acc >>> 16), 2246822519) >>> 0;
  return acc >>> 0;
}

function pick<T>(arr: readonly T[], seed: number, i: number): T {
  const idx = (seed + i * 2654435761) >>> 0;
  return arr[idx % arr.length]!;
}

function namesKo(seed: number): string[] {
  const a = ['익명', '방콕러', '파타야주민', 'CM드라이버', '한끼여행자', '비자러너', 'Udoner'];
  return [pick(a, seed, 0), pick(a, seed ^ 1, 1), pick(a, seed ^ 2, 2)];
}

function namesTh(seed: number): string[] {
  const a = ['ผู้ใช้', 'คนกรุงเทพ', 'พัทยา', 'เชียงใหม่', 'นักเดินทาง', 'เพื่อนวีซ่า'];
  return [pick(a, seed, 0), pick(a, seed ^ 1, 1), pick(a, seed ^ 2, 2)];
}

function vitalityFactor(cities: ThailandCityWeather[]): { rain: boolean; hot: boolean; tempAvg: number | null } {
  if (!cities.length) return { rain: false, hot: false, tempAvg: null };
  const temps = cities.map((c) => c.temperature_c).filter((t): t is number => typeof t === 'number');
  const tempAvg = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
  const rain = cities.some((c) => wmoIsPrecipitation(c.weather_code));
  const hot = tempAvg != null && tempAvg >= 33;
  return { rain, hot, tempAvg };
}

async function fetchRecentVitalityFacts(loc: 'ko' | 'th'): Promise<string[]> {
  if (!isServiceRoleConfigured()) return [];
  try {
    const sb = createServiceRoleClient();
    const { data: bp } = await sb
      .from('board_posts')
      .select('title')
      .order('created_at', { ascending: false })
      .limit(2);
    const { data: posts } = await sb
      .from('posts')
      .select('title')
      .eq('moderation_status', 'safe')
      .order('created_at', { ascending: false })
      .limit(1);
    const out: string[] = [];
    for (const row of bp ?? []) {
      const t = String(row.title ?? '').trim();
      if (!t) continue;
      const short = t.length > 36 ? `${t.slice(0, 34)}…` : t;
      out.push(
        loc === 'th'
          ? `มีคนกำลังอ่านโพสต์「${short}」`
          : `누군가 방금 「${short}」 글을 읽었습니다`,
      );
    }
    const pt = String(posts?.[0]?.title ?? '').trim();
    if (pt) {
      const short = pt.length > 36 ? `${pt.slice(0, 34)}…` : pt;
      out.push(
        loc === 'th'
          ? `HOT: 「${short}」กำลังถูกเปิดอ่าน`
          : `실시간: 「${short}」 조회가 이어지고 있어요`,
      );
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * 날씨 + 최근 DB 활동 + 합성 문구로 하단 티커 생성(API 캐시 1분).
 */
export async function buildPortalVitalityTickerLines(locale: Locale): Promise<string[]> {
  const loc: 'ko' | 'th' = locale === 'th' ? 'th' : 'ko';
  const { cities } = await fetchThailandCitiesWeather(locale);
  const now = Date.now();
  const hourBucket = Math.floor(now / 3_600_000);
  const seed = rngHourSeed(hourBucket, loc);
  const { rain, hot, tempAvg } = vitalityFactor(cities);
  const [n1, n2, n3] = loc === 'th' ? namesTh(seed) : namesKo(seed);
  const thaiAmt = 30 + ((seed >>> 3) % 120);
  const facts = await fetchRecentVitalityFacts(loc);

  const ko: string[] = [
    `${n1}님이 꿀팁에 북마크했어요 · +${thaiAmt} 타이(THAI) 적립 중`,
    `${n2}님이 커뮤니티에서 +50 타이를 획득했습니다`,
    `실시간: 누군가 번개장터에서 거래 메시지를 보냈습니다`,
    `${n3}님이 오늘의 미션을 클리어했습니다`,
    `지금 이 순간에도 새 꿀팁이 검수 파이프라인을 통과하고 있어요`,
  ];

  if (rain) {
    ko.unshift('비 오는 날엔 실내 동선·MRT 환승 꿀팁이 인기 급상승 중입니다');
  }
  if (hot) {
    ko.push(`기온 ${tempAvg != null ? Math.round(tempAvg) : '고'}° 부근 — 에어컨 실내 휴식 꿀팁 조회가 늘고 있어요`);
  }
  for (const f of facts) {
    if (!ko.includes(f)) ko.unshift(f);
  }

  const th: string[] = [
    `${n1} กดบุ๊กมาร์กทิป · +${thaiAmt} THAI`,
    `${n2} รับ +50 THAI จากชุมชน`,
    `ตลาดมือสอง: มีข้อความใหม่`,
    `${n3} เคลียร์ภารกิจวันนี้แล้ว`,
  ];
  if (rain) {
    th.unshift('วันฝนตก: ทิปเดินทางในร่มและ MRT กำลังฮิต');
  }
  if (hot) {
    th.push(`อุณหภูมิสูง — ทิพพักในห้องแอร์ถูกเปิดอ่านมากขึ้น`);
  }
  for (const f of facts) {
    if (!th.includes(f)) th.unshift(f);
  }

  return loc === 'th' ? th : ko;
}
