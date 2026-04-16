import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale } from '@/i18n/get-locale';
import { createServerClient } from '@/lib/supabase/server';
import { getSiteBaseUrl } from '@/lib/seo/site';
import { getActiveUxFlagsServer } from '@/lib/ux/flagsServer';

export const metadata: Metadata = {
  title: '로컬 가게 — 태자 월드',
  description: '태국 한인·현지 로컬 가게 미니홈. 비회원도 QR로 메뉴·공지·사진을 확인할 수 있어요.',
};

type LocalSpotRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[] | null;
  photo_urls: unknown;
  line_url: string | null;
  minihome_public_slug: string | null;
  updated_at: string;
};

function firstPhoto(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  const first = raw.find((v) => typeof v === 'string' && v.trim());
  return typeof first === 'string' ? first : null;
}

async function fetchSpots(): Promise<LocalSpotRow[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('local_spots')
      .select(
        'id,slug,name,description,category,tags,photo_urls,line_url,minihome_public_slug,updated_at',
      )
      .eq('is_published', true)
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })
      .limit(120);

    return (data ?? []) as LocalSpotRow[];
  } catch {
    return [];
  }
}

function SpotCard({
  spot,
  qrEmphasis,
  locale,
}: {
  spot: LocalSpotRow;
  qrEmphasis: boolean;
  locale: 'ko' | 'th';
}) {
  const publicSlug = (spot.minihome_public_slug?.trim() || spot.slug || '').trim();
  const shopHref = `/shop/${encodeURIComponent(publicSlug)}`;
  const abs = `${getSiteBaseUrl()}${shopHref}`;
  const qrHref = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(abs)}`;
  const thumb = firstPhoto(spot.photo_urls);
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className="flex h-44 items-center justify-center bg-slate-100 text-4xl"
        style={thumb ? { backgroundImage: `url(${thumb})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        {!thumb ? '🏪' : null}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-extrabold text-slate-900">{spot.name}</h3>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
            {spot.category}
          </span>
        </div>
        {spot.description ? <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{spot.description}</p> : null}
        {Array.isArray(spot.tags) && spot.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {spot.tags.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                #{t}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={shopHref}
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white no-underline transition hover:bg-slate-700"
          >
            {locale === 'th' ? 'ดูมินิโฮม' : '미니홈 보기'}
          </Link>
          <a
            href={qrHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-lg border px-3.5 py-2 text-xs font-semibold no-underline transition ${
              qrEmphasis
                ? 'border-violet-500 bg-violet-50 text-violet-700 hover:bg-violet-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {qrEmphasis
              ? locale === 'th'
                ? 'เข้า QR ทันที (แนะนำ)'
                : 'QR 바로가기 (추천)'
              : locale === 'th'
                ? 'ดู QR'
                : 'QR 보기'}
          </a>
          {spot.line_url?.trim() ? (
            <a
              href={spot.line_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 no-underline transition hover:bg-emerald-100"
            >
              {locale === 'th' ? 'ติดต่อ LINE' : 'LINE 문의'}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default async function LocalPage() {
  const locale = await getLocale();
  const flags = await getActiveUxFlagsServer();
  const qrEmphasis = Boolean(flags['local.qr_emphasis']?.enabled);
  const spots = await fetchSpots();

  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-16 pt-8">
      <section className="rounded-3xl border border-violet-200/60 bg-[linear-gradient(120deg,#eef2ff_0%,#fdf2f8_100%)] p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
          {locale === 'th' ? '🏪 ร้านท้องถิ่น' : '🏪 로컬 가게'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {locale === 'th'
            ? 'มินิโฮมสาธารณะดูได้ทันทีแม้ไม่ใช่สมาชิก สแกน QR เพื่อเปิดเมนูร้าน·รูป·ประกาศได้เลย'
            : '공개 미니홈은 비회원도 바로 볼 수 있어요. QR을 찍어 가게 메뉴판·사진·공지로 바로 들어갈 수 있습니다.'}
        </p>
        {qrEmphasis ? (
          <p className="mt-3 text-xs font-bold text-violet-700">
            {locale === 'th'
              ? 'ตอนนี้เน้นปุ่ม QR เพื่อให้เข้าหน้าเมนูได้เร็วขึ้น'
              : '지금은 QR 진입 버튼을 강조해서 바로 메뉴판으로 들어가기 쉽게 조정했어요.'}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
            🏪 {locale === 'th' ? 'ทั้งหมด' : '전체'} <strong className="text-slate-900">{spots.length}</strong>
            {locale === 'th' ? ' ร้าน' : '개'}
          </span>
          <Link
            href="/ads"
            className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1.5 font-semibold text-violet-700 no-underline transition hover:bg-violet-100"
          >
            {locale === 'th' ? 'โปรโมทร้านของคุณ' : '우리 가게 광고 문의'}
          </Link>
        </div>
      </section>

      {spots.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <p className="mb-2 text-3xl">🏪</p>
          <p>{locale === 'th' ? 'ยังไม่มีมินิโฮมสาธารณะ' : '아직 공개된 로컬 미니홈이 없습니다.'}</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {spots.map((spot) => (
            <SpotCard key={spot.id} spot={spot} qrEmphasis={qrEmphasis} locale={locale} />
          ))}
        </div>
      )}
    </main>
  );
}
