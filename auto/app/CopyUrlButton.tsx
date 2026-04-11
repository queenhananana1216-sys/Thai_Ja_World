'use client';

import { useCallback, useState } from 'react';

type Props = {
  url: string;
  className?: string;
};

export function CopyUrlButton({ url, className }: Props) {
  const [done, setDone] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch {
      /* ignore */
    }
  }, [url]);

  return (
    <button type="button" className={className} onClick={onCopy}>
      {done ? '복사됨' : '복사'}
    </button>
  );
}
