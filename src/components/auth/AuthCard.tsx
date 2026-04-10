'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, children }: Props) {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border-2 border-tj-line bg-tj-surface shadow-retro">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border-2 border-museum-saffron bg-saffron-50 text-lg font-bold text-museum-saffron">
            ✦
          </div>
          <CardTitle className="text-xl font-extrabold tracking-tight text-tj-ink">
            {title}
          </CardTitle>
          {subtitle && (
            <CardDescription className="text-sm text-tj-muted">
              {subtitle}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
