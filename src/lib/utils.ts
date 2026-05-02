import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 실제 조회수가 낮을 때 글 id 기반으로 일관된 착시 조회수를 만든다.
 * `realViews <= 300` 이면 [150, 450] 구간의 고정 오프셋을 더하고, 그 위는 실제값만 쓴다.
 */
export function getPerceivedViewCount(realViews: number, postId: string): number {
  const floored = Math.floor(Number(realViews));
  const real = Number.isFinite(floored) ? Math.max(0, floored) : 0;
  if (real > 300) return real;

  const key = String(postId ?? '').trim();
  let acc = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    acc ^= key.charCodeAt(i);
    acc = Math.imul(acc, 16777619) >>> 0;
  }
  acc = (acc ^ (key.length * 73856093)) >>> 0;
  const span = 301;
  const offset = 150 + (acc % span);
  return real + offset;
}
