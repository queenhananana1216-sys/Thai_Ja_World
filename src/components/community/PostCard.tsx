'use client';

import Link from 'next/link';
import { MessageCircle, Heart, Eye } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RetroBadge } from '@/components/ui/retro-badge';
import { isCommunityPublicViewCountsEnabled } from '@/lib/community/publicViewCounts';
import { cn } from '@/lib/utils';

type Props = {
  id: string;
  title: string;
  excerpt?: string;
  author: string;
  category?: string;
  categoryColor?: 'coral' | 'saffron' | 'cobalt' | 'teal';
  commentCount?: number;
  likeCount?: number;
  viewCount?: number;
  date: string;
  pinned?: boolean;
};

export function PostCard({
  id,
  title,
  excerpt,
  author,
  category,
  categoryColor = 'coral',
  commentCount = 0,
  likeCount = 0,
  viewCount = 0,
  date,
  pinned,
}: Props) {
  const showViews = isCommunityPublicViewCountsEnabled();
  return (
    <Link
      href={`/community/boards/${id}`}
      className="group block rounded-lg border border-gray-200 bg-tj-surface p-4 no-underline transition-all hover:border-museum-coral/30 hover:shadow-md hover:no-underline"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 shrink-0 border border-gray-200">
          <AvatarFallback className="bg-cobalt-50 text-xs font-bold text-museum-cobalt">
            {author.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {category && (
              <RetroBadge variant={categoryColor} size="xs">
                {category}
              </RetroBadge>
            )}
            {pinned && (
              <RetroBadge variant="saffron" size="xs" stamp>
                📌
              </RetroBadge>
            )}
          </div>
          <h3 className="text-sm font-bold text-tj-ink group-hover:text-museum-coral">
            {title}
          </h3>
          {excerpt && (
            <p className="mt-1 text-xs leading-relaxed text-tj-muted line-clamp-2">
              {excerpt}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[0.65rem] text-gray-400">
            <span className="font-medium text-tj-muted">{author}</span>
            <span>{date}</span>
            <div className="ml-auto flex items-center gap-2">
              {/* 조회수: DB `view_count` 는 유지. 공개는 NEXT_PUBLIC_COMMUNITY_PUBLIC_VIEW_COUNTS=true 일 때만 */}
              {showViews && viewCount > 0 && (
                <span className="flex items-center gap-0.5">
                  <Eye className="h-3 w-3" /> {viewCount}
                </span>
              )}
              {likeCount > 0 && (
                <span className="flex items-center gap-0.5 text-museum-coral">
                  <Heart className="h-3 w-3" /> {likeCount}
                </span>
              )}
              {commentCount > 0 && (
                <span className="flex items-center gap-0.5 text-museum-blue">
                  <MessageCircle className="h-3 w-3" /> {commentCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
