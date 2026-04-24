import Link from 'next/link';
import type { PublicSafetyContact } from '@/lib/safety/safetyContactTypes';
import type { Locale } from '@/i18n/types';

type Props = {
  locale: Locale;
  items: PublicSafetyContact[];
};

function telHref(value: string): string {
  const digits = value.replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}

/**
 * 비상 연락처 — Philgo 좌측 "긴급 연락처"에 대응, 다크 랜딩 톤
 */
export function LandingEmergencyStrip({ locale, items }: Props) {
  if (items.length === 0) return null;

  const title = locale === 'th' ? 'เบอร์ฉุกเฉิน (อ้างอิง) · อ่านรายละเอียดด้านล่าง' : '긴급·공식 연락';
  const more = locale === 'th' ? 'หน้าเต็ม · อัปเดตจากทีม' : '자세히·출처';
  const tipLine =
    locale === 'th'
      ? 'ถ้าเป็นหาย / ฉุกเฉินจริง — โทร 191/1669 ฯลฯ ก่อน มาลงกระทู้/แจ้งเว็บตามหลังได้ (รายละเอียดอ่านบนหน้าเฉพาะ) กันข้อมูลส่วนตัวนะ'
      : '행방·위급은 191/1669 등을 먼저. 광장·제보는 보조(개인정보·허위 주의)';

  return (
    <section
      aria-labelledby="tj-landing-emergency"
      className="tj-landing-emergency"
      style={{
        margin: '0 0 20px',
        padding: '16px 16px 14px',
        borderRadius: 16,
        border: '1px solid rgba(248,113,113,0.25)',
        background: 'linear-gradient(165deg, rgba(30,20,32,0.95) 0%, rgba(18,16,30,0.9) 100%)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2
          id="tj-landing-emergency"
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 800,
            color: '#fecaca',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        <Link
          href="/help/emergency"
          prefetch={false}
          style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', textDecoration: 'none' }}
        >
          {more} →
        </Link>
      </div>
      <p style={{ margin: '8px 0 10px', fontSize: 12, lineHeight: 1.45, color: '#94a3b8' }}>{tipLine}</p>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 8,
          gridTemplateColumns: 'minmax(0, 1fr)',
        }}
      >
        {items.map((c) => (
          <li
            key={c.id}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{c.label}</span>
            <span style={{ fontSize: 12, color: '#cbd5e1', textAlign: 'right' as const }}>
              {c.kind === 'report' ? (
                <>
                  <Link href="/community/boards?cat=info" prefetch={false} style={{ color: '#93c5fd', fontWeight: 600 }}>
                    {locale === 'th' ? 'กระดานข้อมูล' : '광장(정보)'}
                  </Link>
                  <span style={{ color: '#64748b' }}> · </span>
                  <Link href="/contact" prefetch={false} style={{ color: '#93c5fd', fontWeight: 600 }}>
                    {locale === 'th' ? 'ติดต่อทีม' : '운영 문의'}
                  </Link>
                </>
              ) : c.valueKind === 'phone' ? (
                <a
                  href={telHref(c.value)}
                  className="no-underline"
                  style={{ color: '#93c5fd', fontWeight: 700 }}
                >
                  {c.value}
                </a>
              ) : c.valueKind === 'url' ? (
                <a
                  href={c.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-underline"
                  style={{ color: '#93c5fd' }}
                >
                  {c.value}
                </a>
              ) : (
                <span>{c.value}</span>
              )}
            </span>
            {c.sourceUrl ? (
              <span style={{ width: '100%', fontSize: 10, color: '#64748b' }}>
                {locale === 'th' ? 'แหล่งอ้างอิง' : '출처'}:{' '}
                <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa' }}>
                  {c.sourceUrl.replace(/^https?:\/\//, '').slice(0, 48)}
                  {c.sourceUrl.length > 48 ? '…' : ''}
                </a>
              </span>
            ) : c.sourceNote && c.kind !== 'report' ? (
              <span style={{ width: '100%', fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{c.sourceNote}</span>
            ) : c.sourceNote && c.kind === 'report' ? (
              <span style={{ width: '100%', fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{c.sourceNote}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
