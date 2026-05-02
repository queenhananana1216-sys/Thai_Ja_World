'use client';

import { useCallback, useRef, useState, type CSSProperties } from 'react';
import QRCode from 'react-qr-code';

const btnPrimary: CSSProperties = {
  padding: '10px 14px',
  background: '#0f172a',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const PREVIEW_PX = 240;
/** 인쇄·스티커 제작소용 고해상도 */
export const TABLE_QR_PRINT_PX = 2048;

type Props = {
  menuUrl: string;
  spotName: string;
};

export default function TableStickerQr({ menuUrl, spotName }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const safeName = spotName.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\-]+/g, '_').slice(0, 40) || 'spot';

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
      canvas.width = TABLE_QR_PRINT_PX;
      canvas.height = TABLE_QR_PRINT_PX;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        setBusy(false);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, TABLE_QR_PRINT_PX, TABLE_QR_PRINT_PX);
      ctx.drawImage(img, 0, 0, TABLE_QR_PRINT_PX, TABLE_QR_PRINT_PX);
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
          a.download = `table-sticker-qr_${safeName}_${TABLE_QR_PRINT_PX}px.png`;
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
  }, [safeName]);

  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 12,
        border: '1px solid #cbd5e1',
        background: '#fff',
        padding: 16,
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
        ① 테이블 스티커용 QR ({TABLE_QR_PRINT_PX}×{TABLE_QR_PRINT_PX}px PNG)
      </h3>
      <p style={{ marginBottom: 12, fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>
        손님이 스캔하면 다국어 메뉴판·장바구니 주문 화면으로 바로 연결됩니다.
      </p>
      <div
        ref={wrapRef}
        style={{
          display: 'inline-block',
          padding: 14,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          lineHeight: 0,
        }}
      >
        <QRCode value={menuUrl} size={PREVIEW_PX} level="H" fgColor="#0f172a" bgColor="#ffffff" />
      </div>
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          style={{ ...btnPrimary, opacity: busy ? 0.65 : 1, cursor: busy ? 'wait' : 'pointer' }}
          disabled={busy}
          onClick={() => void downloadPng()}
        >
          {busy ? 'PNG 생성 중…' : `고해상도 PNG 다운로드 (${TABLE_QR_PRINT_PX}px)`}
        </button>
      </div>
      <p style={{ marginTop: 10, fontSize: 11, color: '#64748b', wordBreak: 'break-all' }}>
        URL: <code>{menuUrl}</code>
      </p>
    </div>
  );
}
