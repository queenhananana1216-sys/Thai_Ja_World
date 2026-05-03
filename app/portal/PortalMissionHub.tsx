import GuestGateLink from '@app/_components/GuestGateLink';
import type { CollaborativeMissionRow } from '../_components/home/home-queries';
import type { PersonalMissionBrief } from '@/lib/missions/ensurePersonalMissionToday';
import type { Locale } from '@/i18n/types';
import type { Portal2026Copy } from '@/i18n/portal2026Copy';
import styles from './portal-2026.module.css';

type Props = {
  locale: Locale;
  copy: Portal2026Copy;
  personal: PersonalMissionBrief | null;
  collaborative: CollaborativeMissionRow[];
  isLoggedIn: boolean;
};

function scopeLabel(locale: Locale, scope: string): string {
  if (locale === 'th') {
    if (scope === 'daily') return 'รายวัน';
    if (scope === 'weekly') return 'รายสัปดาห์';
    if (scope === 'monthly') return 'รายเดือน';
    return scope;
  }
  if (scope === 'daily') return '일일';
  if (scope === 'weekly') return '주간';
  if (scope === 'monthly') return '월간';
  return scope;
}

export default function PortalMissionHub({ locale, copy, personal, collaborative, isLoggedIn }: Props) {
  const numLocale = locale === 'th' ? 'th-TH' : 'ko-KR';

  return (
    <section className={`${styles.glassCenter} overflow-hidden p-2 text-sm text-gray-100 md:p-2.5 md:text-base`}>
      <div className="grid gap-2 md:grid-cols-2 md:gap-3">
        <div className="min-w-0 rounded-lg border border-violet-500/25 bg-slate-950/40 p-2 md:p-2.5">
          <p className="m-0 text-xs font-black uppercase tracking-wide text-violet-200 md:text-sm">
            {copy.missionHubPersonalTitle}
          </p>
          {!isLoggedIn ? (
            <p className="mt-1.5 m-0 text-xs leading-snug text-gray-300 md:text-sm">{copy.missionHubPersonalLoginHint}</p>
          ) : personal ? (
            <>
              <p className="mt-1.5 m-0 text-base font-bold text-white md:text-lg">{personal.title}</p>
              <p className="mt-1 m-0 text-xs leading-relaxed text-gray-200 md:text-sm">{personal.body}</p>
              <GuestGateLink
                href={personal.cta_href || '/boards'}
                isLoggedIn={isLoggedIn}
                className="mt-2 inline-flex min-h-10 max-w-full items-center justify-center rounded-lg bg-violet-600 px-3 py-1.5 text-center text-sm font-bold text-white no-underline hover:bg-violet-500"
              >
                {copy.missionHubPersonalCta}
              </GuestGateLink>
            </>
          ) : (
            <p className="mt-1.5 m-0 text-xs text-gray-400 md:text-sm">{copy.missionHubPersonalEmpty}</p>
          )}
        </div>

        <div className="min-w-0 rounded-lg border border-amber-500/25 bg-slate-950/40 p-2 md:p-2.5">
          <p className="m-0 text-xs font-black uppercase tracking-wide text-amber-200 md:text-sm">
            {copy.missionHubCollabTitle}
          </p>
          {collaborative.length === 0 ? (
            <p className="mt-1.5 m-0 text-xs text-gray-400 md:text-sm">{copy.missionHubCollabEmpty}</p>
          ) : (
            <ul className="mt-1.5 space-y-2">
              {collaborative.map((m) => {
                const pct =
                  m.goalTarget > 0 ? Math.min(100, Math.round((m.goalCurrent / m.goalTarget) * 100)) : 0;
                return (
                  <li key={m.id} className="rounded-md border border-white/5 bg-black/20 p-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase text-amber-100/90">
                        {scopeLabel(locale, m.scope)}
                      </span>
                      {m.rewardThai > 0 ? (
                        <span className="text-[10px] text-amber-200/90">
                          +{m.rewardThai.toLocaleString(numLocale)} {copy.thaiSuffix}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 m-0 text-sm font-semibold text-white md:text-base">{m.title}</p>
                    <p className="mt-0.5 m-0 text-xs leading-snug text-gray-300 md:text-sm">{m.body}</p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 m-0 text-[10px] tabular-nums text-gray-400">
                      {m.goalCurrent.toLocaleString(numLocale)} / {m.goalTarget.toLocaleString(numLocale)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 m-0 text-[10px] leading-snug text-gray-500 md:text-xs">{copy.missionHubCollabFootnote}</p>
        </div>
      </div>
    </section>
  );
}
