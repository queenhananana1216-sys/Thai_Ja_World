'use client';

import { useEffect, useState } from 'react';
import type { PortalFeaturedPoll } from '../lib/home/fetchPortalHomeFeed';
import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';

const STORAGE_KEY = 'tj_poll_anon_v1';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const cur = localStorage.getItem(STORAGE_KEY);
    if (cur && UUID_RE.test(cur)) return cur;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return '';
  }
}

export default function PortalBalancePoll({
  poll,
  locale,
  isLoggedIn,
}: {
  poll: PortalFeaturedPoll;
  locale: Locale;
  isLoggedIn: boolean;
}) {
  const copy = getPortal2026Copy(locale);
  const numLocale = locale === 'th' ? 'th-TH' : 'ko-KR';

  const [votesA, setVotesA] = useState(poll.votesA);
  const [votesB, setVotesB] = useState(poll.votesB);
  const [myChoice, setMyChoice] = useState<'a' | 'b' | null>(null);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    const q = new URLSearchParams({ pollId: poll.id });
    if (!isLoggedIn) {
      const aid = getOrCreateAnonId();
      if (aid) q.set('anonId', aid);
    }

    void (async () => {
      try {
        const r = await fetch(`/api/polls/status?${q.toString()}`, { signal: ac.signal });
        if (!r.ok) return;
        const j = (await r.json()) as {
          votesA?: unknown;
          votesB?: unknown;
          myChoice?: unknown;
        };
        if (typeof j.votesA === 'number') setVotesA(j.votesA);
        if (typeof j.votesB === 'number') setVotesB(j.votesB);
        if (j.myChoice === 'a' || j.myChoice === 'b') {
          setMyChoice(j.myChoice);
          setReveal(true);
        }
      } catch {
        /* ignore */
      }
    })();

    return () => ac.abort();
  }, [poll.id, isLoggedIn]);

  const total = Math.max(0, votesA + votesB);
  const pctA = total > 0 ? Math.round((votesA / total) * 1000) / 10 : 50;
  const pctB = total > 0 ? Math.round((votesB / total) * 1000) / 10 : 50;
  const showSplit = reveal || total > 0;
  const barA = showSplit ? pctA : 50;
  const barB = showSplit ? pctB : 50;

  const submit = async (choice: 'a' | 'b') => {
    if (busy || myChoice) return;
    if (!isLoggedIn) {
      const aid = getOrCreateAnonId();
      if (!aid) return;
    }
    setBusy(true);
    try {
      const anonId = isLoggedIn ? undefined : getOrCreateAnonId();
      const r = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: poll.id, choice, anonId }),
      });
      const j = (await r.json()) as {
        votesA?: unknown;
        votesB?: unknown;
        myChoice?: unknown;
      };
      if (typeof j.votesA === 'number') setVotesA(j.votesA);
      if (typeof j.votesB === 'number') setVotesB(j.votesB);
      if (j.myChoice === 'a' || j.myChoice === 'b') {
        setMyChoice(j.myChoice);
      }
      setReveal(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="relative overflow-hidden rounded-xl border border-fuchsia-500/45 bg-gradient-to-br from-purple-950/95 via-slate-950/85 to-cyan-950/75 p-3 shadow-[0_0_48px_rgba(168,85,247,0.18)] backdrop-blur-md"
      aria-labelledby="tj-balance-poll-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-fuchsia-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-cyan-400/20 blur-3xl"
      />

      <div className="relative">
        <h2
          id="tj-balance-poll-heading"
          className="text-base font-black tracking-tight text-transparent [background:linear-gradient(100deg,#f0abfc,#22d3ee,#a78bfa)] bg-clip-text sm:text-lg"
        >
          {copy.balanceGameTitle}
        </h2>
        <p className="mt-0.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-fuchsia-200/90">
          {copy.balanceGameSub}
        </p>

        <p className="mt-2 text-center text-[0.95rem] font-extrabold leading-snug text-white sm:text-base">
          {poll.question}
        </p>

        <div className="mt-2 flex items-center justify-center gap-2 text-[0.65rem] font-bold text-slate-500">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-600" />
          <span className="text-fuchsia-300/90">{copy.balanceVs}</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-600" />
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy || Boolean(myChoice)}
            onClick={() => void submit('a')}
            className={`group relative min-h-[3.25rem] overflow-hidden rounded-xl border px-2 py-2 text-left text-sm font-extrabold transition ${
              myChoice === 'a'
                ? 'border-amber-400/70 bg-amber-950/50 text-amber-50 ring-2 ring-amber-400/40'
                : 'border-white/10 bg-black/30 text-slate-100 hover:border-fuchsia-400/50 hover:bg-fuchsia-950/40'
            } ${busy ? 'opacity-70' : 'active:scale-[0.98]'}`}
          >
            <span className="line-clamp-3">{poll.optionA}</span>
            {myChoice === 'a' ? (
              <span className="mt-1 block text-[0.65rem] font-bold text-amber-200">{copy.balanceYourPick}</span>
            ) : null}
          </button>
          <button
            type="button"
            disabled={busy || Boolean(myChoice)}
            onClick={() => void submit('b')}
            className={`group relative min-h-[3.25rem] overflow-hidden rounded-xl border px-2 py-2 text-left text-sm font-extrabold transition ${
              myChoice === 'b'
                ? 'border-cyan-400/70 bg-cyan-950/50 text-cyan-50 ring-2 ring-cyan-400/40'
                : 'border-white/10 bg-black/30 text-slate-100 hover:border-cyan-400/50 hover:bg-cyan-950/40'
            } ${busy ? 'opacity-70' : 'active:scale-[0.98]'}`}
          >
            <span className="line-clamp-3">{poll.optionB}</span>
            {myChoice === 'b' ? (
              <span className="mt-1 block text-[0.65rem] font-bold text-cyan-200">{copy.balanceYourPick}</span>
            ) : null}
          </button>
        </div>

        <div
          className={`mt-3 space-y-2 transition-opacity duration-500 ${showSplit ? 'opacity-100' : 'opacity-40'}`}
        >
          <div className="flex items-end justify-between gap-2 text-[0.7rem] font-bold text-slate-300">
            <span className="text-amber-200">{pctA}%</span>
            <span className="text-center text-slate-400">
              {copy.balanceTotalLabel.replace('{n}', total.toLocaleString(numLocale))}
            </span>
            <span className="text-cyan-200">{pctB}%</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-900/90 ring-1 ring-white/10">
            <div
              className="h-full min-w-0 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 shadow-[0_0_16px_rgba(251,191,36,0.45)] transition-[width] duration-700 ease-out"
              style={{ width: `${barA}%` }}
            />
            <div
              className="h-full min-w-0 bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-500 shadow-[0_0_16px_rgba(34,211,238,0.35)] transition-[width] duration-700 ease-out"
              style={{ width: `${barB}%` }}
            />
          </div>
        </div>

        {!myChoice ? (
          <p className="mt-2 text-center text-[0.65rem] font-semibold text-fuchsia-200/80">{copy.balanceTapHint}</p>
        ) : null}
      </div>
    </section>
  );
}
