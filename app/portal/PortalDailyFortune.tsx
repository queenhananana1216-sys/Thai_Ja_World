'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/types';
import type { Portal2026Copy } from '@/i18n/portal2026Copy';
import type { PortalDailySparkPayload } from '@/lib/portal/portalDailySpark';
import { normalizeFortuneRpcPayload } from '@/lib/fortune/fortuneRpcPayload';
import styles from './portal-2026.module.css';

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
  dailySpark,
}: {
  locale: Locale;
  isLoggedIn: boolean;
  copy: Portal2026Copy;
  dailySpark?: PortalDailySparkPayload | null;
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
      const text = await res.text();
      let parsed: unknown = null;
      try {
        parsed = text ? (JSON.parse(text) as unknown) : null;
      } catch {
        parsed = null;
      }
      const norm = normalizeFortuneRpcPayload(parsed);

      if (
        !res.ok &&
        norm &&
        norm.ok === false &&
        norm.reason === 'NOT_AUTHENTICATED'
      ) {
        toast.error(copy.fortuneLoginToast, { position: 'top-center' });
        shutAndReset();
        router.push('/login');
        return;
      }

      if (!norm) {
        toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
        return;
      }

      if (norm.ok === true) {
        const tipRaw = norm.tip;
        const body = typeof tipRaw?.body === 'string' ? tipRaw.body.trim() : '';
        const amt = typeof norm.amount === 'number' && Number.isFinite(norm.amount) ? norm.amount : 0;
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

      const reason = norm.reason;
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
      if (reason === 'PROFILE_NOT_FOUND') {
        toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
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
      {dailySpark ? (
        <div className={styles.fortuneSparkWrap}>
          <div className={styles.fortuneSparkCard}>
            <p className={styles.fortuneSparkTitle}>{copy.fortuneSparkThemeTitle}</p>
            <p className={styles.fortuneSparkLine}>{dailySpark.fortune_line}</p>
            <p className={styles.fortuneSparkDetail}>{dailySpark.fortune_detail}</p>
          </div>
        </div>
      ) : null}
      <button type="button" className={styles.fortuneBtn} onClick={onOpenClick}>
        {copy.fortuneButton}
      </button>
      {modal}
    </>
  );
}
