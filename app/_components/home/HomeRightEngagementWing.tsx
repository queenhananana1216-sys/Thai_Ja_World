import Link from 'next/link';
import styles from './home-hub.module.css';
import { fetchHomeRecentCommentTicker, fetchHomeUxSnapshot } from './home-queries';
import { fetchUsdFx, FX_SNAPSHOT_FALLBACK } from '@/lib/fx/fetchUsdFx';
import { createServerClient } from '@/lib/supabase/server';

type QuestProgressSummary = {
  completed: number;
  total: number;
  ratio: number;
};

async function readMyMinihomeHref(uid: string): Promise<string> {
  try {
    const sb = createServerClient();
    const { data } = await sb.from('user_minihomes').select('public_slug').eq('owner_id', uid).maybeSingle();
    const slug = typeof data?.public_slug === 'string' ? data.public_slug.trim() : '';
    return slug ? `/minihome/${encodeURIComponent(slug)}` : '/minihome';
  } catch {
    return '/minihome';
  }
}

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

function buildUxCuration(totals: Awaited<ReturnType<typeof fetchHomeUxSnapshot>>['totals']) {
  const localViews = Number(totals?.local_views ?? 0);
  const localQrClicks = Number(totals?.local_qr_click ?? 0);
  const localMinihomeClicks = Number(totals?.local_minihome_click ?? 0);
  const dwellSeconds = Number(totals?.avg_dwell_seconds ?? 0);
  const deadClickRate = Number(totals?.dead_click_rate ?? 0);

  const cards = [
    { href: '/local', label: '로컬 예약', hint: '근처 한인 가게·예약 바로가기', score: 20 + localViews * 1.8 },
    { href: '/community/boards?cat=info', label: '생활 정보', hint: '비자·정착 실시간 정보', score: 18 + dwellSeconds * 0.2 },
    { href: '/community/boards', label: '자유 게시판', hint: '지금 올라오는 교민 대화', score: 16 + (1 - deadClickRate) * 12 },
    { href: '/minihome', label: '미니홈', hint: '단골·일촌 업데이트 확인', score: 14 + localMinihomeClicks * 1.7 },
    { href: '/community/trade', label: '번개장터', hint: '중고 거래·긴급 나눔', score: 12 + localQrClicks * 1.5 },
  ];

  return cards.sort((a, b) => b.score - a.score).slice(0, 3);
}

export async function HomeRightEngagementWing() {
  let uid: string | null = null;
  let point: number | null = null;
  let myMinihomeHref: string | null = null;
  let weather = '방콕 날씨 업데이트 대기중';
  let ticker: Awaited<ReturnType<typeof fetchHomeRecentCommentTicker>> = { rows: [], error: null };
  let fx: Awaited<ReturnType<typeof fetchUsdFx>> = FX_SNAPSHOT_FALLBACK;
  let quest: QuestProgressSummary | null = null;
  let uxSnapshot: Awaited<ReturnType<typeof fetchHomeUxSnapshot>> = { window_start: null, totals: null, error: null };

  try {
    const sb = createServerClient();
    const { data: auth } = await sb.auth.getUser();
    uid = auth.user?.id ?? null;
    [point, weather, ticker, fx, quest, uxSnapshot] = await Promise.all([
      uid ? readMyPoint() : Promise.resolve(null),
      readWeatherSummary(),
      fetchHomeRecentCommentTicker(6),
      fetchUsdFx({ next: { revalidate: 1800 } }),
      uid ? readQuestProgress(uid) : Promise.resolve(null),
      fetchHomeUxSnapshot(),
    ]);
    if (uid) {
      myMinihomeHref = await readMyMinihomeHref(uid);
    }
  } catch {
    // 우측 윙은 실패해도 전체 홈 렌더를 깨지 않게 안전 기본값 유지
  }
  const thbKrw = (fx?.usdToThb ?? 0) > 0 ? (fx?.usdToKrw ?? 0) / (fx?.usdToThb ?? 1) : 0;
  const curatedCards = buildUxCuration(uxSnapshot?.totals ?? null);

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
            {myMinihomeHref ? (
              <Link
                href={myMinihomeHref}
                className={`${styles.loginQuestCta} mt-3 block text-center`}
              >
                🏠 내 미니홈 열기
              </Link>
            ) : null}
          </div>
        ) : (
          <Link href="/auth/login?next=%2F" className={styles.loginQuestCta}>
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
          {(ticker.rows ?? []).slice(0, 5).map((item) => (
            <li key={item.id} className={styles.tickerItem}>
              <Link href={`/community/boards/${item.id}`} className={`${styles.tickerLink} min-w-0 wrap-break-word`}>
                {item.title} · 댓글 {item.comment_count}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.socialWingCard} aria-label="UX 기반 맞춤 큐레이션">
        <h3 className={`${styles.socialWingTitle} truncate`}>지금 추천 동선</h3>
        <ul className={styles.tickerList}>
          {(curatedCards ?? []).map((card) => (
            <li key={card.href} className={styles.tickerItem}>
              <Link href={card.href} className={`${styles.tickerLink} min-w-0 wrap-break-word`}>
                {card.label} · {card.hint}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
