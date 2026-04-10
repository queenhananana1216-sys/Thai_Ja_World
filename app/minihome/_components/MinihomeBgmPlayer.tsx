'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  url: string;
  title?: string;
};

export default function MinihomeBgmPlayer({ url, title }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [needsClick, setNeedsClick] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = 0.35;
    const attempt = el.play();
    if (attempt) {
      attempt
        .then(() => setPlaying(true))
        .catch(() => setNeedsClick(true));
    }
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      setNeedsClick(false);
    } else {
      void el.play().then(() => {
        setPlaying(true);
        setNeedsClick(false);
      }).catch(() => {});
    }
  }

  return (
    <div className={`minihome-bgm${needsClick && !playing ? ' minihome-bgm--pulse' : ''}`}>
      <audio ref={audioRef} src={url} loop preload="auto" />
      <button
        type="button"
        className="minihome-bgm__btn"
        onClick={toggle}
        aria-label={playing ? 'Pause BGM' : 'Play BGM'}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <span className="minihome-bgm__title">{title || 'BGM'}</span>
      {needsClick && !playing ? (
        <button type="button" className="minihome-bgm__click-hint" onClick={toggle}>
          Click to play
        </button>
      ) : null}
    </div>
  );
}
