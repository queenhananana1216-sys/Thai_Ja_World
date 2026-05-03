'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/types';
import type { Portal2026Copy } from '@/i18n/portal2026Copy';
import styles from './portal-2026.module.css';

type FortuneRpcOk = {
  ok: true;
  tip?: { id?: string; body?: string; sourcePostId?: string | null };
  amount?: number;
  thai_balance?: number;
};

type FortuneRpcFail = {
  ok: false;
  reason?: string;
  message?: string;
};

function attendanceLine(locale: Locale, amount: number): string {
  if (locale === 'th') {
    return `เช็คอินสำเร็จ! +${amount} THAI`;
  }
  return `출석 완료! +${amount} 타이(THAI) 획득`;
}

export default function PortalDailyFortune({
  locale,
  isLoggedIn,
  copy,
}: {
  locale: Locale;
  isLoggedIn: boolean;
  copy: Portal2026Copy;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tipBody, setTipBody] = useState<string | null>(null);
  const [rewardAmount, setRewardAmount] = useState<number | null>(null);
  const [showRewardAnim, setShowRewardAnim] = useState(false);
  const [alreadyMode, setAlreadyMode] = useState(false);
  const [tipHref, setTipHref] = useState<string | null>(null);

  const resetModal = useCallback(() => {
    setTipBody(null);
    setRewardAmount(null);
    setShowRewardAnim(false);
    setAlreadyMode(false);
    setTipHref(null);
  }, []);

  const shutAndReset = useCallback(() => {
    setOpen(false);
    resetModal();
  }, [resetModal]);

  const close = useCallback(() => {
    shutAndReset();
  }, [shutAndReset]);

  const runFortune = useCallback(async () => {
    setBusy(true);
    resetModal();
    try {
      const res = await fetch('/api/fortune/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ locale }),
      });
      const raw = (await res.json()) as FortuneRpcOk | FortuneRpcFail;

      if (
        !res.ok &&
        raw &&
        typeof raw === 'object' &&
        raw.ok === false &&
        raw.reason === 'NOT_AUTHENTICATED'
      ) {
        toast.error(copy.fortuneLoginToast, { position: 'top-center' });
        shutAndReset();
        router.push('/login');
        return;
      }

      if (!raw || typeof raw !== 'object') {
        toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
        return;
      }

      if ('ok' in raw && raw.ok === true) {
        const tipRaw = raw.tip as { body?: string; sourcePostId?: string | null } | undefined;
        const body = typeof tipRaw?.body === 'string' ? tipRaw.body.trim() : '';
        const amt = typeof raw.amount === 'number' && Number.isFinite(raw.amount) ? raw.amount : 0;
        const sid =
          typeof tipRaw?.sourcePostId === 'string' ? tipRaw.sourcePostId.trim() : '';
        setTipBody(body || copy.fortuneTipFallback);
        setRewardAmount(amt);
        setTipHref(sid ? `/tips/${encodeURIComponent(sid)}` : null);
        requestAnimationFrame(() => {
          setShowRewardAnim(true);
        });
        return;
      }

      const reason = raw.reason;
      if (reason === 'ALREADY_CLAIMED') {
        setAlreadyMode(true);
        return;
      }
      if (reason === 'NO_TIPS') {
        toast.error(copy.fortuneNoTips, { position: 'top-center' });
        shutAndReset();
        return;
      }
      if (reason === 'CONFIG_INVALID') {
        toast.error(copy.fortuneConfigError, { position: 'top-center' });
        shutAndReset();
        return;
      }
      toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
    } catch {
      toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
    } finally {
      setBusy(false);
    }
  }, [locale, router, copy, resetModal, shutAndReset]);

  const onOpenClick = useCallback(() => {
    if (!isLoggedIn) {
      toast.error(copy.fortuneLoginToast, { position: 'top-center' });
      router.push('/login');
      return;
    }
    setOpen(true);
    void runFortune();
  }, [isLoggedIn, router, copy.fortuneLoginToast, runFortune]);

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={styles.fortuneBackdrop}
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) close();
            }}
          >
            <div
              className={styles.fortuneModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tj-fortune-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="tj-fortune-title" className={styles.fortuneModalTitle}>
                {copy.fortuneModalTitle}
              </h3>

              {busy ? (
                <p className={styles.fortuneMuted}>{copy.fortuneLoading}</p>
              ) : alreadyMode ? (
                <p className={styles.fortuneAlready}>{copy.fortuneAlreadyClaimed}</p>
              ) : (
                <>
                  <div className={styles.fortuneCookie}>
                    <p className={styles.fortuneTipLabel}>{copy.fortuneTipLead}</p>
                    <p className={styles.fortuneTipBody}>{tipBody}</p>
                  </div>
                  {tipHref ? (
                    <Link prefetch={true} href={tipHref} className={styles.fortuneReadMore}>
                      {copy.fortuneReadMore}
                    </Link>
                  ) : null}
                  {rewardAmount != null && rewardAmount > 0 ? (
                    <p
                      className={
                        showRewardAnim ? `${styles.fortuneReward} ${styles.fortuneRewardPop}` : styles.fortuneReward
                      }
                      aria-live="polite"
                    >
                      {attendanceLine(locale, rewardAmount)}
                    </p>
                  ) : null}
                </>
              )}

              <button type="button" className={styles.fortuneCloseBtn} onClick={close} disabled={busy}>
                {copy.fortuneClose}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" className={styles.fortuneBtn} onClick={onOpenClick}>
        {copy.fortuneButton}
      </button>
      {modal}
    </>
  );
}
