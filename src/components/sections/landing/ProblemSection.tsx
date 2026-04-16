'use client';

import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/landing/GlassCard';
import { LANDING_PAIN_POINTS } from '@/lib/landing/constants';

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

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(196,181,253,0.16), transparent 46%), radial-gradient(ellipse at 80% 50%, rgba(249,168,212,0.13), transparent 56%)',
        }}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">이런 상황, 한 번쯤 겪어보셨죠?</h2>
        <motion.div
          className="mt-10 grid gap-5 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {LANDING_PAIN_POINTS.map((point) => (
            <motion.div key={point.id} variants={cardVariants}>
              <GlassCard title={point.title} quote={point.quote} detail={point.detail} />
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-8 text-sm leading-relaxed text-slate-300">
          태자월드는 겪은 사람이 정리하고, 다음 사람이 꺼내 쓰는 구조로 이 반복 문제를 줄이기 위해 만들어졌습니다.
        </p>
      </div>
    </section>
  );
}
