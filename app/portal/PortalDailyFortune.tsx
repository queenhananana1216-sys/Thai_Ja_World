'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/types';
import type { Portal2026Copy } from '@/i18n/portal2026Copy';
import type { PortalDailySparkPayload } from '@/lib/portal/portalDailySpark';
import { normalizeFortuneRpcPayload } from '@/lib/fortune/fortuneRpcPayload';
import styles from './portal-2026.module.css';

const FETCH_TRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientFortuneFailure(
  res: Response,
  norm: ReturnType<typeof normalizeFortuneRpcPayload>,
  text: string,
): boolean {
  if (res.status === 504 || res.status === 503 || res.status === 502) return true;
  const t = text.trim();
  if (!t) return true;
  if (norm && norm.ok === false) {
    const r = norm.reason ?? '';
    return ['TIMEOUT', 'RPC_ERROR', 'EMPTY_RESPONSE', 'PARSE_ERROR', 'EMPTY_OR_SHAPE'].includes(r);
  }
  if (!norm && res.status >= 500) return true;
  return false;
}

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
  const [needsRetryUi, setNeedsRetryUi] = useState(false);
  const [witIdx, setWitIdx] = useState(0);

  const wittyLines = useMemo(
    () => [copy.fortuneFetchingWittyA, copy.fortuneFetchingWittyB, copy.fortuneFetchingWittyC],
    [copy.fortuneFetchingWittyA, copy.fortuneFetchingWittyB, copy.fortuneFetchingWittyC],
  );

  const resetModal = useCallback(() => {
    setTipBody(null);
    setRewardAmount(null);
    setShowRewardAnim(false);
    setAlreadyMode(false);
    setTipHref(null);
    setNeedsRetryUi(false);
    setWitIdx(0);
  }, []);

  const shutAndReset = useCallback(() => {
    setOpen(false);
    resetModal();
  }, [resetModal]);

  const close = useCallback(() => {
    shutAndReset();
  }, [shutAndReset]);

  useEffect(() => {
    if (!busy || !open) return;
    const id = setInterval(() => setWitIdx((i) => (i + 1) % wittyLines.length), 2100);
    return () => clearInterval(id);
  }, [busy, open, wittyLines.length]);

  const runFortune = useCallback(async () => {
    setBusy(true);
    setNeedsRetryUi(false);
    resetModal();

    try {
      attemptLoop: for (let attempt = 0; attempt < FETCH_TRIES; attempt++) {
        let res: Response;
        try {
          res = await fetch('/api/fortune/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ locale }),
            signal: AbortSignal.timeout(26000),
          });
        } catch {
          if (attempt < FETCH_TRIES - 1) {
            await sleep(380 * (attempt + 1));
            continue;
          }
          toast.error(copy.fortuneErrorNetwork, { position: 'top-center' });
          setNeedsRetryUi(true);
          break attemptLoop;
        }

        const text = await res.text();
        let parsed: unknown = null;
        try {
          parsed = text ? (JSON.parse(text) as unknown) : null;
        } catch {
          parsed = null;
        }
        const norm = normalizeFortuneRpcPayload(parsed);

        if (!res.ok && norm && norm.ok === false && norm.reason === 'NOT_AUTHENTICATED') {
          toast.error(copy.fortuneLoginToast, { position: 'top-center' });
          shutAndReset();
          router.push('/login');
          return;
        }

        if (!res.ok) {
          const failReason =
            norm && norm.ok === false && typeof norm.reason === 'string' ? norm.reason : '';
          const transient = isTransientFortuneFailure(res, norm, text);
          if (transient && attempt < FETCH_TRIES - 1) {
            await sleep(380 * (attempt + 1));
            continue;
          }
          if (
            failReason === 'RPC_ERROR' ||
            failReason === 'TIMEOUT' ||
            failReason === 'EMPTY_RESPONSE' ||
            failReason === 'PARSE_ERROR' ||
            failReason === 'EMPTY_OR_SHAPE'
          ) {
            toast.error(copy.fortuneErrorServer, { position: 'top-center' });
            setNeedsRetryUi(true);
            break attemptLoop;
          }
          if (!text.trim() || parsed === null) {
            toast.error(copy.fortuneErrorNetwork, { position: 'top-center' });
            setNeedsRetryUi(true);
            break attemptLoop;
          }
          toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
          setNeedsRetryUi(true);
          break attemptLoop;
        }

        if (!norm) {
          if (attempt < FETCH_TRIES - 1 && isTransientFortuneFailure(res, norm, text)) {
            await sleep(380 * (attempt + 1));
            continue;
          }
          toast.error(copy.fortuneErrorServer, { position: 'top-center' });
          setNeedsRetryUi(true);
          break attemptLoop;
        }

        if (norm.ok === true) {
          const tipRaw = norm.tip;
          const body = typeof tipRaw?.body === 'string' ? tipRaw.body.trim() : '';
          const amt = typeof norm.amount === 'number' && Number.isFinite(norm.amount) ? norm.amount : 0;
          const sid = typeof tipRaw?.sourcePostId === 'string' ? tipRaw.sourcePostId.trim() : '';
          if (!body && !sid) {
            toast.error(copy.fortuneErrorServer, { position: 'top-center' });
            setNeedsRetryUi(true);
            break attemptLoop;
          }
          setTipBody(body || copy.fortuneTipFallback);
          setRewardAmount(amt);
          setTipHref(sid ? `/tips/${encodeURIComponent(sid)}` : null);
          requestAnimationFrame(() => {
            setShowRewardAnim(true);
          });
          break attemptLoop;
        }

        const reason = norm.reason;
        if (reason === 'ALREADY_CLAIMED') {
          setAlreadyMode(true);
          break attemptLoop;
        }
        if (reason === 'NO_TIPS') {
          toast.error(copy.fortuneNoTips, { position: 'top-center' });
          shutAndReset();
          break attemptLoop;
        }
        if (reason === 'CONFIG_INVALID') {
          toast.error(copy.fortuneConfigError, { position: 'top-center' });
          shutAndReset();
          break attemptLoop;
        }
        if (reason === 'PROFILE_NOT_FOUND') {
          toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
          shutAndReset();
          break attemptLoop;
        }
        toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
        setNeedsRetryUi(true);
        break attemptLoop;
      }
    } catch {
      toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
      setNeedsRetryUi(true);
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
                <div className={styles.fortuneSkeletonWrap}>
                  <p className={styles.fortuneMuted}>{wittyLines[witIdx % wittyLines.length]}</p>
                  <div className={styles.fortuneShimmerBar} aria-hidden />
                  <div className={styles.fortuneShimmerBarShort} aria-hidden />
                </div>
              ) : needsRetryUi ? (
                <div className={styles.fortuneRetryGlass}>
                  <p>{copy.fortuneTransientHint}</p>
                  <button
                    type="button"
                    className={styles.fortuneRetryBtn}
                    onClick={() => void runFortune()}
                    disabled={busy}
                  >
                    {copy.fortuneRetryCta}
                  </button>
                </div>
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
