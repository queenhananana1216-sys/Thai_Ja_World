'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type YTPlayer = {
  destroy: () => void;
  mute?: () => void;
  unMute?: () => void;
  playVideo?: () => void;
  pauseVideo?: () => void;
  isMuted?: () => boolean;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: number | string;
      height?: number | string;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: (e: { target: YTPlayer }) => void };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYoutubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  const existing = document.querySelector('script[data-yt-iframe-api="1"]') as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
    });
  }

  return new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.dataset.ytIframeApi = '1';
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    tag.onerror = () => reject(new Error('yt_iframe_api_load_failed'));
    document.head.appendChild(tag);
  });
}

type Props = {
  videoId: string;
};

/** 레트로풍 미니 뮤직 독 — 자동재생(음소거) 후 탭으로 소리 켜기 */
export default function LocalYoutubeBgmPlayer({ videoId }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const teardown = useCallback(() => {
    try {
      playerRef.current?.destroy?.();
    } catch {
      /* ignore */
    }
    playerRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host || !videoId) return undefined;

    void (async () => {
      try {
        await loadYoutubeIframeApi();
        if (cancelled || !hostRef.current) return;

        teardown();

        const origin =
          typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined;
        playerRef.current = new window.YT!.Player(host, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            loop: 1,
            playlist: videoId,
            ...(origin ? { origin } : {}),
          },
          events: {
            onReady: (e) => {
              try {
                e.target.mute?.();
                e.target.playVideo?.();
                setMuted(true);
                setPlaying(true);
              } catch {
                setPlaying(false);
              }
            },
          },
        });
      } catch {
        if (!cancelled) setApiError('api');
      }
    })();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [videoId, teardown]);

  function toggleSound() {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (muted) {
        p.unMute?.();
        p.playVideo?.();
        setMuted(false);
        setPlaying(true);
      } else {
        p.mute?.();
        setMuted(true);
      }
    } catch {
      /* ignore */
    }
  }

  function togglePause() {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (playing) {
        p.pauseVideo?.();
        setPlaying(false);
      } else {
        p.playVideo?.();
        setPlaying(true);
      }
    } catch {
      /* ignore */
    }
  }

  if (apiError) {
    const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&playsinline=1&controls=0&loop=1&playlist=${encodeURIComponent(videoId)}`;
    return (
      <div className="fixed bottom-24 left-4 z-[35] pointer-events-none">
        <iframe
          title="매장 BGM"
          src={src}
          className="h-[52px] w-[92px] rounded-lg opacity-40 shadow-lg ring-1 ring-white/20"
          allow="autoplay; encrypted-media; fullscreen"
        />
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-4 z-[35] flex flex-col gap-1">
      <div
        className="relative h-[52px] w-[92px] overflow-hidden rounded-lg opacity-[0.42] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] ring-1 ring-amber-900/40"
        style={{
          background: 'linear-gradient(145deg,#1a1510 0%,#2d241c 48%,#120f0c 100%)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
        }}
      >
        <div ref={hostRef} className="absolute inset-0 [&_iframe]:scale-[0.82] [&_iframe]:origin-top-left" />
      </div>
      <RetroDock muted={muted} playing={playing} onToggleSound={toggleSound} onTogglePause={togglePause} />
    </div>
  );
}

function RetroDock({
  muted,
  playing,
  onToggleSound,
  onTogglePause,
}: {
  muted: boolean;
  playing: boolean;
  onToggleSound: () => void;
  onTogglePause: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-amber-600/35 bg-[#2a221c]/95 px-2 py-1 text-[10px] font-bold tracking-wide text-amber-100 shadow-md backdrop-blur-sm"
      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
    >
      <span className="select-none text-[11px]" aria-hidden>
        📼
      </span>
      <button
        type="button"
        onClick={onTogglePause}
        className="rounded-full bg-amber-900/50 px-1.5 py-0.5 text-[9px] text-amber-50 hover:bg-amber-800/60"
        aria-label={playing ? 'BGM 일시정지' : 'BGM 재생'}
      >
        {playing ? '‖' : '▶'}
      </button>
      <button
        type="button"
        onClick={onToggleSound}
        className="rounded-full bg-violet-900/45 px-1.5 py-0.5 text-[9px] text-violet-100 hover:bg-violet-800/55"
        aria-label={muted ? 'BGM 소리 켜기' : 'BGM 음소거'}
      >
        {muted ? '🔈' : '🔊'}
      </button>
      <span className="sr-only">YouTube BGM</span>
    </div>
  );
}
