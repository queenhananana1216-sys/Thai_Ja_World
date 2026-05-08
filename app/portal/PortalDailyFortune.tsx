'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type { Locale } from '@/i18n/types';
import type { Portal2026Copy } from '@/i18n/portal2026Copy';
import type { PortalDailySparkPayload } from '@/lib/portal/portalDailySpark';
import { normalizeFortuneRpcPayload } from '@/lib/fortune/fortuneRpcPayload';
import styles from './portal-2026.module.css';

const FETCH_TRIES = 5;
const AUTO_RETRY_MS = 26_000;
const FORTUNE_LS = 'tj.portalDailyFortune.v2';

type FortuneCacheV2 = {
  v: 2;
  dateKey: string;
  locale: string;
  tipBody: string;
  tipHref: string | null;
  rewardAmount: number;
};

function bangkokDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function readFortuneCache(locale: string): FortuneCacheV2 | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FORTUNE_LS);
    if (!raw) return null;
    const j = JSON.parse(raw) as FortuneCacheV2;
    if (j?.v !== 2 || typeof j.tipBody !== 'string' || !j.tipBody.trim()) return null;
    if (j.dateKey !== bangkokDateKey()) return null;
    if (j.locale !== locale) return null;
    return j;
  } catch {
    return null;
  }
}

function writeFortuneCache(locale: string, payload: Omit<FortuneCacheV2, 'v' | 'dateKey' | 'locale'>): void {
  if (typeof window === 'undefined') return;
  try {
    const row: FortuneCacheV2 = {
      v: 2,
      dateKey: bangkokDateKey(),
      locale,
      ...payload,
    };
    localStorage.setItem(FORTUNE_LS, JSON.stringify(row));
  } catch {
    /* quota / private mode */
  }
}

function reportFortunePathCongestion(pathname: string): void {
  void fetch('/api/health/report-ui-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'fortune_path_congestion',
      incident_kind: 'fortune_path_congestion',
      message:
        'Daily fortune: retries exhausted, no Bangkok-date cache — user-facing congestion state.',
      digest: 'fortune_path_congestion:v2',
      pathname,
    }),
  }).catch(() => {});
}

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
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [tipBody, setTipBody] = useState<string | null>(null);
  const [rewardAmount, setRewardAmount] = useState<number | null>(null);
  const [showRewardAnim, setShowRewardAnim] = useState(false);
  const [alreadyMode, setAlreadyMode] = useState(false);
  const [tipHref, setTipHref] = useState<string | null>(null);
  const [needsRetryUi, setNeedsRetryUi] = useState(false);
  const [witIdx, setWitIdx] = useState(0);
  const incidentSentRef = useRef(false);

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
    setRevalidating(false);
    setWitIdx(0);
    incidentSentRef.current = false;
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

  /** 백그라운드 자동 재시도 — 수동「다시 받아보기」없이 복구 시도 */
  useEffect(() => {
    if (!open || !needsRetryUi) return;
    const id = setInterval(() => {
      void runFortuneRef.current?.();
    }, AUTO_RETRY_MS);
    return () => clearInterval(id);
  }, [open, needsRetryUi]);

  const runFortuneRef = useRef<
    ((opts?: { bootstrapCache?: FortuneCacheV2 | null }) => Promise<void>) | undefined
  >(undefined);

  const runFortune = useCallback(
    async (opts?: { bootstrapCache?: FortuneCacheV2 | null }) => {
      const bootstrap = opts?.bootstrapCache ?? null;
      const hadBootstrap = Boolean(bootstrap);
      const silent = hadBootstrap;

      if (hadBootstrap) {
        setRevalidating(true);
      } else {
        setBusy(true);
        setNeedsRetryUi(false);
        setTipBody(null);
        setTipHref(null);
        setRewardAmount(null);
      }

      let claimSucceeded = false;
      let sawAlreadyClaimed = false;
      let abortedToLogin = false;

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
            if (!silent) {
              toast.error(copy.fortuneErrorNetwork, { position: 'top-center' });
            }
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
            if (!silent) toast.error(copy.fortuneLoginToast, { position: 'top-center' });
            shutAndReset();
            router.push('/login');
            abortedToLogin = true;
            break attemptLoop;
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
              if (!silent) toast.error(copy.fortuneErrorServer, { position: 'top-center' });
              break attemptLoop;
            }
            if (!text.trim() || parsed === null) {
              if (!silent) toast.error(copy.fortuneErrorNetwork, { position: 'top-center' });
              break attemptLoop;
            }
            if (!silent) toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
            break attemptLoop;
          }

          if (!norm) {
            if (attempt < FETCH_TRIES - 1 && isTransientFortuneFailure(res, norm, text)) {
              await sleep(380 * (attempt + 1));
              continue;
            }
            if (!silent) toast.error(copy.fortuneErrorServer, { position: 'top-center' });
            break attemptLoop;
          }

          if (norm.ok === true) {
            const tipRaw = norm.tip;
            const body = typeof tipRaw?.body === 'string' ? tipRaw.body.trim() : '';
            const amt = typeof norm.amount === 'number' && Number.isFinite(norm.amount) ? norm.amount : 0;
            const sid = typeof tipRaw?.sourcePostId === 'string' ? tipRaw.sourcePostId.trim() : '';
            if (!body && !sid) {
              if (!silent) toast.error(copy.fortuneErrorServer, { position: 'top-center' });
              break attemptLoop;
            }
            setTipBody(body || copy.fortuneTipFallback);
            setRewardAmount(amt);
            setTipHref(sid ? `/tips/${encodeURIComponent(sid)}` : null);
            writeFortuneCache(locale, {
              tipBody: body || copy.fortuneTipFallback,
              tipHref: sid ? `/tips/${encodeURIComponent(sid)}` : null,
              rewardAmount: amt,
            });
            requestAnimationFrame(() => {
              setShowRewardAnim(true);
            });
            claimSucceeded = true;
            break attemptLoop;
          }

          const reason = norm.reason;
          if (reason === 'ALREADY_CLAIMED') {
            setAlreadyMode(true);
            sawAlreadyClaimed = true;
            break attemptLoop;
          }
          if (reason === 'NO_TIPS') {
            if (!silent) toast.error(copy.fortuneNoTips, { position: 'top-center' });
            shutAndReset();
            break attemptLoop;
          }
          if (reason === 'CONFIG_INVALID') {
            if (!silent) toast.error(copy.fortuneConfigError, { position: 'top-center' });
            shutAndReset();
            break attemptLoop;
          }
          if (reason === 'PROFILE_NOT_FOUND') {
            if (!silent) toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
            shutAndReset();
            break attemptLoop;
          }
          if (!silent) toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
          break attemptLoop;
        }
      } catch {
        if (!silent) toast.error(copy.fortuneErrorGeneric, { position: 'top-center' });
      } finally {
        setBusy(false);
        setRevalidating(false);
      }

      if (abortedToLogin) return;

      if (claimSucceeded || sawAlreadyClaimed) {
        setNeedsRetryUi(false);
        incidentSentRef.current = false;
        return;
      }

      const diskCache = readFortuneCache(locale);
      if (diskCache?.tipBody?.trim()) {
        setTipBody(diskCache.tipBody);
        setTipHref(diskCache.tipHref);
        setRewardAmount(diskCache.rewardAmount);
        setNeedsRetryUi(false);
        incidentSentRef.current = false;
        return;
      }

      setNeedsRetryUi(true);
      if (!incidentSentRef.current) {
        incidentSentRef.current = true;
        reportFortunePathCongestion(pathname);
      }
    },
    [locale, router, copy, shutAndReset, pathname],
  );

  runFortuneRef.current = runFortune;

  const onOpenClick = useCallback(() => {
    if (!isLoggedIn) {
      toast.error(copy.fortuneLoginToast, { position: 'top-center' });
      router.push('/login');
      return;
    }
    const cached = readFortuneCache(locale);
    if (cached) {
      setTipBody(cached.tipBody);
      setTipHref(cached.tipHref);
      setRewardAmount(cached.rewardAmount);
      setNeedsRetryUi(false);
      setAlreadyMode(false);
      setShowRewardAnim(false);
      incidentSentRef.current = false;
    } else {
      resetModal();
    }
    setOpen(true);
    void runFortune({ bootstrapCache: cached });
  }, [isLoggedIn, router, copy.fortuneLoginToast, locale, resetModal, runFortune]);

  const hasContentShell = Boolean(tipBody?.trim()) || Boolean(tipHref) || rewardAmount != null;

  const modal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={styles.fortuneBackdrop}
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy && !revalidating) close();
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

              {busy && !hasContentShell ? (
                <div className={styles.fortuneSkeletonWrap}>
                  <p className={styles.fortuneMuted}>{wittyLines[witIdx % wittyLines.length]}</p>
                  <div className={styles.fortuneShimmerBar} aria-hidden />
                  <div className={styles.fortuneShimmerBarShort} aria-hidden />
                </div>
              ) : needsRetryUi && !hasContentShell ? (
                <div className={styles.fortuneRetryGlass}>
                  <p>{copy.fortuneTransientHint}</p>
                  <p className={styles.fortuneMuted}>{copy.fortuneAutoRetryNote}</p>
                </div>
              ) : alreadyMode ? (
                <p className={styles.fortuneAlready}>{copy.fortuneAlreadyClaimed}</p>
              ) : (
                <>
                  {revalidating ? (
                    <p className={`${styles.fortuneMuted} text-xs mb-2`}>{copy.fortuneStaleRevalidateNote}</p>
                  ) : null}
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
                  {needsRetryUi && hasContentShell ? (
                    <p className={`${styles.fortuneMuted} text-xs mt-2`}>{copy.fortuneAutoRetryNote}</p>
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
