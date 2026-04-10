'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RetroBadge } from '@/components/ui/retro-badge';
import { Separator } from '@/components/ui/separator';

type Props = {
  title: string;
  body: ReactNode;
  author: string;
  date: string;
  category?: string;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  backHref?: string;
  backLabel?: string;
  onLike?: () => void;
  onShare?: () => void;
  menuSlot?: ReactNode;
  commentsSlot?: ReactNode;
};

export function PostDetail({
  title,
  body,
  author,
  date,
  category,
  likeCount,
  commentCount,
  isLiked,
  backHref = '/community/boards',
  backLabel = '목록',
  onLike,
  onShare,
  menuSlot,
  commentsSlot,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1 text-sm text-tj-muted no-underline hover:text-tj-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <article className="rounded-xl border-2 border-tj-line bg-tj-surface p-6 shadow-retro">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-gray-200">
              <AvatarFallback className="bg-cobalt-50 font-bold text-museum-cobalt">
                {author.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-bold text-tj-ink">{author}</p>
              <p className="text-xs text-gray-400">{date}</p>
            </div>
          </div>
          {menuSlot}
        </div>

        {category && (
          <RetroBadge variant="coral" size="sm" className="mb-3">
            {category}
          </RetroBadge>
        )}

        <h1 className="mb-4 text-lg font-extrabold tracking-tight text-tj-ink sm:text-xl">
          {title}
        </h1>

        {/* Body */}
        <div className="prose prose-sm max-w-none text-tj-ink">{body}</div>

        <Separator className="my-5" />

        {/* Reactions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className={isLiked ? 'text-museum-coral' : 'text-tj-muted'}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-museum-coral' : ''}`} />
            <span className="text-xs">{likeCount}</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-tj-muted">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{commentCount}</span>
          </Button>
          {onShare && (
            <Button variant="ghost" size="sm" className="ml-auto text-tj-muted" onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </article>

      {/* Comments */}
      {commentsSlot && <div className="mt-4">{commentsSlot}</div>}
    </div>
  );
}
