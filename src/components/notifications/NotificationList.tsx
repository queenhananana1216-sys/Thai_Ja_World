'use client';

import { Bell, MessageCircle, Heart, UserPlus, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type Notification = {
  id: string;
  type: 'comment' | 'like' | 'friend' | 'news' | 'system';
  title: string;
  body?: string;
  time: string;
  read: boolean;
  actor?: string;
};

const iconMap = {
  comment: MessageCircle,
  like: Heart,
  friend: UserPlus,
  news: Newspaper,
  system: Bell,
};

const colorMap = {
  comment: 'text-museum-blue bg-cobalt-50',
  like: 'text-museum-coral bg-coral-50',
  friend: 'text-brand-tai bg-cobalt-50',
  news: 'text-museum-saffron bg-saffron-50',
  system: 'text-tj-muted bg-gray-100',
};

type Props = {
  notifications: Notification[];
  emptyText: string;
};

export function NotificationList({ notifications, emptyText }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm text-tj-muted">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <div className="space-y-1">
        {notifications.map((notif) => {
          const Icon = iconMap[notif.type];
          return (
            <div
              key={notif.id}
              className={cn(
                'flex items-start gap-3 rounded-lg p-3 transition-colors',
                notif.read ? 'bg-transparent' : 'bg-saffron-50/50'
              )}
            >
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', colorMap[notif.type])}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', notif.read ? 'text-tj-muted' : 'font-medium text-tj-ink')}>
                  {notif.title}
                </p>
                {notif.body && (
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{notif.body}</p>
                )}
                <p className="mt-1 text-[0.65rem] text-gray-400">{notif.time}</p>
              </div>
              {!notif.read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-museum-coral" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
