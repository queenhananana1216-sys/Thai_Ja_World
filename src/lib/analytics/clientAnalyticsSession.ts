'use client';

const SID_KEY = 'tj_analytics_sid';
const IMP_PREFIX = 'tj_bimp_';

export function getTjAnalyticsSessionId(): string {
  try {
    let id = sessionStorage.getItem(SID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
}

export function shouldSendBannerImpressionOnce(bannerId: string): boolean {
  try {
    const k = `${IMP_PREFIX}${bannerId}`;
    if (sessionStorage.getItem(k) === '1') return false;
    sessionStorage.setItem(k, '1');
    return true;
  } catch {
    return false;
  }
}
