'use client';

import { UserPlus, UserCheck, UserX } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MuseumCard } from '@/components/ui/museum-card';

type Props = {
  name: string;
  relation?: string;
  since?: string;
  status: 'friend' | 'pending-in' | 'pending-out';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  labels: {
    accept: string;
    reject: string;
    cancel: string;
    pending: string;
    friends: string;
  };
};

export function IlchonCard({
  name,
  relation,
  since,
  status,
  onAccept,
  onReject,
  onCancel,
  labels,
}: Props) {
  return (
    <MuseumCard shadow="default" hover="lift" size="sm" className="flex items-center gap-3">
      <Avatar className="h-10 w-10 shrink-0 border border-lilac/30">
        <AvatarFallback className="bg-lilac-soft text-sm font-bold text-brand-tai">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-tj-ink">{name}</p>
        {relation && <p className="text-xs text-brand-tai">"{relation}"</p>}
        {since && <p className="text-[0.65rem] text-gray-400">{since}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {status === 'friend' && (
          <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-museum-teal">
            <UserCheck className="h-3 w-3" />
            {labels.friends}
          </span>
        )}
        {status === 'pending-in' && (
          <>
            <Button size="xs" onClick={onAccept} className="bg-museum-teal hover:bg-teal-600">
              <UserPlus className="h-3 w-3" />
              {labels.accept}
            </Button>
            <Button size="xs" variant="ghost" onClick={onReject} className="text-gray-400">
              <UserX className="h-3 w-3" />
            </Button>
          </>
        )}
        {status === 'pending-out' && (
          <Button size="xs" variant="outline" onClick={onCancel} className="text-gray-400">
            {labels.cancel}
          </Button>
        )}
      </div>
    </MuseumCard>
  );
}
