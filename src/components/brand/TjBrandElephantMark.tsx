'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** 뷰박스 기준 높이·너비(px) */
  size?: number;
  /** 브랜드 로딩용 부드러운 모션 — 전역 `.tj-brand-ele-*` */
  animate?: 'none' | 'breathe' | 'wobble';
  /** 접근성: 장식이 아니라 의미 있는 이미지일 때만 전달 */
  title?: string;
};

/**
 * 「태국에, 살자」 마스코트 — 로딩·AI 파이프라인·상태 배지에 통일 사용
 */
export function TjBrandElephantMark({
  className,
  size = 48,
  animate = 'breathe',
  title,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `tj-elephant-grad-${uid}`;

  const motion =
    animate === 'breathe'
      ? 'tj-brand-ele-breathe'
      : animate === 'wobble'
        ? 'tj-brand-ele-wobble'
        : '';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn('shrink-0', motion, className)}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradId} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef3c7" />
          <stop offset="0.38" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#67e8f9" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradId})`}>
        {/* 귀 */}
        <ellipse cx="15" cy="20" rx="8.5" ry="10" opacity="0.92" />
        {/* 몸·머리 실루엣 */}
        <path d="M20 14c11-2.5 22.5 4.2 23.8 17.5C45.2 38.5 36.5 46 26 46c-5.8 0-10.8-2.4-13.8-6.5-2.1 1.8-5.5 1-5.8-2.4-.4-4.2 4.8-8.2 13-8.8C16.8 21.8 17.8 15.8 20 14Z" />
        {/* 코 */}
        <path
          d="M32.5 26.5c5.8 1.2 9.8 5.8 9.2 11.6-.8 7-10.2 10-16.8 7.4"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity="0.95"
        />
        {/* 눈 하이라이트 */}
        <circle cx="29" cy="22" r="2.3" fill="rgba(15,23,42,0.28)" />
        <circle cx="28.1" cy="21.2" r="0.85" fill="rgba(255,255,255,0.65)" />
      </g>
    </svg>
  );
}
