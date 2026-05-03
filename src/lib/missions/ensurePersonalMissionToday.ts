import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export type PersonalMissionBrief = {
  title: string;
  body: string;
  cta_href: string;
  mission_kind: string;
};

function seoulTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * `user_activity_logs` 최근 7일을 보고 규칙 기반으로 오늘(서울) 개인 미션 1건을 upsert.
 * (LLM 연동 시 이 함수 본문을 교체·보강하면 됩니다.)
 */
export async function ensurePersonalMissionToday(
  sb: SupabaseClient,
  profileId: string,
): Promise<{ row: PersonalMissionBrief | null; error: string | null }> {
  const day = seoulTodayIso();

  const { data: existing, error: exErr } = await sb
    .from('personal_missions')
    .select('title, body, cta_href, mission_kind')
    .eq('profile_id', profileId)
    .eq('mission_date', day)
    .maybeSingle();

  if (!exErr && existing && typeof (existing as { title?: unknown }).title === 'string') {
    return { row: existing as PersonalMissionBrief, error: null };
  }

  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: logs, error: logErr } = await sb
    .from('user_activity_logs')
    .select('path')
    .eq('profile_id', profileId)
    .gte('created_at', since);

  if (logErr) {
    if (logErr.message.includes('does not exist') || logErr.message.includes('schema cache')) {
      return { row: null, error: null };
    }
    return { row: null, error: logErr.message };
  }

  let communityViews = 0;
  let minihomeViews = 0;
  for (const l of logs ?? []) {
    const raw = String((l as { path?: string }).path ?? '');
    const p = raw.split('?')[0] ?? '';
    if (p.startsWith('/community')) communityViews += 1;
    if (p.startsWith('/minihome')) minihomeViews += 1;
  }

  let title = '오늘의 한 줄';
  let body = '가벼운 인사나 팁을 남겨 볼까요? 작은 글이 다음 이웃에게 닿아요.';
  let cta_href = '/boards';
  let mission_kind = 'onboarding_generic';

  if (communityViews >= 5) {
    title = '커뮤니티에 오늘 글 남기기';
    body = '최근 일주일간 광장·커뮤니티 페이지를 자주 보셨어요. 오늘은 직접 한 글을 남겨 볼까요?';
    cta_href = '/community/write';
    mission_kind = 'reader_community_write';
  } else if (minihomeViews >= 3) {
    title = '미니홈 더 둘러보기';
    body = '다른 멤버의 미니홈을 방문하며 아이디어를 모아 보세요.';
    cta_href = '/minihome';
    mission_kind = 'minihome_explorer';
  }

  const row = {
    profile_id: profileId,
    mission_date: day,
    title,
    body,
    cta_href,
    mission_kind,
  };

  const { error: upErr } = await sb.from('personal_missions').upsert(row, {
    onConflict: 'profile_id,mission_date',
  });

  if (upErr) {
    if (upErr.message.includes('does not exist') || upErr.message.includes('schema cache')) {
      return { row: null, error: null };
    }
    return { row: null, error: upErr.message };
  }

  return { row: { title, body, cta_href, mission_kind }, error: null };
}
