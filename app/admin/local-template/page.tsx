import { createServiceRoleClient } from '@/lib/supabase/admin';
import LocalTemplateWizardClient, { type LocalSpotOption } from './_components/LocalTemplateWizardClient';

export default async function AdminLocalTemplatePage() {
  let spots: LocalSpotOption[] = [];
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('local_spots')
      .select('id, slug, name')
      .order('name', { ascending: true })
      .limit(500);
    if (!error && data) {
      spots = data.map((r) => ({
        id: String((r as { id: string }).id),
        slug: String((r as { slug: string }).slug ?? ''),
        name: String((r as { name: string }).name ?? ''),
      }));
    }
  } catch {
    spots = [];
  }

  return (
    <main className="min-h-screen bg-slate-900 p-4 text-slate-100 md:p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-xl font-semibold">로컬 미니홈 템플릿 — Vision AI</h1>
        <p className="mb-6 max-w-3xl text-sm leading-relaxed text-slate-300">
          가게 사진을 분석해 스킨·BGM·메뉴 OCR을 얻은 뒤, 대상 <code className="rounded bg-slate-800 px-1">local_spots</code> 행에{' '}
          <strong className="text-white">이대로 템플릿 생성</strong>으로 반영합니다. DB에는{' '}
          <code className="rounded bg-slate-800 px-1">local_minihomes</code>(AI 메타)와{' '}
          <code className="rounded bg-slate-800 px-1">local_menus</code>(메뉴 행)가 함께 갱신되며, 테마·BGM URL은{' '}
          <code className="rounded bg-slate-800 px-1">local_spots</code>에 동기화됩니다. (
          <code className="rounded bg-slate-800 px-1">OPENAI_API_KEY</code> · 마이그레이션 127·128 필요)
        </p>
        <LocalTemplateWizardClient spots={spots} />
      </div>
    </main>
  );
}
