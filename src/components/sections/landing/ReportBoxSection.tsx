import Link from 'next/link';
import type { Locale } from '@/i18n/types';
import { formatDate } from '@/lib/utils/formatDate';
import type { ReportBoxPreview } from '@/lib/landing/fetchReportBoxPreview';

type Props = {
  preview: ReportBoxPreview;
  locale: Locale;
};

const copy = {
  ko: {
    kicker: '제보함',
    title: '사람 찾기 · 연락 안 됨(행불) 제보',
    lead:
      '필고식으로 나누던 «사람 찾기»와 «행불」을 태자월드 한곳(제보함)으로 모았습니다. 민감한 개인정보는 최소로, 경찰·119 등 긴급 상황은 먼저 현지에 연락하세요.',
    colFind: '사람 찾기',
    colMissing: '연락 안 됨(행불)',
    empty: '아직 글이 없습니다. 첫 제보를 남겨 주세요.',
    writeFind: '사람 찾기 글쓰기',
    writeMissing: '행불 글쓰기',
    moreFind: '사람 찾기 더보기',
    moreMissing: '행불 더보기',
    countReplies: (n: number) => (n > 0 ? `댓글 ${n}` : '댓글 0'),
  },
  th: {
    kicker: 'รายงาน',
    title: 'ตามหาคน · ติดต่อไม่ได้',
    lead: 'รวมโพสต์ «ตามหาคน» และ «ติดต่อไม่ได้» ไว้ที่นี่. กรุณาโพสต์ข้อมูลเท่าที่จำเป็น และติดต่อเจ้าหน้าที่เมื่อฉุกเฉิน',
    colFind: 'ตามหาคน',
    colMissing: 'ติดต่อไม่ได้',
    empty: 'ยังไม่มีโพสต์',
    writeFind: 'โพสต์ตามหา',
    writeMissing: 'โพสต์ติดต่อไม่ได้',
    moreFind: 'เพิ่มเติม · ตามหา',
    moreMissing: 'เพิ่มเติม · ติดต่อไม่ได้',
    countReplies: (n: number) => (n > 0 ? `ตอบกลับ ${n}` : 'ตอบกลับ 0'),
  },
} as const;

function lines(preview: ReportBoxPreview, kind: 'find' | 'missing', locale: Locale) {
  return kind === 'find' ? preview.find : preview.missing;
}

export function ReportBoxSection({ preview, locale }: Props) {
  const t = copy[locale === 'th' ? 'th' : 'ko'];
  const degraded = preview.degraded;
  const findRows = lines(preview, 'find', locale);
  const missingRows = lines(preview, 'missing', locale);

  return (
    <section
      className="border-y border-white/[0.08] bg-gradient-to-b from-[#0a0c1f] to-[#12142e] py-12 text-slate-200"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 inline-flex max-w-full items-center rounded-full border border-violet-400/40 bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-violet-200">
              {t.kicker}
            </p>
            <h2 className="break-words text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {t.title}
            </h2>
            <p className="mt-2 max-w-3xl break-words text-sm leading-relaxed text-slate-300">{t.lead}</p>
            {degraded ? (
              <p className="mt-1 text-xs text-amber-200/90">
                {locale === 'th'
                  ? 'โหลดข้อมูลล่าสุดไม่สำเร็จ — แสดงโครงร่างก่อน'
                  : '최신 목록을 불러오지 못해 빈 섹션으로 보일 수 있어요.'}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg backdrop-blur-sm sm:p-5">
            <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <h3 className="text-sm font-bold text-violet-100">{t.colFind}</h3>
              <Link
                className="w-fit shrink-0 text-left text-xs font-semibold text-violet-200 underline-offset-2 hover:underline"
                href="/community/boards/new?cat=report_find"
              >
                {t.writeFind}
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {findRows.length === 0 ? (
                <li className="rounded-lg border border-dashed border-white/15 py-3 text-center text-slate-400">
                  {t.empty}
                </li>
              ) : (
                findRows.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col items-stretch gap-1 rounded-lg border border-white/5 bg-black/20 px-3 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-2"
                  >
                    <Link
                      href={`/community/boards/${r.id}`}
                      className="min-w-0 font-medium text-slate-100 hover:text-white"
                    >
                      <span className="line-clamp-2 break-words">{r.title}</span>
                    </Link>
                    <span
                      className="shrink-0 text-left text-[11px] text-slate-400 sm:pt-0.5 sm:text-right"
                      title={r.created_at}
                    >
                      {t.countReplies(r.comment_count)} · {formatDate(r.created_at)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg backdrop-blur-sm sm:p-5">
            <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <h3 className="text-sm font-bold text-amber-100">{t.colMissing}</h3>
              <Link
                className="w-fit shrink-0 text-left text-xs font-semibold text-amber-100/90 underline-offset-2 hover:underline"
                href="/community/boards/new?cat=report_missing"
              >
                {t.writeMissing}
              </Link>
            </div>
            <ul className="space-y-2 text-sm">
              {missingRows.length === 0 ? (
                <li className="rounded-lg border border-dashed border-white/15 py-3 text-center text-slate-400">
                  {t.empty}
                </li>
              ) : (
                missingRows.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col items-stretch gap-1 rounded-lg border border-white/5 bg-black/20 px-3 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-2"
                  >
                    <Link
                      href={`/community/boards/${r.id}`}
                      className="min-w-0 font-medium text-slate-100 hover:text-white"
                    >
                      <span className="line-clamp-2 break-words">{r.title}</span>
                    </Link>
                    <span
                      className="shrink-0 text-left text-[11px] text-slate-400 sm:pt-0.5 sm:text-right"
                      title={r.created_at}
                    >
                      {t.countReplies(r.comment_count)} · {formatDate(r.created_at)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/community/boards?cat=report_find"
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10"
          >
            {t.moreFind}
          </Link>
          <Link
            href="/community/boards?cat=report_missing"
            className="inline-flex items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-50 hover:bg-amber-500/15"
          >
            {t.moreMissing}
          </Link>
        </div>
      </div>
    </section>
  );
}
