/**
 * llangkka 전용 파이프라인 도구 레지스트리.
 * 태자 월드 SEO·다른 패키지에서 import 해 확장할 수 있음.
 */

export type PipelineToolId = string;

export type PipelineToolHandler<TIn = unknown, TOut = unknown> = (input: TIn) => Promise<TOut>;

export type PipelineToolDefinition<TIn = unknown, TOut = unknown> = {
  id: PipelineToolId;
  /** 짧은 설명 — SEO/관리 UI·문서용 */
  description: string;
  /** 도메인 태그: seo | ops | ingest … */
  tags?: string[];
  run: PipelineToolHandler<TIn, TOut>;
};

const tools = new Map<PipelineToolId, PipelineToolDefinition>();

export function registerPipelineTool<TIn, TOut>(def: PipelineToolDefinition<TIn, TOut>): void {
  tools.set(def.id, def as PipelineToolDefinition);
}

export function getPipelineTool(id: PipelineToolId): PipelineToolDefinition | undefined {
  return tools.get(id);
}

export function listPipelineTools(): Array<{ id: string; description: string; tags?: string[] }> {
  return [...tools.values()].map((t) => ({
    id: t.id,
    description: t.description,
    tags: t.tags,
  }));
}

export async function runPipelineTool<TIn, TOut>(id: PipelineToolId, input: TIn): Promise<TOut> {
  const t = tools.get(id);
  if (!t) throw new Error(`unknown pipeline tool: ${id}`);
  return (await t.run(input)) as TOut;
}
