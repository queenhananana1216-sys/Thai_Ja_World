import type { Metadata } from 'next';
import ChatPageClient from './_components/ChatPageClient';

export const metadata: Metadata = {
  title: '채팅',
  description: '태자월드 채팅방',
};

export default function ChatPage() {
  return <ChatPageClient />;
}
