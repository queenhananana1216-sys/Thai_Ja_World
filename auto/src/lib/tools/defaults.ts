import 'server-only';
import { getCharterPreview } from '@/lib/charter/loadCharter';
import { registerPipelineTool } from '@/lib/tools/registry';

/** 기본 등록 — SEO·운영 확장용 훅 */
export function registerDefaultPipelineTools(): void {
  registerPipelineTool<{ path: string; locale?: string }, { title: string; description: string; note: string }>({
    id: 'seo.metaDraft',
    description: '경로·로케일 힌트로 메타 초안(스텁 — 실제 규칙은 태자 i18n과 합치기)',
    tags: ['seo'],
    async run(input) {
      const p = input.path || '/';
      return {
        title: `태자 월드 — ${p}`,
        description: '메타 설명은 dictionaries·브랜드 규칙으로 치환하세요.',
        note: 'stub: taeja-world의 JsonLd·site.ts와 연동 시 확장',
      };
    },
  });

  registerPipelineTool<Record<string, never>, { excerpt: string }>({
    id: 'ops.charterExcerpt',
    description: '강령 일부(로컬 파일만 읽음)',
    tags: ['ops'],
    async run() {
      return { excerpt: getCharterPreview(1200) };
    },
  });
}

registerDefaultPipelineTools();
