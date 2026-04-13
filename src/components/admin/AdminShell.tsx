'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Brain,
  Store,
  Image,
  Bot,
  Newspaper,
  Megaphone,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const NAV_ITEMS = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/publish', icon: Megaphone, label: 'Publish' },
  { href: '/admin/news', icon: Newspaper, label: 'News' },
  { href: '/admin/knowledge', icon: Brain, label: 'Knowledge' },
  { href: '/admin/community-posts', icon: FileText, label: 'Posts' },
  { href: '/admin/local-spots', icon: Store, label: 'Local Spots' },
  { href: '/admin/home-hero', icon: Image, label: 'Hero' },
  { href: '/admin/premium-banners', icon: Image, label: 'Banners' },
  { href: '/admin/bot-actions', icon: Bot, label: 'Bot Actions' },
  { href: '/admin/ux-bot', icon: Activity, label: 'UX Bot' },
];

type Props = {
  children: ReactNode;
};

export function AdminShell({ children }: Props) {
  const pathname = usePathname() ?? '/admin';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="p-4">
          <h2 className="text-sm font-extrabold tracking-tight text-tj-ink">
            <span className="text-brand-tai">태</span>자 Admin
          </h2>
        </div>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <nav className="space-y-0.5 px-2">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors',
                    active
                      ? 'bg-museum-coral/10 text-museum-coral'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-tj-ink'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Mobile top nav */}
      <div className="lg:hidden">
        <ScrollArea className="w-full border-b border-gray-200 bg-white">
          <nav className="flex gap-1 px-2 py-2">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium no-underline',
                    active
                      ? 'bg-museum-coral/10 text-museum-coral'
                      : 'text-gray-500 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-gray-50/50 p-4 lg:p-6">
        {children}
      </main>
    </div>
  );
}
