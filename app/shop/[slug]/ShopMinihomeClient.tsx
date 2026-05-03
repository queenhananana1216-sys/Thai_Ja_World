'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import ShopDeliveryRequestPanel from './ShopDeliveryRequestPanel';
import ShopGuestbookPanel from './ShopGuestbookPanel';
import ShopUpdatesPanel from './ShopUpdatesPanel';
import { DepthCard } from '@/components/3d/DepthCard';
import { HoloButton } from '@/components/3d/HoloButton';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { SURFACE_DEFAULT_TIER } from '@/lib/3d/system';
import QRCodeGenerator from '@/components/local/QRCodeGenerator';
import { absoluteUrl } from '@/lib/seo/site';
import { allowNextImageRemoteOptimize } from '@/lib/image/allowNextImageOptimize';
import { TJ_TINY_BLUR_DATA_URL } from '@/lib/image/tinyBlurDataUrl';

export type ShopSpotPayload = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  line_url: string | null;
  photo_urls: unknown;
  owner_profile_id: string | null;
  minihome_public_slug: string | null;
  minihome_intro: string | null;
  minihome_theme: unknown;
  minihome_bgm_url: string | null;
  minihome_menu: unknown;
  minihome_layout_modules: unknown;
  minihome_extra: unknown;
  is_published: boolean;
  /** 방명록·일촌평 수신 (false면 비오너에게 비노출, RLS) */
  minihome_guestbook_enabled?: boolean | null;
};

const DEFAULT_LAYOUT = ['intro', 'menu', 'line', 'photos', 'guestbook'] as const;

function asStringRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function photoList(photo_urls: unknown): string[] {
  if (!Array.isArray(photo_urls)) return [];
  return photo_urls.map((u) => String(u).trim()).filter(Boolean);
}

type MenuItem = {
  name?: string;
  price?: string;
  description?: string;
  image_url?: string;
};

type CartRow = {
  idx: number;
  name: string;
  priceText: string;
  unitPriceThb: number;
  quantity: number;
};

type CheckoutBridge =
  | { kind: 'promptpay'; qrImageUrl: string; reference: string }
  | { kind: 'line_direct'; lineUrl: string; autoCopyText: string }
  | { kind: 'internal_point'; walletBalanceAfterMinor: number | null };

function menuItems(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => (x && typeof x === 'object' ? (x as MenuItem) : {}));
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function asNumber(v: unknown, fallback = 45): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(10, Math.min(480, Math.floor(v)));
}

function parsePriceToThb(raw: string | undefined): number {
  const cleaned = (raw ?? '').replace(/[^\d.]/g, '');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Number(parsed.toFixed(2));
}

export default function ShopMinihomeClient({ spot }: { spot: ShopSpotPayload }) {
  const { locale } = useClientLocaleDictionary();
  const tier = SURFACE_DEFAULT_TIER.shop;
  const theme = useMemo(() => asStringRecord(spot.minihome_theme), [spot.minihome_theme]);
  const accent = typeof theme.accent === 'string' ? theme.accent : '#7c3aed';
  const wallpaper =
    typeof theme.wallpaper_url === 'string' && theme.wallpaper_url.trim()
      ? theme.wallpaper_url.trim()
      : '';
  const bgFallback =
    typeof theme.page_bg === 'string' && theme.page_bg.trim() ? theme.page_bg.trim() : '#0f172a';

  const layout = useMemo(() => {
    const m = spot.minihome_layout_modules;
    if (!Array.isArray(m)) return [...DEFAULT_LAYOUT];
    const xs = m.filter((x): x is string => typeof x === 'string' && x.length > 0);
    return xs.length ? xs : [...DEFAULT_LAYOUT];
  }, [spot.minihome_layout_modules]);

  const photos = useMemo(() => photoList(spot.photo_urls), [spot.photo_urls]);
  const menu = useMemo(() => menuItems(spot.minihome_menu), [spot.minihome_menu]);
  const extra = useMemo(() => asStringRecord(spot.minihome_extra), [spot.minihome_extra]);
  const openingHoursText =
    typeof extra.opening_hours_text === 'string' ? extra.opening_hours_text.trim() : '';
  const deliveryEnabled = asBool(extra.delivery_enabled, false);
  const deliveryQuickEnabled = asBool(extra.delivery_quick_enabled, true);
  const deliveryLeadMinutes = asNumber(extra.delivery_lead_minutes, 45);
  const deliveryNotice = typeof extra.delivery_notice === 'string' ? extra.delivery_notice.trim() : '';
  const deliveryContact = typeof extra.delivery_contact === 'string' ? extra.delivery_contact.trim() : '';
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [bgmOn, setBgmOn] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const [cart, setCart] = useState<CartRow[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [bridge, setBridge] = useState<CheckoutBridge | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressText, setAddressText] = useState('');
  const [requestTime, setRequestTime] = useState('');
  const [notes, setNotes] = useState('');

  const bgmUrl = spot.minihome_bgm_url?.trim() || '';
  const effectiveSlug = (spot.minihome_public_slug?.trim() || spot.slug || '').trim();
  const pathSlugForLocal = (
    String(spot.slug ?? '').trim() ||
    String(spot.minihome_public_slug ?? '').trim() ||
    effectiveSlug
  ).trim();
  const digitalMenuPath = `/local/${encodeURIComponent(pathSlugForLocal)}/minihome`;
  const digitalMenuAbsUrl = absoluteUrl(digitalMenuPath);

  function toggleBgm() {
    const el = audioRef.current;
    if (!el || !bgmUrl) return;
    if (bgmOn) {
      el.pause();
      setBgmOn(false);
    } else {
      void el.play().then(() => setBgmOn(true)).catch(() => setBgmOn(false));
    }
  }
  const roomUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/shop/${encodeURIComponent(effectiveSlug)}`
      : `/shop/${encodeURIComponent(effectiveSlug)}`;
  const isMobile =
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 768px)').matches
      : false;
  const cartCount = cart.reduce((sum, row) => sum + row.quantity, 0);
  const cartTotalThb = Number(
    cart.reduce((sum, row) => sum + row.quantity * row.unitPriceThb, 0).toFixed(2),
  );

  async function copyDigitalMenuUrl() {
    try {
      await navigator.clipboard.writeText(digitalMenuAbsUrl);
      setCopyMsg(locale === 'th' ? 'คัดลอกลิงก์เมนูแล้ว' : '메뉴판 링크를 복사했어요.');
    } catch {
      setCopyMsg(locale === 'th' ? 'คัดลอกไม่สำเร็จ' : '복사에 실패했어요.');
    }
  }

  async function copyShopUrl() {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopyMsg(locale === 'th' ? 'คัดลอกลิงก์แล้ว' : '샵 링크를 복사했어요.');
    } catch {
      setCopyMsg(locale === 'th' ? 'คัดลอกไม่สำเร็จ' : '복사에 실패했어요.');
    }
  }

  const shellStyle: CSSProperties = {
    minHeight: '70vh',
    backgroundColor: bgFallback,
    backgroundImage: wallpaper ? `url(${wallpaper})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: '#f8fafc',
  };

  const cardStyle: CSSProperties = {
    maxWidth: 560,
    margin: '0 auto',
    padding: 24,
    borderRadius: 16,
    background: 'rgba(15,23,42,0.82)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.08)',
  };

  function Section({ id, children }: { id: string; children: ReactNode }) {
    if (!layout.includes(id)) return null;
    return <>{children}</>;
  }

  function addToCart(item: MenuItem, idx: number) {
    const itemName = (item.name || '').trim();
    if (!itemName) return;
    const unitPrice = parsePriceToThb(item.price);
    if (unitPrice <= 0) return;
    setCart((prev) => {
      const hit = prev.find((row) => row.idx === idx);
      if (hit) {
        return prev.map((row) =>
          row.idx === idx ? { ...row, quantity: Math.min(20, row.quantity + 1) } : row,
        );
      }
      return [
        ...prev,
        {
          idx,
          name: itemName,
          priceText: item.price ?? `${unitPrice} THB`,
          unitPriceThb: unitPrice,
          quantity: 1,
        },
      ];
    });
  }

  function adjustQty(idx: number, nextQty: number) {
    setCart((prev) =>
      prev
        .map((row) =>
          row.idx === idx ? { ...row, quantity: Math.max(0, Math.min(20, nextQty)) } : row,
        )
        .filter((row) => row.quantity > 0),
    );
  }

  async function submitOrderLead() {
    if (cart.length === 0) {
      setSubmitMsg(locale === 'th' ? 'กรุณาเลือกเมนูก่อน' : '메뉴를 먼저 담아주세요.');
      return;
    }
    if (phone.trim().length < 6 || addressText.trim().length < 4) {
      setSubmitMsg(
        locale === 'th'
          ? 'เบอร์โทร/주소รับสินค้ายังไม่ครบ'
          : '연락처/주소를 먼저 입력해 주세요.',
      );
      return;
    }
    setSubmitting(true);
    setSubmitMsg('');
    setBridge(null);
    try {
      const res = await fetch('/api/shop/order-leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          spotId: spot.id,
          customerName: customerName.trim() || null,
          phone: phone.trim(),
          addressText: addressText.trim(),
          requestedTime: requestTime.trim() || null,
          notes: notes.trim() || null,
          items: cart.map((row) => ({
            name: row.name,
            quantity: row.quantity,
            unitPriceThb: row.unitPriceThb,
          })),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        bridge?: CheckoutBridge;
      };
      if (!res.ok || !data.ok || !data.bridge) {
        setSubmitMsg(data.error ?? (locale === 'th' ? 'สั่งซื้อไม่สำเร็จ' : '주문 생성에 실패했습니다.'));
        return;
      }
      setBridge(data.bridge);
      if (data.bridge.kind === 'line_direct') {
        try {
          await navigator.clipboard.writeText(data.bridge.autoCopyText);
        } catch {
          // noop: 일부 브라우저/권한에서 clipboard 차단 가능
        }
      }
      setSubmitMsg(
        locale === 'th'
          ? '주문/예약이 저장되었습니다. 아래 결제 단계를 진행해 주세요.'
          : '주문/예약이 저장되었습니다. 아래 결제 단계를 진행해 주세요.',
      );
    } catch {
      setSubmitMsg(locale === 'th' ? '네트워크 오류가 발생했습니다.' : '네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={shellStyle} className="@container">
      {bgmUrl ? <audio ref={audioRef} src={bgmUrl} loop preload="none" /> : null}

      <DepthCard
        tier={tier}
        style={{ ...cardStyle, marginTop: 8 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{spot.name}</h1>
            {!spot.is_published ? (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#fbbf24' }}>
                {locale === 'th' ? 'พรีวิวแบบไม่เผยแพร่ (เจ้าของ·ผู้ดูแล)' : '비공개 미리보기 (오너·운영)'}
              </p>
            ) : null}
          </div>
          {bgmUrl ? (
            <HoloButton
              onClick={toggleBgm}
              tier={tier}
              style={{
                flexShrink: 0,
                padding: '8px 12px',
                borderRadius: 999,
                border: 'none',
                background: accent,
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {bgmOn
                ? locale === 'th'
                  ? 'ปิด BGM'
                  : 'BGM 끄기'
                : locale === 'th'
                  ? 'เปิด BGM'
                  : 'BGM 켜기'}
            </HoloButton>
          ) : null}
        </div>

        <Section id="intro">
          {spot.minihome_intro?.trim() || spot.description?.trim() ? (
            <p style={{ marginTop: 16, lineHeight: 1.6, opacity: 0.95, whiteSpace: 'pre-wrap' }}>
              {spot.minihome_intro?.trim() || spot.description}
            </p>
          ) : null}
        </Section>

        {openingHoursText ? (
          <p style={{ marginTop: 16, lineHeight: 1.55, opacity: 0.92, whiteSpace: 'pre-wrap' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 6 }}>
              {locale === 'th' ? 'เวลาเปิดทำการ' : '영업시간'}
            </span>
            {openingHoursText}
          </p>
        ) : null}

        <ShopUpdatesPanel spotId={spot.id} />

        <Section id="menu">
          {menu.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0 0' }}>
              {menu.map((it, i) => (
                <li
                  key={i}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  {it.image_url ? (
                    <Image
                      src={it.image_url}
                      alt=""
                      width={56}
                      height={56}
                      sizes="56px"
                      loading={i < 2 ? 'eager' : 'lazy'}
                      priority={i < 2}
                      placeholder="blur"
                      blurDataURL={TJ_TINY_BLUR_DATA_URL}
                      unoptimized={!allowNextImageRemoteOptimize(it.image_url)}
                      quality={88}
                      style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : null}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong className="truncate">{it.name || (locale === 'th' ? 'เมนู' : '메뉴')}</strong>
                      {it.price ? (
                        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{it.price}</span>
                      ) : null}
                    </div>
                    {it.description ? (
                      <div className="line-clamp-2" style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
                        {it.description}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => addToCart(it, i)}
                        className="rounded-full border border-violet-300/40 bg-violet-500/20 px-3 py-1 text-xs font-bold text-violet-100 transition hover:bg-violet-500/30"
                      >
                        {locale === 'th' ? 'ใส่ตะกร้า' : '담기'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ marginTop: 16, fontSize: 13, color: '#cbd5e1' }}>
              {locale === 'th' ? 'ร้านนี้ยังไม่เพิ่มเมนู' : '이 가게는 아직 메뉴판을 준비 중입니다.'}
            </p>
          )}
        </Section>

        <Section id="line">
          {spot.line_url?.trim() ? (
            <p style={{ marginTop: 20 }}>
              <a
                href={spot.line_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#86efac', fontWeight: 700 }}
              >
                {locale === 'th' ? 'ติดต่อผ่าน LINE' : 'LINE으로 연결'}
              </a>
            </p>
          ) : null}
        </Section>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href={digitalMenuPath}
              className="board-form__submit"
              style={{
                textDecoration: 'none',
                padding: '8px 14px',
                borderRadius: 10,
                background: `${accent}33`,
                color: '#f8fafc',
                border: `1px solid ${accent}66`,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {locale === 'th' ? 'เมนูดิจิทัล' : '디지털 메뉴판'}
            </Link>
            <Link
              href={`/local/${encodeURIComponent(pathSlugForLocal)}`}
              className="board-form__submit"
              style={{
                textDecoration: 'none',
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(15,23,42,0.65)',
                color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.12)',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {locale === 'th' ? 'มินิโฮม' : '미니홈 보기'}
            </Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <QRCodeGenerator
              value={digitalMenuAbsUrl}
              size={isMobile ? 132 : 156}
              caption={locale === 'th' ? 'สแกน → เมนูบอร์ด' : '스캔 시 디지털 메뉴판'}
              className="inline-flex flex-col items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] p-2 shadow-inner shadow-black/30"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <HoloButton
                className="board-form__submit"
                tier={tier}
                style={{ padding: '8px 12px', fontSize: 12 }}
                onClick={() => void copyDigitalMenuUrl()}
              >
                {locale === 'th' ? 'คัดลอกลิงก์เมนู' : '메뉴판 링크 복사'}
              </HoloButton>
              <HoloButton
                className="board-form__submit"
                tier={tier}
                style={{ padding: '8px 12px', fontSize: 12, opacity: 0.92 }}
                onClick={() => void copyShopUrl()}
              >
                {locale === 'th' ? 'คัดลอกลิงก์ร้าน' : '샵 링크 복사'}
              </HoloButton>
            </div>
          </div>
          {copyMsg ? <span style={{ fontSize: 12, color: '#cbd5e1', width: '100%' }}>{copyMsg}</span> : null}
        </div>

        <Section id="photos">
          {photos.length > 0 ? (
            <div
              style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 8,
              }}
            >
              {photos.map((u, pi) => (
                <div key={u} className="relative w-full [aspect-ratio:1] overflow-hidden rounded-lg">
                  <Image
                    src={u}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 33vw, 130px"
                    loading={pi < 4 ? 'eager' : 'lazy'}
                    priority={pi < 4}
                    placeholder="blur"
                    blurDataURL={TJ_TINY_BLUR_DATA_URL}
                    unoptimized={!allowNextImageRemoteOptimize(u)}
                    quality={88}
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </Section>

        <Section id="guestbook">
          <ShopGuestbookPanel
            spotId={spot.id}
            ownerProfileId={spot.owner_profile_id ?? null}
            isPublished={spot.is_published}
            minihomeGuestbookEnabled={spot.minihome_guestbook_enabled !== false}
            publicSlug={(spot.minihome_public_slug ?? '').trim()}
          />
        </Section>

        <ShopDeliveryRequestPanel
          spotId={spot.id}
          deliveryEnabled={deliveryEnabled}
          leadMinutes={deliveryLeadMinutes}
          notice={deliveryNotice}
          contact={deliveryContact}
          quickEnabled={deliveryQuickEnabled}
        />
      </DepthCard>
      {isMobile ? (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-4 left-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-violet-300/40 bg-linear-to-r from-violet-500/90 to-fuchsia-500/90 px-4 py-3 text-left text-white shadow-[0_20px_40px_rgba(76,29,149,0.45)] backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-extrabold">🛒 당일 예약 / 배달 주문하기</span>
            <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-semibold">
              {cartCount}개 · {cartTotalThb.toFixed(2)} THB
            </span>
          </div>
        </button>
      ) : null}

      {sheetOpen ? (
        <div
          className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm"
          role="presentation"
          onClick={() => setSheetOpen(false)}
        >
          <div
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-auto rounded-t-3xl border border-white/15 bg-slate-900/85 p-4 pb-8 shadow-2xl"
          >
            <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-white/20" />
            <h3 className="text-base font-extrabold text-white">주문서</h3>
            <p className="mt-1 text-xs text-slate-300">QR 진입 즉시 주문/예약 전환용 O2O 바텀시트</p>

            <div className="mt-3 space-y-2">
              {cart.length === 0 ? (
                <p className="text-sm text-slate-300">담긴 메뉴가 없습니다.</p>
              ) : (
                cart.map((row) => (
                  <div
                    key={row.idx}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{row.name}</p>
                      <p className="text-xs text-slate-300">{row.priceText}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjustQty(row.idx, row.quantity - 1)}
                        className="h-7 w-7 rounded-full border border-white/20 text-sm"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-sm">{row.quantity}</span>
                      <button
                        type="button"
                        onClick={() => adjustQty(row.idx, row.quantity + 1)}
                        className="h-7 w-7 rounded-full border border-white/20 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 grid gap-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="이름 / Name"
                className="rounded-xl border border-white/15 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="전화번호"
                className="rounded-xl border border-white/15 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              />
              <input
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="주소/픽업 메모"
                className="rounded-xl border border-white/15 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              />
              <input
                value={requestTime}
                onChange={(e) => setRequestTime(e.target.value)}
                placeholder="요청 시간 (예: 19:00)"
                className="rounded-xl border border-white/15 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="요청사항"
                className="rounded-xl border border-white/15 bg-slate-800/70 px-3 py-2 text-sm text-white placeholder:text-slate-400"
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-200">
              <span>합계</span>
              <strong>{cartTotalThb.toFixed(2)} THB</strong>
            </div>
            {submitMsg ? <p className="mt-2 text-xs text-violet-200">{submitMsg}</p> : null}
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submitOrderLead()}
              className="mt-3 w-full rounded-xl border border-violet-300/40 bg-violet-500/30 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? '처리 중…' : '주문/예약 생성'}
            </button>

            {bridge?.kind === 'promptpay' ? (
              <div className="mt-4 rounded-xl border border-emerald-300/40 bg-emerald-500/10 p-3">
                <p className="text-xs font-semibold text-emerald-200">PromptPay 결제 QR</p>
                <Image
                  src={bridge.qrImageUrl}
                  alt="PromptPay QR"
                  width={240}
                  height={240}
                  sizes="240px"
                  unoptimized
                  placeholder="blur"
                  blurDataURL={TJ_TINY_BLUR_DATA_URL}
                  loading="lazy"
                  className="mt-2 h-auto w-full max-w-[240px] rounded-lg"
                />
                <p className="mt-2 text-[11px] text-emerald-100">Ref: {bridge.reference}</p>
              </div>
            ) : null}
            {bridge?.kind === 'line_direct' ? (
              <div className="mt-4 rounded-xl border border-emerald-300/40 bg-emerald-500/10 p-3">
                <p className="text-xs text-emerald-100">LINE에 주문 텍스트를 복사 후 이동합니다.</p>
                <a
                  href={bridge.lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block rounded-lg border border-emerald-300/50 px-3 py-1.5 text-xs font-semibold text-emerald-100"
                >
                  LINE 열기
                </a>
              </div>
            ) : null}
            {bridge?.kind === 'internal_point' ? (
              <p className="mt-3 text-xs text-emerald-200">
                타이(THAI) 결제 완료 · 잔액 {bridge.walletBalanceAfterMinor ?? 0}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
