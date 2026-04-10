'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, MapPin, Clock, Phone, Globe } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RetroBadge } from '@/components/ui/retro-badge';
import { Separator } from '@/components/ui/separator';

type Props = {
  name: string;
  category: string;
  region: string;
  description?: string;
  imageUrl?: string | null;
  emoji?: string;
  tier: string;
  phone?: string;
  website?: string;
  hours?: string;
  address?: string;
  backLabel?: string;
  labels: {
    info: string;
    menu: string;
    photos: string;
    guestbook: string;
    events: string;
  };
  tierLabels: { premium: string; standard: string };
  menuSlot?: ReactNode;
  photosSlot?: ReactNode;
  guestbookSlot?: ReactNode;
  eventsSlot?: ReactNode;
};

export function ShopDetailView({
  name,
  category,
  region,
  description,
  imageUrl,
  emoji,
  tier,
  phone,
  website,
  hours,
  address,
  backLabel = '로컬',
  labels,
  tierLabels,
  menuSlot,
  photosSlot,
  guestbookSlot,
  eventsSlot,
}: Props) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link
        href="/local"
        className="mb-4 inline-flex items-center gap-1 text-sm text-tj-muted no-underline hover:text-tj-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-xl border-2 border-tj-line shadow-retro">
        <div className="aspect-[3/1] bg-gradient-to-br from-saffron-50 to-coral-50">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">
              {emoji || '🏪'}
            </div>
          )}
        </div>

        <div className="bg-tj-surface p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-tj-ink">{name}</h1>
                {tier !== 'basic' && (
                  <RetroBadge variant={tier === 'premium' ? 'saffron' : 'coral'} size="sm">
                    {tier === 'premium' ? tierLabels.premium : tierLabels.standard}
                  </RetroBadge>
                )}
              </div>
              <p className="flex items-center gap-1 text-sm text-tj-muted">
                <MapPin className="h-3.5 w-3.5" />
                {category} · {region}
              </p>
            </div>
          </div>

          {description && (
            <p className="mt-3 text-sm leading-relaxed text-tj-muted">{description}</p>
          )}

          <Separator className="my-4" />

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {address && (
              <div className="flex items-center gap-2 text-tj-muted">
                <MapPin className="h-4 w-4 shrink-0 text-museum-coral" />
                {address}
              </div>
            )}
            {hours && (
              <div className="flex items-center gap-2 text-tj-muted">
                <Clock className="h-4 w-4 shrink-0 text-museum-saffron" />
                {hours}
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-2 text-tj-muted">
                <Phone className="h-4 w-4 shrink-0 text-museum-teal" />
                {phone}
              </div>
            )}
            {website && (
              <div className="flex items-center gap-2 text-tj-muted">
                <Globe className="h-4 w-4 shrink-0 text-museum-blue" />
                <a href={website} target="_blank" rel="noopener noreferrer" className="text-tj-link no-underline hover:underline">
                  {website}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="menu" className="mt-6">
        <TabsList className="w-full justify-start bg-transparent">
          <TabsTrigger value="menu" className="text-xs">{labels.menu}</TabsTrigger>
          <TabsTrigger value="photos" className="text-xs">{labels.photos}</TabsTrigger>
          <TabsTrigger value="guestbook" className="text-xs">{labels.guestbook}</TabsTrigger>
          <TabsTrigger value="events" className="text-xs">{labels.events}</TabsTrigger>
        </TabsList>
        <TabsContent value="menu" className="mt-4">{menuSlot}</TabsContent>
        <TabsContent value="photos" className="mt-4">{photosSlot}</TabsContent>
        <TabsContent value="guestbook" className="mt-4">{guestbookSlot}</TabsContent>
        <TabsContent value="events" className="mt-4">{eventsSlot}</TabsContent>
      </Tabs>
    </div>
  );
}
