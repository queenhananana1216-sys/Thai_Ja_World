import 'server-only';
import { getCharterPreview } from '@/lib/charter/loadCharter';
import { draftMetaFromMemory } from '@/lib/seo/metaFromMemory';
import { registerPipelineTool } from '@/lib/tools/registry';
import { registerMemoryPipelineTools } from '@/lib/tools/memoryTools';

/** 기본 등록 — SEO·운영 확장용 훅 */
export function registerDefaultPipelineTools(): void {
  registerPipelineTool<
    { path: string; locale?: string; memoryQuery?: string; memoryLimit?: number },
    { title: string; description: string; note: string; memoryIds?: string[] }
  >({
    id: 'seo.metaDraft',
    description:
      '외장 메모리 검색 → 규칙 또는 로컬 AI로 title·description 초안(배포 전 i18n·검수 필수)',
    tags: ['seo', 'memory'],
    async run(input) {
      return draftMetaFromMemory({
        path: input.path || '/',
        locale: input.locale,
        memoryQuery: input.memoryQuery,
        memoryLimit: input.memoryLimit,
      });
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

  registerMemoryPipelineTools();
}

registerDefaultPipelineTools();
