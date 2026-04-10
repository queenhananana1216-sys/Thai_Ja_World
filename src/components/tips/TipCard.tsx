'use client';

import Link from 'next/link';
import { Lightbulb, ExternalLink } from 'lucide-react';
import { MuseumCard, MuseumCardHeader, MuseumCardTitle, MuseumCardContent } from '@/components/ui/museum-card';
import { RetroBadge } from '@/components/ui/retro-badge';

type Props = {
  id: string;
  title: string;
  excerpt?: string;
  category?: string;
  date?: string;
  isExternal?: boolean;
  externalUrl?: string;
};

export function TipCard({ id, title, excerpt, category, date, isExternal, externalUrl }: Props) {
  const content = (
    <MuseumCard shadow="saffron" hover="lift" size="md" className="h-full">
      <MuseumCardHeader>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-saffron-50">
            <Lightbulb className="h-4 w-4 text-museum-saffron" />
          </span>
          {category && (
            <RetroBadge variant="saffron" size="xs">{category}</RetroBadge>
          )}
          {isExternal && (
            <ExternalLink className="ml-auto h-3 w-3 text-gray-400" />
          )}
        </div>
        <MuseumCardTitle className="mt-2 line-clamp-2">{title}</MuseumCardTitle>
      </MuseumCardHeader>
      <MuseumCardContent>
        {excerpt && <p className="line-clamp-3 text-xs leading-relaxed">{excerpt}</p>}
        {date && <p className="mt-2 text-[0.65rem] text-gray-400">{date}</p>}
      </MuseumCardContent>
    </MuseumCard>
  );

  if (isExternal && externalUrl) {
    return (
      <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="no-underline hover:no-underline">
        {content}
      </a>
    );
  }

  return (
    <Link href={`/tips/${id}`} className="no-underline hover:no-underline">
      {content}
    </Link>
  );
}
