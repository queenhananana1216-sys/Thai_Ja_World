import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';

type RunQuestCronCycleOptions = {
  targetDate?: string;
  includeWeatherEvent?: boolean;
  includeNewsEvent?: boolean;
  settleLimit?: number;
};

type RunQuestCronCycleResult = {
  spawnedBase: number;
  weatherQuestCode?: string | null;
  newsQuestCode?: string | null;
  trafficQuestCode?: string | null;
  settledCount: number;
};

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toSafeDate(raw?: string): string {
  if (!raw?.trim()) return ymd(new Date());
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return ymd(new Date());
  return ymd(d);
}

async function createWeatherEventQuest(targetDate: string): Promise<string | null> {
  const res = await fetch(
    'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,weather_code&timezone=Asia%2FBangkok',
    { cache: 'no-store' },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };

  const temp = data.current?.temperature_2m ?? null;
  const weatherCode = data.current?.weather_code ?? null;
  const isHeat = typeof temp === 'number' && temp >= 35;
  const isRain = typeof weatherCode === 'number' && weatherCode >= 61;
  if (!isHeat && !isRain) return null;

  const questCode = isHeat ? `event_weather_heat_${targetDate}` : `event_weather_rain_${targetDate}`;

  const admin = createServiceRoleClient();
  await admin.rpc('quest_create_event_quest', {
    p_quest_code: questCode,
    p_title_ko: isHeat ? 'Heat check-in quest' : 'Rainy season check-in quest',
    p_title_th: isHeat ? 'Heat check-in quest' : 'Rainy season check-in quest',
    p_event_type: 'daily_checkin',
    p_goal_count: 1,
    p_reward_corn: isHeat ? 22 : 18,
    p_conditions: {
      signal: 'weather',
      target_date: targetDate,
      temperature_c: temp,
      weather_code: weatherCode,
    },
  });
  return questCode;
}

async function createNewsEventQuest(targetDate: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const sinceIso = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from('processed_news')
    .select('id, clean_body, created_at')
    .eq('published', true)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;

  const payload =
    data.clean_body && typeof data.clean_body === 'object' && !Array.isArray(data.clean_body)
      ? (data.clean_body as Record<string, unknown>)
      : {};
  const ko =
    payload.ko && typeof payload.ko === 'object' && !Array.isArray(payload.ko)
      ? (payload.ko as Record<string, unknown>)
      : {};
  const title = typeof ko.title === 'string' && ko.title.trim() ? ko.title.trim() : 'Daily news briefing';
  const questCode = `event_news_brief_${targetDate}_${String(data.id).slice(0, 8)}`;

  await admin.rpc('quest_create_event_quest', {
    p_quest_code: questCode,
    p_title_ko: 'Daily news briefing participation',
    p_title_th: 'Daily news briefing participation',
    p_event_type: 'write_post',
    p_goal_count: 1,
    p_reward_corn: 24,
    p_conditions: {
      signal: 'news',
      target_date: targetDate,
      processed_news_id: data.id,
      headline: title,
    },
  });

  return questCode;
}

async function createHighTrafficQuest(targetDate: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const sinceIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data } = await admin
    .from('ux_metrics_5m')
    .select('totals, window_start')
    .gte('window_start', sinceIso)
    .order('window_start', { ascending: false })
    .limit(2);

  const rows = (data ?? []) as Array<{ totals?: Record<string, unknown> | null }>;
  if (rows.length === 0) return null;

  let pageViews = 0;
  let deadClicks = 0;
  for (const row of rows) {
    const totals =
      row.totals && typeof row.totals === 'object' && !Array.isArray(row.totals)
        ? (row.totals as Record<string, unknown>)
        : {};
    const pv = Number(totals.page_view ?? 0);
    const dc = Number(totals.dead_click ?? 0);
    pageViews += Number.isFinite(pv) ? pv : 0;
    deadClicks += Number.isFinite(dc) ? dc : 0;
  }
  if (pageViews < 180) return null;

  const deadClickRate = pageViews > 0 ? deadClicks / pageViews : 0;
  const questCode = `event_traffic_comment_${targetDate}`;
  await admin.rpc('quest_create_event_quest', {
    p_quest_code: questCode,
    p_title_ko: 'High-traffic engagement quest',
    p_title_th: 'High-traffic engagement quest',
    p_event_type: 'send_reaction',
    p_goal_count: deadClickRate >= 0.08 ? 3 : 2,
    p_reward_corn: deadClickRate >= 0.08 ? 30 : 24,
    p_conditions: {
      signal: 'ux_metrics_5m',
      target_date: targetDate,
      page_views_10m: pageViews,
      dead_click_rate: deadClickRate,
    },
  });
  return questCode;
}

export async function runQuestCronCycle(
  options: RunQuestCronCycleOptions = {},
): Promise<RunQuestCronCycleResult> {
  const targetDate = toSafeDate(options.targetDate);
  const includeWeatherEvent = options.includeWeatherEvent !== false;
  const includeNewsEvent = options.includeNewsEvent !== false;
  const settleLimit = Math.min(500, Math.max(20, Math.floor(options.settleLimit ?? 200)));
  const admin = createServiceRoleClient();

  const { data: spawnedRaw } = await admin.rpc('quest_spawn_base_instances', {
    p_target_date: targetDate,
  });

  const weatherQuestCode = includeWeatherEvent ? await createWeatherEventQuest(targetDate) : null;
  const newsQuestCode = includeNewsEvent ? await createNewsEventQuest(targetDate) : null;
  const trafficQuestCode = await createHighTrafficQuest(targetDate);

  const { data: settledRaw } = await admin.rpc('quest_settle_completed_rewards', {
    p_limit: settleLimit,
  });
  const settledObj =
    settledRaw && typeof settledRaw === 'object' && !Array.isArray(settledRaw)
      ? (settledRaw as Record<string, unknown>)
      : null;
  const settledCount = settledObj && typeof settledObj.settled === 'number' ? settledObj.settled : 0;

  return {
    spawnedBase: typeof spawnedRaw === 'number' ? spawnedRaw : 0,
    weatherQuestCode,
    newsQuestCode,
    trafficQuestCode,
    settledCount,
  };
}
