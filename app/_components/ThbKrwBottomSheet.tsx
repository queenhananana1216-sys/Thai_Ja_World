'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Locale } from '@/i18n/types';

function copy(locale: Locale) {
  if (locale === 'th') {
    return {
      title: '💱 เรทบาท · วอน',
      subtitle: 'อ้างอิงสำหรับชีวิตประจำวัน — ไม่ใช่เรทโอนจริงของธนาคาร',
      loading: 'กำลังโหลด…',
      error: 'โหลดเรทไม่ได้ ลองใหม่ภายหลัง',
      perBaht: '1 THB ≒',
      wonSuffix: 'วอน',
      calcLabel: 'คิดเลขเร็ว',
      calcPlaceholder: 'เช่น 1000',
      bahtUnit: 'บาท',
      approx: 'ประมาณ',
      close: 'ปิด',
      refreshed: 'อัปเดต',
    };
  }
  return {
    title: '💱 바트 · 원 환율',
    subtitle: '생활 참고용 시세입니다. 실제 송금·환전은 금융사 고시를 확인하세요.',
    loading: '불러오는 중…',
    error: '환율을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    perBaht: '1 THB ≒',
    wonSuffix: '원',
    calcLabel: '미니 계산기',
    calcPlaceholder: '예: 1000',
    bahtUnit: '바트',
    approx: '약',
    close: '닫기',
    refreshed: '기준일',
  };
}

function parseBahtInput(raw: string): number {
  const n = Number(raw.replace(/,/g, '').replace(/\s/g, '').trim());
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function ThbKrwQuickMenuTile({
  locale,
  label,
}: {
  locale: Locale;
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
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800/90 text-[1.35rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            aria-hidden
          >
            💱
          </span>
          <span className="line-clamp-2 w-full text-center text-sm font-semibold leading-snug">{label}</span>
        </button>
      </li>
      <ThbKrwBottomSheet open={open} onClose={() => setOpen(false)} locale={locale} />
    </>
  );
}

export default function ThbKrwBottomSheet({
  open,
  onClose,
  locale,
}: {
  open: boolean;
  onClose: () => void;
  locale: Locale;
}) {
  const t = copy(locale);
  const titleId = useId();
  const [rate, setRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [bahtRaw, setBahtRaw] = useState('1000');

  const load = useCallback(async () => {
    setFetchErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/exchange/thb-krw');
      const j = (await res.json()) as { rate?: number; date?: string; source?: string; error?: string };
      if (!res.ok || typeof j.rate !== 'number') {
        setFetchErr(j.error ?? t.error);
        setRate(null);
        return;
      }
      setRate(j.rate);
      setRateDate(typeof j.date === 'string' ? j.date : '');
      setSource(typeof j.source === 'string' ? j.source : '');
    } catch {
      setFetchErr(t.error);
      setRate(null);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const bahtAmount = useMemo(() => parseBahtInput(bahtRaw), [bahtRaw]);
  const krwApprox =
    rate != null && Number.isFinite(bahtAmount) && bahtAmount >= 0
      ? Math.round(bahtAmount * rate)
      : null;

  const numLocale = locale === 'th' ? 'th-TH' : 'ko-KR';

  if (!open) return null;

  const sheet = (
    <div className="fixed inset-0 z-[85] flex flex-col justify-end" role="presentation">
      <button
        type="button"
        aria-label={t.close}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[min(92vh,680px)] w-full overflow-hidden rounded-t-[1.75rem] border border-white/12 border-b-0 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/95 shadow-[0_-12px_48px_rgba(0,0,0,0.45)] animate-in slide-in-from-bottom duration-300 ease-out"
      >
        <div className="flex justify-center pt-3 pb-1">
          <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
        </div>
        <div className="max-h-[inherit] overflow-y-auto overscroll-contain px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-1">
          <h2 id={titleId} className="text-center text-lg font-black tracking-tight text-white">
            {t.title}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-center text-[11px] leading-relaxed text-slate-400">
            {t.subtitle}
          </p>

          <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-5 text-center shadow-inner">
            {loading ? (
              <p className="text-sm text-emerald-100/90">{t.loading}</p>
            ) : fetchErr ? (
              <p className="text-sm text-rose-200">{fetchErr}</p>
            ) : rate != null ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/80">
                  {t.perBaht}
                </p>
                <p className="mt-1 text-4xl font-black tabular-nums tracking-tight text-white sm:text-5xl">
                  {rate.toLocaleString(numLocale, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  <span className="ml-1 text-xl font-bold text-emerald-100/90 sm:text-2xl">{t.wonSuffix}</span>
                </p>
                {(rateDate || source) && (
                  <p className="mt-2 text-[10px] text-slate-500">
                    {rateDate ? `${t.refreshed} ${rateDate}` : null}
                    {rateDate && source ? ' · ' : null}
                    {source === 'frankfurter' ? 'ECB/Frankfurter' : source === 'currency-api' ? 'Community rates' : source}
                  </p>
                )}
              </>
            ) : null}
          </div>

          <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-violet-400/20 bg-violet-500/[0.07] p-4 shadow-inner">
            <label className="block text-center text-[11px] font-bold uppercase tracking-widest text-violet-200/90">
              {t.calcLabel}
            </label>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <input
                inputMode="decimal"
                autoComplete="off"
                placeholder={t.calcPlaceholder}
                value={bahtRaw}
                onChange={(e) => setBahtRaw(e.target.value)}
                className="min-w-[7rem] flex-1 rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2.5 text-center text-lg font-bold tabular-nums text-white outline-none ring-violet-400/40 placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2"
              />
              <span className="text-sm font-semibold text-violet-100/90">{t.bahtUnit}</span>
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-slate-950/40 px-3 py-4 text-center">
              {krwApprox != null && rate != null ? (
                <p className="text-base font-semibold text-slate-100">
                  <span className="text-violet-200/90">{t.approx}</span>{' '}
                  <span className="text-2xl font-black tabular-nums text-amber-100">
                    {krwApprox.toLocaleString(numLocale)}
                  </span>{' '}
                  <span className="text-lg font-bold text-amber-200/80">{t.wonSuffix}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-500">{t.calcPlaceholder}</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
              onClick={onClose}
            >
              {t.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(sheet, document.body);
}
