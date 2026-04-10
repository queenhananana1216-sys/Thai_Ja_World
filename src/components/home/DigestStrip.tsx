'use client';

import { MuseumCard, MuseumCardContent } from '@/components/ui/museum-card';
import { Skeleton } from '@/components/ui/skeleton';

type WeatherRow = {
  key: string;
  label: string;
  temp: number | null;
  condition: string;
};

type Props = {
  weatherRows: WeatherRow[];
  weatherBusy: boolean;
  weatherErr: boolean;
  labels: {
    weatherTitle: string;
    weatherLoading: string;
    weatherUnavailable: string;
    weatherAttribution: string;
    fxTitle: string;
    fxHint: string;
    tipTitle: string;
  };
  tipLinks?: { href: string; label: string }[];
};

export function DigestStrip({
  weatherRows,
  weatherBusy,
  weatherErr,
  labels,
  tipLinks,
}: Props) {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Weather */}
        <MuseumCard shadow="default" hover="none" size="sm">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-museum-teal">
            {labels.weatherTitle}
          </h3>
          <MuseumCardContent>
            {weatherBusy ? (
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ) : weatherErr || weatherRows.length === 0 ? (
              <p className="text-xs text-tj-muted">{labels.weatherUnavailable}</p>
            ) : (
              <div className="space-y-1.5">
                {weatherRows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-tj-ink">{row.label}</span>
                    <span className="tabular-nums text-tj-muted">
                      {row.temp !== null ? `${row.temp}°C` : '—'}
                      <span className="ml-1 text-[0.65rem] text-gray-400">
                        {row.condition}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[0.6rem] text-gray-400">{labels.weatherAttribution}</p>
          </MuseumCardContent>
        </MuseumCard>

        {/* FX */}
        <MuseumCard shadow="default" hover="none" size="sm">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-museum-blue">
            {labels.fxTitle}
          </h3>
          <MuseumCardContent>
            <p className="text-xs leading-relaxed text-tj-muted">{labels.fxHint}</p>
          </MuseumCardContent>
        </MuseumCard>

        {/* Tip */}
        <MuseumCard shadow="default" hover="none" size="sm">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-museum-cobalt">
            {labels.tipTitle}
          </h3>
          <MuseumCardContent>
            {tipLinks && tipLinks.length > 0 ? (
              <ul className="space-y-1">
                {tipLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-tj-link no-underline hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </MuseumCardContent>
        </MuseumCard>
      </div>
    </section>
  );
}
