import Link from 'next/link';
import styles from './home-hub.module.css';
import { fetchHomeRecentCommentTicker } from './home-queries';
import { fetchUsdFx } from '@/lib/fx/fetchUsdFx';
import { createServerClient } from '@/lib/supabase/server';

async function readMyPoint(): Promise<number | null> {
  try {
    const sb = createServerClient();
    const { data: auth } = await sb.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return null;
    const { data } = await sb.from('profiles').select('point_balance').eq('id', uid).maybeSingle();
    const value = (data as { point_balance?: number } | null)?.point_balance;
    return typeof value === 'number' ? value : 0;
  } catch {
    return null;
  }
}

async function readWeatherSummary(): Promise<string> {
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,weather_code&timezone=Asia%2FBangkok';
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return '방콕 날씨 업데이트 대기중';
    const json = (await res.json()) as {
      current?: { temperature_2m?: number };
    };
    const temp = json.current?.temperature_2m;
    if (typeof temp !== 'number') return '방콕 날씨 업데이트 대기중';
    return `방콕 ${temp.toFixed(1)}°C`;
  } catch {
    return '방콕 날씨 업데이트 대기중';
  }
}

export async function HomeRightEngagementWing() {
  const [point, weather, ticker, fx] = await Promise.all([
    readMyPoint(),
    readWeatherSummary(),
    fetchHomeRecentCommentTicker(6),
    fetchUsdFx({ next: { revalidate: 1800 } }),
  ]);
  const thbKrw = fx.usdToThb > 0 ? fx.usdToKrw / fx.usdToThb : 0;

  return (
    <>
      <section className={styles.socialWingCard} aria-label="내 포인트">
        <h3 className={styles.socialWingTitle}>내 포인트 · 퀘스트</h3>
        <p className={styles.socialWingMetric}>{point == null ? '로그인 필요' : `${point.toLocaleString('ko-KR')}P`}</p>
        <p className={styles.socialWingSub}>오늘 퀘스트 참여 시 +12P ~ +28P 보상</p>
      </section>

      <section className={styles.socialWingCard} aria-label="오늘의 환율과 날씨">
        <h3 className={styles.socialWingTitle}>오늘의 환율/날씨</h3>
        <p className={styles.socialWingSub}>{weather}</p>
        <p className={styles.socialWingSub}>THB/KRW {thbKrw > 0 ? thbKrw.toFixed(2) : '—'}</p>
      </section>

      <section className={styles.socialWingCard} aria-label="실시간 최근 댓글">
        <h3 className={styles.socialWingTitle}>실시간 최근 댓글</h3>
        <ul className={styles.tickerList}>
          {ticker.rows.slice(0, 5).map((item) => (
            <li key={item.id} className={styles.tickerItem}>
              <Link href={`/community/boards/${item.id}`} className={styles.tickerLink}>
                {item.title} · 댓글 {item.comment_count}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
