'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

const FUNNEL_MSG = '로그인 후 이용할 수 있는 기능입니다.' as const;

/** 버튼 스타일로 글쓰기 등 액션 링크를 가릴 때 사용 */
export default function GuestGateButtonLink({
  href,
  className,
  children,
  isLoggedIn,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  if (isLoggedIn) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        toast.error(FUNNEL_MSG, { position: 'top-center' });
        router.push('/login');
      }}
    >
      {children}
    </button>
  );
}
