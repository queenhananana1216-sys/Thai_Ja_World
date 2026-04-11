import { registerPipelineTool } from '@/lib/tools/registry';
import type { MemoryEntry } from '@/lib/memory/types';
import { appendEntry } from '@/lib/memory/store';
import { searchMemory } from '@/lib/memory/search';

/** 외장 메모리 도구 — 파이프라인·관리 확장에서 `runPipelineTool` 로 호출 */
export function registerMemoryPipelineTools(): void {
  registerPipelineTool<{ text: string; tags?: string[] }, MemoryEntry>({
    id: 'memory.external.append',
    description: '외장 메모리(JSONL)에 한 줄 추가 — 로컬 디스크 전용',
    tags: ['memory', 'local'],
    async run(input) {
      return appendEntry(input.text, input.tags);
    },
  });

  registerPipelineTool<{ query: string; limit?: number }, { hits: MemoryEntry[] }>({
    id: 'memory.external.search',
    description: '외장 메모리 키워드 검색(토큰 매칭, 임베딩 없음)',
    tags: ['memory', 'local'],
    async run(input) {
      const hits = await searchMemory(input.query, input.limit ?? 8);
      return { hits };
    },
  });
}
