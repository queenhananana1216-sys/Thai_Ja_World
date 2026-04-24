'use client';

import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/landing/GlassCard';
import { DEFAULT_MERGED_LANDING_PAGE_COPY } from '@/lib/landing/landingPageCopyDefaultPayload';
import { pickBilingual } from '@/lib/landing/landingPageCopyShared';
import type { ProblemSectionCopy } from '@/lib/landing/landingPageCopyTypes';
import type { Locale } from '@/i18n/types';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export function ProblemSection({
  copy,
  locale,
  degraded,
}: {
  copy?: ProblemSectionCopy;
  locale: Locale;
  degraded?: boolean;
}) {
  const c = copy ?? DEFAULT_MERGED_LANDING_PAGE_COPY.problem;
  return (
    <section
      className="relative z-10 overflow-hidden py-24"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '52px 0',
        background: 'linear-gradient(180deg, #0b0c18 0%, #111225 52%, #15172e 100%)',
        color: '#e2e8f0',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          opacity: 0.8,
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(196,181,253,0.16), transparent 46%), radial-gradient(ellipse at 80% 50%, rgba(249,168,212,0.13), transparent 56%)',
        }}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6" style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '0 16px' }}>
        <h2 className="text-3xl font-bold text-white sm:text-4xl" style={{ margin: 0, color: '#fff', fontSize: 'clamp(24px,4.4vw,36px)', fontWeight: 800 }}>
          {pickBilingual(c.title, locale)}
        </h2>
        {degraded ? (
          <p className="mt-2 text-xs text-amber-200/80">
            {locale === 'th'
              ? 'โหลดข้อความจากฐานข้อมูลไม่สำเร็จ — แสดงค่าเริ่มต้น'
              : '랜딩 섹션 문구를 DB에서 읽지 못해 기본 문구로 표시 중입니다.'}
          </p>
        ) : null}
        <motion.div
          className="mt-10 grid gap-5 md:grid-cols-3"
          style={{ marginTop: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {c.points.map((point) => (
            <motion.div key={point.id} variants={cardVariants}>
              <GlassCard title={point.title} quote={point.quote} detail={point.detail} />
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-8 text-sm leading-relaxed text-slate-300" style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.6, color: '#cbd5e1' }}>
          {pickBilingual(c.footer, locale)}
        </p>
      </div>
    </section>
  );
}
