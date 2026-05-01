import type { Metadata } from 'next';
import NotificationsPageClient from './_components/NotificationsPageClient';

export const metadata: Metadata = {
  title: '알림함',
  description: '「태국에, 살자」 인앱 알림함',
};

export default function NotificationsPage() {
  return <NotificationsPageClient />;
}
