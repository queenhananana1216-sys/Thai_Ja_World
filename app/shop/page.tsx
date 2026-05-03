import type { Metadata } from 'next';
import Link from 'next/link';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import { createServerClient } from '@/lib/supabase/server';
import styles from './salja-premium-boutique.module.css';

export const dynamic = 'force-dynamic';

type BoutiqueCategory = 'room_skin' | 'minimi' | 'bgm';

type ShopRow = {
  item_key: string;
  category: string;
  price_points: number;
  rental_days: number | null;
  rental_price: number | null;
  label_ko: string;
  label_th: string;
  payload: Record<string, unknown> | null;
  tier: string | null;
};

const SECTIONS: { id: BoutiqueCategory; title: string; subtitle: string }[] = [
  {
    id: 'room_skin',
    title: '미니홈 명품 스킨',
    subtitle: '액센트·톤을 한 단계 올려 공간의 무드를 완성합니다.',
  },
  {
    id: 'minimi',
    title: '미니미 레어 의상',
    subtitle: '희소성 있는 조합 — 과한 이모티콘 대신 컬렉터블 포인트.',
  },
  {
    id: 'bgm',
    title: '프리미엄 BGM',
    subtitle: '영구 라이선스 또는 90일 이상 시즌 패스만 취급합니다.',
  },
];

function accentFromPayload(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const a = payload.accent;
  return typeof a === 'string' && /^#?[0-9a-fA-F]{3,8}$/.test(a.trim()) ? (a.startsWith('#') ? a : `#${a}`) : null;
}

function isBoutiqueRow(r: ShopRow): boolean {
  const permOrLong = r.rental_days == null || r.rental_days >= 90;
  if (!permOrLong) return false;
  const highSpend = r.price_points >= 2000;
  const seasonPass = r.rental_days != null && r.rental_days >= 90;
  return highSpend || seasonPass;
}

export async function generateMetadata(): Promise<Metadata> {
  const ui = await loadSiteUiSettings();
  return {
    title: '살자 프리미엄 상점',
    description: `${ui.siteDisplayName} — 미니홈 명품 스킨·미니미 레어·프리미엄 BGM. 영구제와 90일 이상 가치 소모 위주.`,
    robots: { index: true, follow: true },
  };
}

export default async function SaljaPremiumShopPage() {
  const ui = await loadSiteUiSettings();
  const sb = createServerClient();
  const { data, error } = await sb
    .from('style_shop_items')
    .select('item_key,category,price_points,rental_days,rental_price,label_ko,label_th,payload,tier')
    .eq('active', true)
    .in('category', ['room_skin', 'minimi', 'bgm'])
    .order('sort_order', { ascending: true });

  const raw = (data ?? []) as ShopRow[];
  const curated = raw.filter(isBoutiqueRow);

  const byCat = (cat: BoutiqueCategory) => curated.filter((r) => r.category === cat);

  const checkoutHref = (cat: BoutiqueCategory) => `/minihome/shop?cat=${encodeURIComponent(cat)}`;

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <header className={styles.hero}>
          <p className={styles.heroEyebrow}>Salja · Premium boutique</p>
          <h1 className={styles.heroTitle}>살자 프리미엄 상점</h1>
          <p className={styles.heroLead}>
            짧은 소모성 대신 <strong>영구제</strong>와 <strong>최소 3개월(90일)권</strong>을 중심으로 구성했습니다. 타이(THAI)를
            모은 가치가 오래 남도록, {ui.siteDisplayName}의 미니홈 경험을 한 단계 끌어올립니다.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.btnPrimary} href={checkoutHref('room_skin')}>
              스킨 구매하러 가기
            </Link>
            <Link className={styles.btnGhost} href="/minihome">
              내 미니홈으로
            </Link>
          </div>
        </header>

        {error ? (
          <p className={styles.note} role="alert">
            카탈로그를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}

        {SECTIONS.map((sec) => {
          const items = byCat(sec.id);
          return (
            <section key={sec.id} className={styles.section} id={sec.id}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{sec.title}</h2>
                <p className={styles.sectionHint}>{sec.subtitle}</p>
              </div>
              {items.length === 0 ? (
                <p className={styles.sectionHint}>이 카테고리에 전시 중인 프리미엄 라인이 없습니다.</p>
              ) : (
                <ul className={styles.grid}>
                  {items.map((it) => {
                    const accent = accentFromPayload(it.payload);
                    const perm = it.rental_days == null;
                    const priceLabel = perm
                      ? `${it.price_points.toLocaleString('ko-KR')} 타이 · 영구`
                      : `${(it.rental_price ?? it.price_points).toLocaleString('ko-KR')} 타이 · ${it.rental_days}일`;
                    return (
                      <li key={it.item_key} className={styles.card}>
                        {accent ? (
                          <span className={styles.accentSwatch} style={{ background: accent }} title="액센트" />
                        ) : null}
                        <span className={styles.cardBadge}>
                          {perm ? 'PERMANENT' : `${it.rental_days}D PASS`}
                          {it.tier === 'legend' ? ' · LEGEND' : ''}
                        </span>
                        <h3 className={styles.cardTitle}>{it.label_ko}</h3>
                        <p className={styles.cardMeta}>{it.label_th}</p>
                        <p className={styles.price}>{priceLabel}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className={styles.heroActions} style={{ marginTop: '1rem' }}>
                <Link className={styles.btnGhost} href={checkoutHref(sec.id)}>
                  이 카테고리에서 결제하기 →
                </Link>
              </div>
            </section>
          );
        })}

        <p className={styles.note}>
          결제·장착은 기존 미니홈 스타일 상점 RPC를 그대로 사용합니다. 오너 승인형 AI 제안 아이템은{' '}
          <strong>관리자 › AI 스크립트 샌드박스</strong> 하단의 프리미엄 상점 제안 큐에서 라이브 반영됩니다.
        </p>
      </div>
    </div>
  );
}
