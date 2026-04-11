import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

/**
 * Ollama OpenAI 호환 API — 로컬에서 `ollama serve` 후
 * `ollama pull llama3.2` 등으로 모델 받기.
 * @see https://ollama.com
 */
export function getLocalAiModel() {
  const base = process.env.LOCAL_AI_BASE_URL?.trim() || 'http://127.0.0.1:11434/v1';
  const modelId = process.env.LOCAL_AI_MODEL?.trim() || 'llama3.2';
  const ollama = createOpenAI({
    baseURL: base,
    apiKey: process.env.LOCAL_AI_API_KEY?.trim() || 'ollama',
  });
  return ollama(modelId);
}

export async function askLocalAi(opts: { prompt: string; system?: string }): Promise<string> {
  const { text } = await generateText({
    model: getLocalAiModel(),
    system: opts.system,
    prompt: opts.prompt,
  });
  return text;
}
