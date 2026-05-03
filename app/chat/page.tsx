import type { Metadata } from 'next';
import ChatPageClient from './_components/ChatPageClient';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';

export async function generateMetadata(): Promise<Metadata> {
  const ui = await loadSiteUiSettings();
  return {
    title: '채팅',
    description: `「${ui.siteDisplayName}」 채팅방`,
  };
}

export default function ChatPage() {
  return <ChatPageClient />;
}
