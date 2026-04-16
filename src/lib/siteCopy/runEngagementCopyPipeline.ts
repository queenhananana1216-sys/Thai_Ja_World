import { createClient } from '@supabase/supabase-js';

type SiteCopyEntry = {
  key: string;
  locale: 'ko' | 'th';
  value: string;
};

function createPipelineAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) {
    throw new Error('[engagement-copy] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type EngagementCopySnapshot = {
  sinceIso: string;
  posts7d: number;
  flea7d: number;
  job7d: number;
  info7d: number;
  publishedShops: number;
  deliveryReadyShops: number;
  news3d: number;
};

export type EngagementCopyPipelineResult = {
  snapshot: EngagementCopySnapshot;
  entries: SiteCopyEntry[];
  updated: number;
};

function clampNonNegative(value: number | null): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function koLead(snapshot: EngagementCopySnapshot): string {
  if (snapshot.flea7d >= snapshot.job7d && snapshot.flea7d > 0) {
    return '오늘 올라온 번개장터 글부터 보고, 필요한 물건은 바로 문의해보세요.';
  }
  if (snapshot.job7d > 0) {
    return '구인구직 최신 글부터 확인하고, 필요한 사람이나 일자리를 빠르게 연결해보세요.';
  }
  return '생활 질문, 가게 후기, 거래 글이 매일 쌓이는 교민 커뮤니티입니다.';
}

function koSub(snapshot: EngagementCopySnapshot): string {
  return `최근 7일 기준 번개장터 ${snapshot.flea7d}건 · 구인구직 ${snapshot.job7d}건 · 생활정보 ${snapshot.info7d}건이 올라왔고, 당일 예약/배송 대응 가게 ${snapshot.deliveryReadyShops}곳이 연결되어 있습니다.`;
}

function thLead(snapshot: EngagementCopySnapshot): string {
  if (snapshot.flea7d >= snapshot.job7d && snapshot.flea7d > 0) {
    return 'ดูโพสต์ซื้อขายล่าสุดก่อน แล้วทักร้านหรือผู้ขายได้เลย.';
  }
  if (snapshot.job7d > 0) {
    return 'เริ่มจากโพสต์งานล่าสุด แล้วเชื่อมคนกับงานได้ทันที.';
  }
  return 'คอมมูนิตี้คนเกาหลีในไทยที่รวมคำถามชีวิตจริง รีวิวร้าน และข้อมูลที่ค้นหาได้.';
}

function thSub(snapshot: EngagementCopySnapshot): string {
  return `ช่วง 7 วันที่ผ่านมา มีโพสต์ซื้อขาย ${snapshot.flea7d} รายการ · งาน/รับสมัคร ${snapshot.job7d} รายการ · ข้อมูลชีวิต ${snapshot.info7d} รายการ และร้านที่รองรับจอง/ส่งด่วน ${snapshot.deliveryReadyShops} ร้าน.`;
}

function buildEntries(snapshot: EngagementCopySnapshot): SiteCopyEntry[] {
  const kickerKo = `번개장터 ${snapshot.flea7d} · 구인구직 ${snapshot.job7d} · 당일예약/배송 ${snapshot.deliveryReadyShops}`;
  const kickerTh = `ซื้อขาย ${snapshot.flea7d} · งาน ${snapshot.job7d} · ร้านจอง/ส่งด่วน ${snapshot.deliveryReadyShops}`;

  const hotLabelKo = '오늘 많이 보는 실전 글';
  const hotLabelTh = 'โพสต์ที่คนดูเยอะวันนี้';
  const hotFootnoteKo = `광고 문구보다 실제 후기와 최근 글을 우선으로 보여줍니다. (${snapshot.posts7d}개 신규 글, 최근 3일 뉴스 ${snapshot.news3d}건)`;
  const hotFootnoteTh = `เน้นโพสต์จริงจากผู้ใช้มากกว่าคำโฆษณา (${snapshot.posts7d} โพสต์ใหม่, ข่าว 3 วันล่าสุด ${snapshot.news3d})`;

  return [
    { key: 'home_hero_kicker', locale: 'ko', value: kickerKo },
    { key: 'home_hero_kicker', locale: 'th', value: kickerTh },
    { key: 'home_hero_lead', locale: 'ko', value: koLead(snapshot) },
    { key: 'home_hero_lead', locale: 'th', value: thLead(snapshot) },
    { key: 'home_hero_sub', locale: 'ko', value: koSub(snapshot) },
    { key: 'home_hero_sub', locale: 'th', value: thSub(snapshot) },
    { key: 'home_guest_login_cta', locale: 'ko', value: '둘러보다가 글 남기기' },
    { key: 'home_guest_login_cta', locale: 'th', value: 'ดูโพสต์แล้วค่อยเริ่มเขียน' },
    { key: 'home_hot_label', locale: 'ko', value: hotLabelKo },
    { key: 'home_hot_label', locale: 'th', value: hotLabelTh },
    { key: 'home_hot_footnote', locale: 'ko', value: hotFootnoteKo },
    { key: 'home_hot_footnote', locale: 'th', value: hotFootnoteTh },
  ];
}

async function collectSnapshot(): Promise<EngagementCopySnapshot> {
  const admin = createPipelineAdminClient();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since3d = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: posts7d },
    { count: flea7d },
    { count: job7d },
    { count: info7d },
    { count: publishedShops },
    { count: deliveryReadyShops },
    { count: news3d },
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
    admin
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('moderation_status', 'safe')
      .eq('is_knowledge_tip', false)
      .eq('category', 'info')
      .gte('created_at', since7d),
    admin.from('local_spots').select('*', { count: 'exact', head: true }).eq('is_published', true),
    admin
      .from('local_spots')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .contains('minihome_extra', { delivery_enabled: true }),
    admin
      .from('processed_news')
      .select('*', { count: 'exact', head: true })
      .eq('published', true)
      .gte('created_at', since3d),
  ]);

  return {
    sinceIso: since7d,
    posts7d: clampNonNegative(posts7d),
    flea7d: clampNonNegative(flea7d),
    job7d: clampNonNegative(job7d),
    info7d: clampNonNegative(info7d),
    publishedShops: clampNonNegative(publishedShops),
    deliveryReadyShops: clampNonNegative(deliveryReadyShops),
    news3d: clampNonNegative(news3d),
  };
}

export async function runEngagementCopyPipeline(): Promise<EngagementCopyPipelineResult> {
  const snapshot = await collectSnapshot();
  const entries = buildEntries(snapshot);
  const admin = createPipelineAdminClient();

  const { error } = await admin.from('site_copy').upsert(
    entries.map((entry) => ({
      key: entry.key,
      locale: entry.locale,
      value: entry.value,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'key,locale' },
  );
  if (error) {
    throw new Error(`[engagement-copy] upsert failed: ${error.message}`);
  }

  return { snapshot, entries, updated: entries.length };
}
