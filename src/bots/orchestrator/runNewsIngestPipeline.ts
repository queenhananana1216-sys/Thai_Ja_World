/**
 * RSS 수집(raw_news) → LLM 한국어·태국어 제목·요약(processed_news) 한 번에 실행.
 */

import { randomUUID } from 'node:crypto';
import { runCollectLoop, type RunCollectLoopOptions } from './runCollectLoop';
import { runProcessNewsLoop, type RunProcessNewsOptions } from './runProcessNewsLoop';

export interface RunNewsIngestPipelineOptions {
  /** false 이면 RSS 수집 생략 (이미 쌓인 raw 만 나중에 process-news 로 처리) */
  skipCollect?: boolean;
  /** false 이면 LLM 처리 생략 (수집만) */
  skipProcess?: boolean;
  collect?: RunCollectLoopOptions;
  process?: RunProcessNewsOptions;
}

export interface RunNewsIngestPipelineResult {
  collect: Awaited<ReturnType<typeof runCollectLoop>>;
  process: Awaited<ReturnType<typeof runProcessNewsLoop>>;
}

export async function runNewsIngestPipeline(
  options: RunNewsIngestPipelineOptions = {},
): Promise<RunNewsIngestPipelineResult> {
  const collect = options.skipCollect
    ? {
        run_id: randomUUID(),
        skipped: false,
        success: true as const,
        output: { pipeline_skip: 'collect' as const },
      }
    : await runCollectLoop(options.collect ?? {});

  const process = options.skipProcess
    ? {
        run_id: randomUUID(),
        skipped: false,
        success: true as const,
        output: { pipeline_skip: 'process' as const },
      }
    : await runProcessNewsLoop(options.process ?? {});

  return { collect, process };
}
