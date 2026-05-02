'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { hrefRequiresLoginRedirect } from '@/lib/nav/guestFunnel';

const FUNNEL_MSG = '로그인 후 이용할 수 있는 기능입니다.' as const;

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
  /** 로그인 상태 — false 이면 상세 등은 가로챔 */
  isLoggedIn: boolean;
  /** 퍼널 적용 강제 끄기(예: 절대 외부 허브) */
  forcePublic?: boolean;
  title?: string;
};

export default function GuestGateLink({
  href,
  className,
  children,
  isLoggedIn,
  forcePublic,
  title,
}: Props) {
  const router = useRouter();
  const gated = !isLoggedIn && !forcePublic && hrefRequiresLoginRedirect(href);

  if (!gated) {
    return (
      <Link prefetch={true} href={href} className={className} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        toast.error(FUNNEL_MSG, { position: 'top-center' });
        router.push('/login');
      }}
    >
      {children}
    </a>
  );
}
