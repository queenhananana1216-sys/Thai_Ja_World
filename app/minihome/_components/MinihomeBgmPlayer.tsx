'use client';

import { useCallback, useRef, useState } from 'react';

type Props = {
  url: string;
  title?: string;
};

export default function MinihomeBgmPlayer({ url, title }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  return (
    <div className="minihome-bgm">
      <audio ref={audioRef} src={url} loop preload="none" />
      <button type="button" className="minihome-bgm__btn" onClick={toggle} aria-label={playing ? 'Pause BGM' : 'Play BGM'}>
        {playing ? '⏸' : '▶️'}
      </button>
      <span className="minihome-bgm__title">{title || 'BGM'}</span>
    </div>
  );
}
