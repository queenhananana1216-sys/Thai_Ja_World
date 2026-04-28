import { createServiceRoleClient } from '@/lib/supabase/admin';
import LocalShowcaseClient from './_components/LocalShowcaseClient';

export default async function AdminLocalShowcasePage() {
  const admin = createServiceRoleClient();
  const [spotsRes, draftsRes] = await Promise.all([
    admin
      .from('local_spots')
      .select('id, name, category, region, photo_urls')
      .order('created_at', { ascending: false })
      .limit(40),
    admin
      .from('local_spot_template_drafts')
      .select('id, local_spot_id, confidence, status, template_json, style_profile_json, created_at')
      .order('created_at', { ascending: false })
      .limit(40),
  ]);

  return (
    <main className="min-h-screen bg-slate-900 p-4 text-slate-100 md:p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-xl font-semibold">로컬 쇼케이스 제너레이터</h1>
        <p className="mb-6 text-sm text-slate-300">
          메뉴판/매장 사진 업로드 후 Vision-AI 분석 → 내부 스타일 아이템 자동 매핑 → 매직 프리뷰 생성
        </p>
        <LocalShowcaseClient spots={spotsRes.data ?? []} drafts={draftsRes.data ?? []} />
      </div>
    </main>
  );
}
