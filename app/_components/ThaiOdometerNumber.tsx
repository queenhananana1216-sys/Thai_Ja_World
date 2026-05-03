'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  value: number;
  locale: string;
  className?: string;
  /** ms */
  durationMs?: number;
};

/** THAI 잔액이 변할 때 숫자가 부드럽게 따라가는 미니 오도미터(정수만). */
export default function ThaiOdometerNumber({
  value,
  locale,
  className,
  durationMs = 520,
}: Props) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const [display, setDisplay] = useState(safe);
  const displayRef = useRef(safe);
  displayRef.current = display;

  useEffect(() => {
    const from = displayRef.current;
    if (from === safe) return;

    let raf: number | null = null;
    const t0 = performance.now();
    const delta = safe - from;

    const tick = (now: number) => {
      const raw = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - (1 - raw) ** 2.4;
      const next = Math.round(from + delta * eased);
      setDisplay(next);
      if (raw < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(safe);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [safe, durationMs]);

  return <span className={className}>{display.toLocaleString(locale)}</span>;
}
