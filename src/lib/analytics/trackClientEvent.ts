'use client';

export function trackClientEvent(
  eventName: string,
  payload?: Record<string, string | number | boolean | null>,
) {
  if (typeof window === 'undefined') return;
  const maybeVa = (window as { va?: { track?: (name: string, attrs?: Record<string, unknown>) => void } }).va;
  if (maybeVa?.track) {
    maybeVa.track(eventName, payload ?? {});
  }
}
