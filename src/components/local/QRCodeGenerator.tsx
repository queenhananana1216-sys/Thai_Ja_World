'use client';

import QRCode from 'react-qr-code';

type Props = {
  /** 인코딩할 전체 URL (예: https://…/local/my-shop/minihome) */
  value: string;
  /** 픽셀 크기 (모바일 메뉴판 기본 220) */
  size?: number;
  /** 접근성·캡션 */
  caption?: string;
  className?: string;
};

/**
 * 테이블용 인쇄·화면 표시용 QR — 현재 메뉴판 URL 등을 그대로 넣습니다.
 */
export default function QRCodeGenerator({ value, size = 200, caption, className }: Props) {
  if (!value.trim()) return null;
  return (
    <div
      className={
        className ??
        'inline-flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white p-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
      }
    >
      <div className="rounded-lg bg-white p-2">
        <QRCode value={value} size={size} level="M" />
      </div>
      {caption ? <p className="max-w-[260px] text-center text-[11px] leading-snug text-slate-600">{caption}</p> : null}
      <p className="max-w-[280px] break-all text-center font-mono text-[10px] text-slate-500">{value}</p>
    </div>
  );
}
