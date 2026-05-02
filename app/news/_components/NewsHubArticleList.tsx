'use client';

import GuestGateLink from '@app/_components/GuestGateLink';
import portalStyles from '@app/portal/portal-2026.module.css';
import { extractHostname, formatDate } from '@/lib/utils/formatDate';

export type NewsHubRow = {
  id: string;
  title: string;
  summary_text: string;
  external_url: string;
  published_at: string | null;
};

type Props = {
  rows: NewsHubRow[];
  isLoggedIn: boolean;
  openDetailLabel: string;
};

export default function NewsHubArticleList({ rows, isLoggedIn, openDetailLabel }: Props) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((r) => {
        const host = r.external_url !== '#' ? extractHostname(r.external_url) : '';
        const date = formatDate(r.published_at);
        const detailHref = `/news/${r.id}`;
        return (
          <li key={r.id} className={`${portalStyles.glassCenter} overflow-hidden px-4 py-4`}>
            <h2 className="mb-2 text-lg font-bold leading-snug">
              <GuestGateLink href={detailHref} isLoggedIn={isLoggedIn} className="text-white hover:text-amber-200">
                {r.title}
              </GuestGateLink>
            </h2>
            {r.summary_text?.trim() ? (
              <p className="mb-3 text-[0.95rem] leading-relaxed text-slate-200">{r.summary_text.trim()}</p>
            ) : null}
            <div className="mb-3 flex flex-wrap gap-x-2 text-xs text-slate-400">
              {host ? <span>🔗 {host}</span> : null}
              {date ? (
                <span>
                  {host ? ' · ' : ''}
                  🕐 {date}
                </span>
              ) : null}
            </div>
            <GuestGateLink
              href={detailHref}
              isLoggedIn={isLoggedIn}
              className="inline-flex min-h-10 items-center text-sm font-semibold text-amber-200 hover:text-amber-100 hover:underline"
            >
              {openDetailLabel}
            </GuestGateLink>
          </li>
        );
      })}
    </ul>
  );
}
