import Link from 'next/link';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export default async function OwnerShopOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createServerSupabaseAuthClient();
  const { data: spot } = await sb
    .from('local_spots')
    .select('is_published,slug')
    .eq('id', id)
    .maybeSingle();

  const published = spot?.is_published === true;
  const internalSlug = spot?.slug ?? '';

  return (
    <div className="card owner-shop-overview">
      <p className="owner-shop-overview__lead">
        아래 메뉴에서 공지·이벤트·사진·메뉴·소개·영업시간·댓글을 단계적으로 다룰 수 있게 정리했습니다. 일부는 DB·정책 연동 전이라
        안내 문구만 보일 수 있습니다. 가게 이름·슬러그·목록 공개 여부는 운영진(관리자)만 바꿀 수 있습니다.
      </p>
      <ul className="owner-shop-overview__list">
        <li>내부 관리용 슬러그: {internalSlug ? <code>{internalSlug}</code> : '—'}</li>
        <li>로컬 목록 노출: {published ? '공개' : '비공개'}</li>
      </ul>
      <p className="owner-shop-overview__advanced">
        <Link href={`/my-local-shop/${id}/advanced`} className="owner-shop-overview__advanced-link">
          테마·BGM·레이아웃·확장 JSON(고급)
        </Link>
        <span className="owner-shop-overview__advanced-hint"> — JSON으로 미니홈 세부를 한꺼번에 편집</span>
      </p>
    </div>
  );
}
