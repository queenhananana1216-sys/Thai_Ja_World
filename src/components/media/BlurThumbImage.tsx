'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { allowNextImageRemoteOptimize } from '@/lib/image/allowNextImageOptimize';
import { TJ_TINY_BLUR_DATA_URL } from '@/lib/image/tinyBlurDataUrl';

type Base = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  sizes?: string;
  /** LCP·첫 화면 후보만 true (남용 시 오히려 느려짐) */
  priority?: boolean;
};

type Fixed = Base & {
  width: number;
  height: number;
  fill?: false;
};

type Filled = Base & {
  fill: true;
  width?: never;
  height?: never;
};

export type BlurThumbImageProps = Fixed | Filled;

/**
 * 고용량 썸네일 공통: 블러 자리 + (가능 시) Next 이미지 최적화.
 */
export function BlurThumbImage(props: BlurThumbImageProps) {
  const { src, alt, className, style, sizes, priority } = props;
  const unoptimized = !allowNextImageRemoteOptimize(src);
  const common = {
    src,
    alt,
    className,
    style,
    placeholder: 'blur' as const,
    blurDataURL: TJ_TINY_BLUR_DATA_URL,
    priority: Boolean(priority),
    unoptimized,
  };

  if (props.fill) {
    return (
      <Image
        {...common}
        alt={alt}
        fill
        sizes={sizes ?? '(max-width: 768px) 40vw, 200px'}
      />
    );
  }
  return (
    <Image {...common} alt={alt} width={props.width} height={props.height} sizes={sizes} />
  );
}
