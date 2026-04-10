'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Category = {
  key: string;
  label: string;
};

type Props = {
  title: string;
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  newPostHref: string;
  newPostLabel: string;
  children: ReactNode;
};

export function BoardLayout({
  title,
  categories,
  activeCategory,
  onCategoryChange,
  newPostHref,
  newPostLabel,
  children,
}: Props) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-tj-ink">{title}</h1>
        <Button asChild size="sm" className="gap-1.5 bg-museum-coral hover:bg-coral-600">
          <Link href={newPostHref}>
            <Plus className="h-4 w-4" />
            {newPostLabel}
          </Link>
        </Button>
      </div>

      <Tabs value={activeCategory} onValueChange={onCategoryChange} className="mb-4">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.key}
              value={cat.key}
              className="rounded-full border border-gray-200 bg-tj-surface px-3 py-1.5 text-xs font-medium data-[state=active]:border-museum-coral data-[state=active]:bg-coral-50 data-[state=active]:text-museum-coral"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2">{children}</div>
    </div>
  );
}
