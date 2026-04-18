import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { EntryFlowLane, EntryFlowResponse, EntryFlowSnapshot } from '@/lib/landing/types';

function asCount(value: number | null): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

const INTERNAL_COPY_PATTERNS: RegExp[] = [
  /자동\s*업데이트/gi,
  /추천\s*\d+/gi,
  /최근\s*\d+일\s*클릭\s*\d+회/gi,
  /클릭\s*\d+회/gi,
  /전환\s*\d+건/gi,
];

function sanitizeLandingCopy(copy: string): string {
  const normalized = copy.trim();
  const removed = INTERNAL_COPY_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, ''), normalized);
  return removed.replace(/\s{2,}/g, ' ').replace(/\s·\s$/g, '').trim();
}

function withCopyGuard(lane: EntryFlowLane): EntryFlowLane {
  return {
    ...lane,
    title: sanitizeLandingCopy(lane.title),
    description: sanitizeLandingCopy(lane.description),
    signal: sanitizeLandingCopy(lane.signal),
    primaryLabel: sanitizeLandingCopy(lane.primaryLabel),
    secondaryLabel: lane.secondaryLabel ? sanitizeLandingCopy(lane.secondaryLabel) : lane.secondaryLabel,
  };
}

function buildLanes(snapshot: EntryFlowSnapshot): EntryFlowLane[] {
  const lanes: EntryFlowLane[] = [
    {
      id: 'trade',
      title: '번개장터',
      description: '오늘 올라온 중고·거래 글을 먼저 보고 바로 문의하세요.',
      primaryHref: '/community/boards?cat=flea',
      primaryLabel: '번개장터 글 보기',
      secondaryHref: '/community/boards/new?cat=flea',
      secondaryLabel: '판매 글 올리기',
      signal: '중고 거래 글을 먼저 확인하고, 필요하면 바로 판매 글을 올려보세요.',
      score:
        snapshot.flea7d * 4 +
        snapshot.posts7d * 0.2 +
        snapshot.tradeClicks14d * 0.35 +
        snapshot.tradeConversions14d * 0.9,
    },
    {
      id: 'job',
      title: '구인구직',
      description: '채용/알바/도움 요청 글만 모아서 빠르게 확인하세요.',
      primaryHref: '/community/boards?cat=job',
      primaryLabel: '구인구직 글 보기',
      secondaryHref: '/community/boards/new?cat=job',
      secondaryLabel: '구인 글 올리기',
      signal: '채용/구직 글만 모아 보고, 조건에 맞는 공고를 빠르게 찾을 수 있어요.',
      score:
        snapshot.job7d * 4 +
        snapshot.posts7d * 0.1 +
        snapshot.jobClicks14d * 0.35 +
        snapshot.jobConversions14d * 0.9,
    },
    {
      id: 'local',
      title: '로컬 가게 예약·홍보',
      description: '당일 예약/배송 가능한 가게를 찾고, 우리 가게 홍보도 연결하세요.',
      primaryHref: '/local',
      primaryLabel: '로컬 가게 찾기',
      secondaryHref: '/ads',
      secondaryLabel: '가게 홍보 문의',
      signal: '한인 가게 정보를 보고 예약/문의까지 한 번에 이어서 진행할 수 있어요.',
      score:
        snapshot.deliveryReadyShops * 5 +
        snapshot.publishedShops * 1.5 +
        snapshot.localClicks14d * 0.35 +
        snapshot.localConversions14d * 1.1,
    },
    {
      id: 'minihome',
      title: '미니홈 · 꾸미기',
      description: '싸이월드 감성으로 내 방을 꾸미고 일촌/방명록으로 소통하세요.',
      primaryHref: '/minihome',
      primaryLabel: '미니홈 둘러보기',
      secondaryHref: '/minihome/shop',
      secondaryLabel: '꾸미기 상점 가기',
      signal: '내 공간을 꾸미고 일촌/방명록으로 편하게 소통해 보세요.',
      score:
        snapshot.minihomePublicRooms * 3 +
        snapshot.news3d * 0.5 +
        snapshot.minihomeClicks14d * 0.35 +
        snapshot.minihomeConversions14d * 0.8,
    },
  ];

  return lanes.map(withCopyGuard);
}

export async function getLandingEntryFlow(): Promise<EntryFlowResponse> {
  const fallbackSnapshot: EntryFlowSnapshot = {
    posts7d: 0,
    flea7d: 0,
    job7d: 0,
    publishedShops: 0,
    deliveryReadyShops: 0,
    minihomePublicRooms: 0,
    news3d: 0,
    tradeClicks14d: 0,
    jobClicks14d: 0,
    localClicks14d: 0,
    minihomeClicks14d: 0,
    tradeConversions14d: 0,
    jobConversions14d: 0,
    localConversions14d: 0,
    minihomeConversions14d: 0,
  };

  try {
    const admin = createServiceRoleClient();
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: posts7d },
      { count: flea7d },
      { count: job7d },
      { count: publishedShops },
      { count: deliveryReadyShops },
      { count: minihomePublicRooms },
      { count: news3d },
      { count: tradeClicks14d },
      { count: jobClicks14d },
      { count: localClicks14d },
      { count: minihomeClicks14d },
      { count: tradeConversions14d },
      { count: jobConversions14d },
      { count: localConversions14d },
      { count: minihomeGuestbook14d },
      { count: minihomeDiary14d },
    ] = await Promise.all([
      admin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'safe')
        .eq('is_knowledge_tip', false)
        .gte('created_at', since7d),
      admin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'safe')
        .eq('is_knowledge_tip', false)
        .eq('category', 'flea')
        .gte('created_at', since7d),
      admin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'safe')
        .eq('is_knowledge_tip', false)
        .eq('category', 'job')
        .gte('created_at', since7d),
      admin.from('local_spots').select('*', { count: 'exact', head: true }).eq('is_published', true),
      admin
        .from('local_spots')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)
        .contains('minihome_extra', { delivery_enabled: true }),
      admin.from('user_minihomes').select('*', { count: 'exact', head: true }).eq('is_public', true),
      admin
        .from('processed_news')
        .select('*', { count: 'exact', head: true })
        .eq('published', true)
        .gte('created_at', since3d),
      admin
        .from('ux_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'click')
        .in('path', ['/', '/landing'])
        .contains('meta', { entry_lane_id: 'trade' })
        .gte('created_at', since14d),
      admin
        .from('ux_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'click')
        .in('path', ['/', '/landing'])
        .contains('meta', { entry_lane_id: 'job' })
        .gte('created_at', since14d),
      admin
        .from('ux_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'click')
        .in('path', ['/', '/landing'])
        .contains('meta', { entry_lane_id: 'local' })
        .gte('created_at', since14d),
      admin
        .from('ux_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'click')
        .in('path', ['/', '/landing'])
        .contains('meta', { entry_lane_id: 'minihome' })
        .gte('created_at', since14d),
      admin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'safe')
        .eq('is_knowledge_tip', false)
        .eq('category', 'flea')
        .gte('created_at', since14d),
      admin
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'safe')
        .eq('is_knowledge_tip', false)
        .eq('category', 'job')
        .gte('created_at', since14d),
      admin
        .from('local_shop_delivery_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since14d),
      admin
        .from('minihome_guestbook_entries')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since14d),
      admin
        .from('minihome_diary_entries')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since14d),
    ]);

    const snapshot: EntryFlowSnapshot = {
      posts7d: asCount(posts7d),
      flea7d: asCount(flea7d),
      job7d: asCount(job7d),
      publishedShops: asCount(publishedShops),
      deliveryReadyShops: asCount(deliveryReadyShops),
      minihomePublicRooms: asCount(minihomePublicRooms),
      news3d: asCount(news3d),
      tradeClicks14d: asCount(tradeClicks14d),
      jobClicks14d: asCount(jobClicks14d),
      localClicks14d: asCount(localClicks14d),
      minihomeClicks14d: asCount(minihomeClicks14d),
      tradeConversions14d: asCount(tradeConversions14d),
      jobConversions14d: asCount(jobConversions14d),
      localConversions14d: asCount(localConversions14d),
      minihomeConversions14d: asCount(minihomeGuestbook14d) + asCount(minihomeDiary14d),
    };

    return {
      generatedAt: new Date().toISOString(),
      lanes: buildLanes(snapshot),
      snapshot,
    };
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      lanes: buildLanes(fallbackSnapshot),
      snapshot: fallbackSnapshot,
    };
  }
}
