'use client';

import { useEffect } from 'react';

export default function PwaBootstrap() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext && window.location.hostname !== 'localhost') return;

    const run = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await reg.update();
      } catch {
        // Ignore registration errors in unsupported environments.
      }
    };

    void run();
  }, []);

  return null;
}
