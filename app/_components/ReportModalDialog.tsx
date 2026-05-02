'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/types';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const REPORT_KEYS = ['report.telegram_url', 'report.line_url', 'report.whatsapp_url'] as const;

function pickString(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v == null) return '';
  return String(v).trim();
}

function copyFor(locale: Locale) {
  if (locale === 'th') {
    return {
      title: 'กล่องแจ้งเบาะแส',
      subtitle: 'เลือกช่องทางที่สะดวก — เปิดแชทในแท็บใหม่',
      internal: 'แจ้งในเว็บ',
      telegram: 'Telegram',
      line: 'LINE',
      whatsapp: 'WhatsApp',
      close: 'ปิด',
      missing: 'ยังไม่ได้ตั้งค่าลิงก์ — โปรดติดต่อผู้ดูแล',
    };
  }
  return {
    title: '🚨 제보함',
    subtitle: '편한 채널을 골라 주세요 — 새 창에서 대화가 열립니다.',
    internal: '내부 제보',
    telegram: '텔레그램',
    line: 'LINE',
    whatsapp: 'WhatsApp',
    close: '닫기',
    missing: '관리자가 아직 링크를 등록하지 않았습니다.',
  };
}

const appTileClass =
  'flex min-h-[6.25rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-white/20 px-3 py-4 text-center shadow-lg ring-1 ring-black/20 backdrop-blur-md transition-transform active:scale-95 motion-safe:transition-transform';

export default function ReportModalDialog({
  open,
  onClose,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  locale: Locale;
}) {
  const copy = copyFor(locale);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const sb = createBrowserClient();
    const { data, error } = await sb.from('site_settings').select('key,value').in('key', [...REPORT_KEYS]);
    if (error) {
      toast.error(locale === 'th' ? 'โหลดไม่ได้' : '설정을 불러오지 못했습니다.');
      return;
    }
    const next: Record<string, string> = {};
    for (const row of data ?? []) {
      next[row.key as string] = pickString(row.value);
    }
    setUrls(next);
  }, [locale]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function openExternal(url: string) {
    const u = url.trim();
    if (!u) {
      toast.message(copy.missing, { position: 'top-center' });
      return;
    }
    window.open(u, '_blank', 'noopener,noreferrer');
  }

  if (!open) return null;

  const layer = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="relative w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 rounded-3xl border border-white/15 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-100 shadow-inner backdrop-blur-sm transition hover:bg-white/15"
          onClick={onClose}
        >
          {copy.close}
        </button>
        <h2 id="report-modal-title" className="pr-12 text-lg font-black tracking-tight text-white drop-shadow-sm">
          {copy.title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-300/90">{copy.subtitle}</p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Link
            prefetch={true}
            href="/boards?tab=reports"
            onClick={() => onClose()}
            className={cn(
              appTileClass,
              'bg-gray-700 text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
            )}
          >
            <span className="text-4xl leading-none drop-shadow-md" aria-hidden>
              🐘
            </span>
            <span className="text-sm font-extrabold leading-tight tracking-tight">{copy.internal}</span>
          </Link>

          <button
            type="button"
            className={cn(appTileClass, 'bg-blue-600 text-white hover:brightness-110')}
            onClick={() => openExternal(urls['report.telegram_url'] ?? '')}
          >
            <span className="text-4xl leading-none drop-shadow-md" aria-hidden>
              ✈️
            </span>
            <span className="text-sm font-extrabold leading-tight">{copy.telegram}</span>
          </button>

          <button
            type="button"
            className={cn(appTileClass, 'bg-green-500 text-white hover:brightness-110')}
            onClick={() => openExternal(urls['report.line_url'] ?? '')}
          >
            <span className="text-4xl leading-none drop-shadow-md" aria-hidden>
              💬
            </span>
            <span className="text-sm font-extrabold leading-tight">{copy.line}</span>
          </button>

          <button
            type="button"
            className={cn(appTileClass, 'bg-green-600 text-white hover:brightness-110')}
            onClick={() => openExternal(urls['report.whatsapp_url'] ?? '')}
          >
            <span className="text-4xl leading-none drop-shadow-md" aria-hidden>
              📞
            </span>
            <span className="text-sm font-extrabold leading-tight">{copy.whatsapp}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(layer, document.body);
}
