'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/types';
import { createBrowserClient } from '@/lib/supabase/client';

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
      internal: 'รายงานภายในเว็บ',
      close: 'ปิด',
      missing: 'ยังไม่ได้ตั้งค่าลิงก์ — โปรดติดต่อผู้ดูแล',
    };
  }
  return {
    title: '🚨 제보함',
    subtitle: '편한 채널을 골라 주세요 — 새 창에서 대화가 열립니다.',
    internal: '태국에, 살자 내부 제보',
    close: '닫기',
    missing: '관리자가 아직 링크를 등록하지 않았습니다.',
  };
}

function TelegramLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#2AABEE" />
      <path
        fill="#fff"
        d="M11 23.8 34 14l-3.2 22.5-8.6-8.4 6.4-5.8-8.7 6.6L11 23.8z"
      />
    </svg>
  );
}

function LineLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden>
      <rect x="3" y="3" width="42" height="42" rx="14" fill="#06C755" />
      <path
        fill="#fff"
        d="M14 31V17h4.8c2.7 0 4.4 1.5 4.4 3.8 0 2.4-1.7 3.9-4.5 3.9H17v6H14zm7.8-10h3.4c1.5 0 2.4-.8 2.4-2 0-1.1-.9-1.9-2.3-1.9H22v4zm9.8 0h6.8v2.8h-4v2.4h3.6v2.7h-3.6v5.3h-3V21z"
      />
    </svg>
  );
}

function WhatsAppLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9" aria-hidden>
      <circle cx="24" cy="24" r="22" fill="#25D366" />
      <path
        fill="#fff"
        d="M24 13c-6 0-11 4.4-11 9.8 0 1.9.6 3.7 1.6 5.3L13 35l6.9-2c1.5.8 3.2 1.3 5 1.3 6 0 11-4.4 11-9.8S30 13 24 13zm5.4 13.7c-.3.8-1.7 1.6-2.4 1.7-.6.1-1.4.1-2-.2-.5-.2-2-.8-3.8-2.4-1.4-1.3-2.4-2.9-2.7-3.4-.3-.5-.5-1-.1-1.6l.7-.9c.2-.3.4-.6.5-.9.1-.3 0-.6-.1-.8l-.9-2.2c-.2-.6-.5-.6-.8-.6h-.7c-.3 0-.8.1-1.2.6-.4.6-1.6 1.6-1.6 3.9 0 2.3 1.7 4.5 1.9 4.8.2.3 3.3 5 8 7 .9.5 1.6.8 2.2 1 .9.3 1.7.3 2.3.2.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.7.2-1.8-.1-.2-.3-.3-.6-.5z"
      />
    </svg>
  );
}

export function ReportQuickMenuTile({
  locale,
  iconClassName,
  label,
}: {
  locale: Locale;
  iconClassName?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <li className="min-w-0">
        <button
          type="button"
          className="flex w-full touch-manipulation flex-col items-center gap-2 rounded-xl px-1 py-1 text-gray-100 active:opacity-90"
          onClick={() => setOpen(true)}
        >
          <span
            className={
              iconClassName ??
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800/90 text-[1.35rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            }
            aria-hidden
          >
            🚨
          </span>
          <span className="line-clamp-2 w-full text-center text-sm font-semibold leading-snug">{label}</span>
        </button>
      </li>
      <ReportModal open={open} onClose={() => setOpen(false)} locale={locale} />
    </>
  );
}

export default function ReportModal({
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md animate-in fade-in duration-200"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="relative w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 rounded-3xl border border-white/12 bg-slate-950/75 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl"
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
          onClick={onClose}
        >
          {copy.close}
        </button>
        <h2 id="report-modal-title" className="pr-10 text-lg font-black tracking-tight text-white">
          {copy.title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{copy.subtitle}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link
            href="/boards?tab=reports"
            onClick={() => onClose()}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-center shadow-inner transition hover:border-rose-400/35 hover:bg-rose-500/10"
          >
            <span className="text-3xl" aria-hidden>
              🐘
            </span>
            <span className="text-[11px] font-bold leading-snug text-slate-100">{copy.internal}</span>
          </Link>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 shadow-inner transition hover:border-sky-400/35 hover:bg-sky-500/10"
            onClick={() => openExternal(urls['report.telegram_url'] ?? '')}
          >
            <TelegramLogo />
            <span className="text-[11px] font-bold text-slate-100">Telegram</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 shadow-inner transition hover:border-emerald-400/35 hover:bg-emerald-500/10"
            onClick={() => openExternal(urls['report.line_url'] ?? '')}
          >
            <LineLogo />
            <span className="text-[11px] font-bold text-slate-100">LINE</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 shadow-inner transition hover:border-lime-400/35 hover:bg-lime-500/10"
            onClick={() => openExternal(urls['report.whatsapp_url'] ?? '')}
          >
            <WhatsAppLogo />
            <span className="text-[11px] font-bold text-slate-100">WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(layer, document.body);
}
