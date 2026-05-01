'use client';

import { useCallback, useRef, useState } from 'react';
import QRCode from 'react-qr-code';

const PNG_NAME = 'thaijaworld_main_qr.png';
const CANVAS_PX = 1024;
const PREVIEW_PX = 280;

type Props = {
  /** `getSiteBaseUrl()` — `NEXT_PUBLIC_SITE_URL`·SEO 기준 메인 URL */
  mainSiteUrl: string;
};

/**
 * 메인 사이트로 연결되는 QR — 화면 미리보기 + Canvas PNG 다운로드
 */
export default function MainQrGenerator({ mainSiteUrl }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const downloadPng = useCallback(() => {
    const root = wrapRef.current;
    if (!root) return;
    const svg = root.querySelector('svg');
    if (!svg) return;

    setBusy(true);
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_PX;
      canvas.height = CANVAS_PX;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        setBusy(false);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
      ctx.drawImage(img, 0, 0, CANVAS_PX, CANVAS_PX);
      URL.revokeObjectURL(objectUrl);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setBusy(false);
            return;
          }
          const href = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = href;
          a.download = PNG_NAME;
          a.rel = 'noopener';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(href), 0);
          setBusy(false);
        },
        'image/png',
        1,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setBusy(false);
    };

    img.src = objectUrl;
  }, []);

  return (
    <section
      style={{
        marginBottom: 20,
        borderRadius: 12,
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
        padding: 16,
      }}
      aria-label="메인 홈 QR 코드"
    >
      <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
        오프라인 홍보 · 메인 홈 QR
      </h2>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748b', lineHeight: 1.55 }}>
        단톡·현수막용으로 메인 페이지로 바로 연결됩니다. URL은 배포 환경의{' '}
        <code style={{ fontSize: 11 }}>NEXT_PUBLIC_SITE_URL</code>(없으면 SEO 기본 도메인) 기준입니다.
      </p>

      <div
        ref={wrapRef}
        style={{
          display: 'inline-block',
          padding: 16,
          background: '#ffffff',
          borderRadius: 10,
          border: '1px solid #e2e8f0',
          lineHeight: 0,
        }}
      >
        <QRCode value={mainSiteUrl} size={PREVIEW_PX} level="H" fgColor="#0f172a" bgColor="#ffffff" />
      </div>

      <div style={{ marginTop: 14 }}>
        <button
          type="button"
          onClick={() => void downloadPng()}
          disabled={busy}
          style={{
            border: '1px solid #0f172a',
            borderRadius: 8,
            background: busy ? '#cbd5e1' : '#0f172a',
            color: busy ? '#475569' : '#fff',
            fontWeight: 700,
            fontSize: 13,
            padding: '10px 14px',
            cursor: busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? '이미지 준비 중…' : '메인 홈페이지 QR 이미지 다운로드'}
        </button>
      </div>

      <p
        style={{
          margin: '10px 0 0',
          fontSize: 12,
          color: '#334155',
          wordBreak: 'break-all',
        }}
      >
        <strong>링크:</strong> {mainSiteUrl}
      </p>
    </section>
  );
}
