'use client';

import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import ShopDeliveryRequestPanel from './ShopDeliveryRequestPanel';
import ShopGuestbookPanel from './ShopGuestbookPanel';
import ShopUpdatesPanel from './ShopUpdatesPanel';
import { DepthCard } from '@/components/3d/DepthCard';
import { HoloButton } from '@/components/3d/HoloButton';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { SURFACE_DEFAULT_TIER } from '@/lib/3d/system';

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

  const bgmUrl = spot.minihome_bgm_url?.trim() || '';
  const effectiveSlug = (spot.minihome_public_slug?.trim() || spot.slug || '').trim();

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
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(roomUrl)}`;

  async function copyRoomUrl() {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopyMsg(locale === 'th' ? 'คัดลอกลิงก์แล้ว' : '링크를 복사했어요.');
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

  return (
    <div style={shellStyle}>
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image_url}
                      alt=""
                      width={56}
                      height={56}
                      style={{ borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : null}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong>{it.name || (locale === 'th' ? 'เมนู' : '메뉴')}</strong>
                      {it.price ? (
                        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{it.price}</span>
                      ) : null}
                    </div>
                    {it.description ? (
                      <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{it.description}</div>
                    ) : null}
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

        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="board-form__submit"
            style={{ textDecoration: 'none', padding: '6px 12px', background: '#fff', color: '#111827', border: '1px solid #e2e8f0' }}
          >
            {locale === 'th' ? 'ดู QR' : 'QR 보기'}
          </a>
          <HoloButton className="board-form__submit" tier={tier} style={{ padding: '6px 12px' }} onClick={() => void copyRoomUrl()}>
            {locale === 'th' ? 'คัดลอกลิงก์' : '링크 복사'}
          </HoloButton>
          {copyMsg ? <span style={{ fontSize: 12, color: '#cbd5e1' }}>{copyMsg}</span> : null}
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
              {photos.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={u}
                  src={u}
                  alt=""
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }}
                />
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
    </div>
  );
}
