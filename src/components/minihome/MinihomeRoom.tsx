'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Home, BookOpen, Camera, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Props = {
  ownerName: string;
  greeting?: string;
  todayCount?: number;
  totalCount?: number;
  isOwner?: boolean;
  bgStyle?: React.CSSProperties;
  guestbookSlot?: ReactNode;
  photoSlot?: ReactNode;
  ilchonSlot?: ReactNode;
  diarySlot?: ReactNode;
  labels: {
    room: string;
    guestbook: string;
    photos: string;
    ilchon: string;
    diary: string;
    todayVisit: string;
    totalVisit: string;
    editRoom: string;
    styleShop: string;
  };
};

export function MinihomeRoom({
  ownerName,
  greeting,
  todayCount = 0,
  totalCount = 0,
  isOwner,
  bgStyle,
  guestbookSlot,
  photoSlot,
  ilchonSlot,
  diarySlot,
  labels,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Profile header */}
      <div
        className="relative overflow-hidden rounded-t-2xl border-2 border-b-0 border-lilac bg-gradient-to-br from-cobalt-50 via-tj-surface to-lilac-soft p-6"
        style={bgStyle}
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-lilac shadow-retro-cobalt">
            <AvatarFallback className="bg-cobalt-50 text-xl font-extrabold text-brand-tai">
              {ownerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-extrabold text-tj-ink">{ownerName}</h1>
            {greeting && (
              <p className="mt-0.5 text-sm text-tj-muted italic">"{greeting}"</p>
            )}
            <div className="mt-1 flex gap-3 text-xs text-gray-400">
              <span>{labels.todayVisit}: <strong className="text-museum-coral">{todayCount}</strong></span>
              <span>{labels.totalVisit}: <strong>{totalCount}</strong></span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="gap-1 border-lilac/30 text-xs" asChild>
              <Link href="/minihome/shop">
                <Sparkles className="h-3 w-3" />
                {labels.styleShop}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-tj-muted">
              {labels.editRoom}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="rounded-b-2xl border-2 border-t-0 border-lilac bg-tj-surface shadow-retro">
        <Tabs defaultValue="room" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-lilac/20 bg-transparent px-2">
            <TabsTrigger value="room" className="gap-1 text-xs data-[state=active]:text-brand-tai">
              <Home className="h-3 w-3" /> {labels.room}
            </TabsTrigger>
            <TabsTrigger value="guestbook" className="gap-1 text-xs data-[state=active]:text-brand-tai">
              <BookOpen className="h-3 w-3" /> {labels.guestbook}
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-1 text-xs data-[state=active]:text-brand-tai">
              <Camera className="h-3 w-3" /> {labels.photos}
            </TabsTrigger>
            <TabsTrigger value="ilchon" className="gap-1 text-xs data-[state=active]:text-brand-tai">
              <Users className="h-3 w-3" /> {labels.ilchon}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="room" className="p-4">
            {diarySlot ?? (
              <div className="rounded-lg border border-dashed border-lilac/30 bg-cobalt-50/30 p-8 text-center">
                <p className="text-sm text-tj-muted">{labels.diary}</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="guestbook" className="p-4">
            {guestbookSlot}
          </TabsContent>
          <TabsContent value="photos" className="p-4">
            {photoSlot}
          </TabsContent>
          <TabsContent value="ilchon" className="p-4">
            {ilchonSlot}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
