import Link from 'next/link';
import styles from './home-hub.module.css';
import { fetchHomeRecentCommentTicker } from './home-queries';
import { fetchUsdFx } from '@/lib/fx/fetchUsdFx';
import { createServerClient } from '@/lib/supabase/server';

type QuestProgressSummary = {
  completed: number;
  total: number;
  ratio: number;
};

async function readMyPoint(): Promise<number | null> {
  try {
    const sb = createServerClient();
    const { data: auth } = await sb.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return null;
    const { data } = await sb
      .from('profiles')
      .select('point_balance, dotori_balance')
      .eq('id', uid)
      .maybeSingle();
    const value =
      (data as { point_balance?: number; dotori_balance?: number } | null)?.point_balance ??
      (data as { point_balance?: number; dotori_balance?: number } | null)?.dotori_balance;
    return typeof value === 'number' ? value : 0;
  } catch {
    return null;
  }
}

async function readQuestProgress(uid: string): Promise<QuestProgressSummary | null> {
  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('user_weekly_quest_progress')
      .select('progress_count, completed_at')
      .eq('profile_id', uid);
    if (error) return null;
    const rows = data ?? [];
    if (rows.length === 0) return { completed: 0, total: 0, ratio: 0 };
    const completed = rows.filter((row) => Boolean(row.completed_at)).length;
    const total = rows.length;
    const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, ratio };
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
  const sb = createServerClient();
  const { data: auth } = await sb.auth.getUser();
  const uid = auth.user?.id ?? null;

  const [point, weather, ticker, fx, quest] = await Promise.all([
    uid ? readMyPoint() : Promise.resolve(null),
    readWeatherSummary(),
    fetchHomeRecentCommentTicker(6),
    fetchUsdFx({ next: { revalidate: 1800 } }),
    uid ? readQuestProgress(uid) : Promise.resolve(null),
  ]);
  const thbKrw = fx.usdToThb > 0 ? fx.usdToKrw / fx.usdToThb : 0;

  return (
    <>
      <section className={styles.socialWingCard} aria-label="내 포인트">
        <h3 className={styles.socialWingTitle}>내 포인트 · 주간 퀘스트</h3>
        {uid ? (
          <div className="min-w-0">
            <p className={`${styles.socialWingMetric} truncate`}>{`${(point ?? 0).toLocaleString('ko-KR')}P`}</p>
            <p className={`${styles.socialWingSub} wrap-break-word`}>
              {quest
                ? `주간 퀘스트 ${quest.completed}/${quest.total} 완료`
                : '주간 퀘스트 진행 정보를 불러오는 중'}
            </p>
            <div className={styles.questProgressTrack} aria-hidden="true">
              <div
                className={styles.questProgressFill}
                style={{ width: `${Math.max(0, Math.min(100, quest?.ratio ?? 0))}%` }}
              />
            </div>
          </div>
        ) : (
          <Link href="/login" className={styles.loginQuestCta}>
            🚀 로그인하고 퀘스트 보상받기
          </Link>
        )}
      </section>

      <section className={styles.socialWingCard} aria-label="오늘의 환율과 날씨">
        <h3 className={`${styles.socialWingTitle} truncate`}>오늘의 환율/날씨</h3>
        <p className={`${styles.socialWingSub} wrap-break-word`}>{weather}</p>
        <p className={`${styles.socialWingSub} wrap-break-word`}>THB/KRW {thbKrw > 0 ? thbKrw.toFixed(2) : '—'}</p>
      </section>

      <section className={styles.socialWingCard} aria-label="실시간 최근 댓글">
        <h3 className={`${styles.socialWingTitle} truncate`}>실시간 최근 댓글</h3>
        <ul className={styles.tickerList}>
          {ticker.rows.slice(0, 5).map((item) => (
            <li key={item.id} className={styles.tickerItem}>
              <Link href={`/community/boards/${item.id}`} className={`${styles.tickerLink} min-w-0 wrap-break-word`}>
                {item.title} · 댓글 {item.comment_count}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
