import type { Metadata } from 'next';
import NotificationsPageClient from './_components/NotificationsPageClient';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';

export async function generateMetadata(): Promise<Metadata> {
  const ui = await loadSiteUiSettings();
  return {
    title: '알림함',
    description: `「${ui.siteDisplayName}」 인앱 알림함`,
  };
}

export default function NotificationsPage() {
  return <NotificationsPageClient />;
}
