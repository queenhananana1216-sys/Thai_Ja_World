import { redirect } from 'next/navigation';

/** 예전 허브 경로 — 공개 링크 웹은 auto 앱(기본 http://127.0.0.1:3010). `NEXT_PUBLIC_AUTO_PUBLIC_URL` 로 덮어씀 */
function getAutoPublicUrl(): string {
  const u = process.env.NEXT_PUBLIC_AUTO_PUBLIC_URL?.trim();
  if (u) return u.replace(/\/$/, '');
  return 'http://127.0.0.1:3010';
}

export default function HubRedirectPage() {
  redirect(getAutoPublicUrl());
}
