'use client';

import Link from 'next/link';
import { MuseumCard, MuseumCardContent } from '@/components/ui/museum-card';
import { RetroBadge } from '@/components/ui/retro-badge';

type Props = {
  id: string;
  title: string;
  price?: string;
  location?: string;
  imageUrl?: string;
  status?: 'available' | 'reserved' | 'sold';
  author: string;
  date: string;
};

const statusConfig = {
  available: { label: '판매중', variant: 'teal' as const },
  reserved: { label: '예약', variant: 'saffron' as const },
  sold: { label: '완료', variant: 'ink' as const },
};

export function TradeCard({
  id,
  title,
  price,
  location,
  imageUrl,
  status = 'available',
  author,
  date,
}: Props) {
  const s = statusConfig[status];

  return (
    <Link href={`/community/boards/${id}`} className="no-underline hover:no-underline">
      <MuseumCard shadow="saffron" hover="lift" size="sm" className="h-full">
        {imageUrl && (
          <div className="mb-2 aspect-square w-full overflow-hidden rounded-md bg-gray-100">
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <MuseumCardContent>
          <div className="mb-1.5 flex items-center gap-1.5">
            <RetroBadge variant={s.variant} size="xs">
              {s.label}
            </RetroBadge>
          </div>
          <h3 className="text-sm font-bold text-tj-ink line-clamp-2">{title}</h3>
          {price && (
            <p className="mt-1 text-sm font-extrabold text-museum-coral">{price}</p>
          )}
          <div className="mt-2 flex items-center justify-between text-[0.65rem] text-gray-400">
            <span>{location || author}</span>
            <span>{date}</span>
          </div>
        </MuseumCardContent>
      </MuseumCard>
    </Link>
  );
}
