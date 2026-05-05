import type { SupabaseClient } from '@supabase/supabase-js';

/** 결제 성공 후 인앱 알림 — 살자 전문가 페르소나 톤 */
export async function insertThaiTopupPersonaNotification(
  admin: SupabaseClient,
  profileId: string,
  creditsAdded: number,
): Promise<void> {
  await admin.from('notifications').insert({
    user_id: profileId,
    source_type: 'billing',
    title: `오너님, 방금 새로운 타이(THAI) ${creditsAdded.toLocaleString()}이 입금됐습니다`,
    body: `태국 살이가 더 풍성해지겠네요 — 상점 스킨이나 특별 장식, 마음 가는 데부터 써 보세요. (현금은 아니지만, 미니홈 자존심에는 통하는 화폐랍니다.)`,
    href: '/minihome/shop',
  });
}

export async function insertPremiumWelcomePersonaNotification(
  admin: SupabaseClient,
  profileId: string,
  planLabel: string,
): Promise<void> {
  await admin.from('notifications').insert({
    user_id: profileId,
    source_type: 'billing',
    title: `${planLabel} 프리미엄 — 카드 확인 요!`,
    body: `Stripe 쪽 신호 들어왔습니다. 미니홈 광고·배너 부담을 덜고, 좀 더 “살자답게” 보이게 즐겨 주세요.`,
    href: '/premium',
  });
}
