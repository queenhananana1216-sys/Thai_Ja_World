/**
 * OpenAI Moderations API (omni-moderation-latest) — 텍스트·이미지 URL
 * https://platform.openai.com/docs/guides/moderation
 */

export type OpenAIModerationResult =
  | { flagged: false }
  | { flagged: true; categories?: Record<string, boolean> }
  | { error: 'IMAGE_REQUIRES_OPENAI' | 'HTTP' | 'PARSE'; detail?: string };

function envFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function parseResults(data: unknown): boolean {
  if (data === null || typeof data !== 'object') return false;
  const o = data as { results?: Array<{ flagged?: boolean }> };
  const r = o.results?.[0];
  return r?.flagged === true;
}

export async function moderatePostContent(
  title: string,
  body: string,
  imageUrls: string[],
): Promise<OpenAIModerationResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const text = `${title}\n\n${body}`.slice(0, 12000);
  const requireOpenAiForImages = envFlag('REQUIRE_OPENAI_FOR_IMAGE_MODERATION');

  if (imageUrls.length > 0 && !key) {
    if (requireOpenAiForImages) {
      return { error: 'IMAGE_REQUIRES_OPENAI' };
    }
    console.warn(
      '[moderation] OPENAI_API_KEY missing; skipping image moderation (fail-open enabled)',
      {
        imageCount: imageUrls.length,
      },
    );
    return { flagged: false };
  }

  if (!key) {
    return { flagged: false };
  }

  const model = process.env.OPENAI_MODERATION_MODEL?.trim() || 'omni-moderation-latest';

  const input: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [{ type: 'text', text }];

  for (const url of imageUrls.slice(0, 3)) {
    input.push({ type: 'image_url', image_url: { url } });
  }

  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, input }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    if (imageUrls.length > 0) {
      const resTextOnly = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ model, input: [{ type: 'text', text }] }),
      });
      if (resTextOnly.ok) {
        const dataText = (await resTextOnly.json()) as unknown;
        if (parseResults(dataText)) {
          return { flagged: true };
        }
      }
    }
    return { error: 'HTTP', detail: errBody.slice(0, 200) };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { error: 'PARSE' };
  }

  if (parseResults(data)) {
    const o = data as {
      results?: Array<{ flagged?: boolean; categories?: Record<string, boolean> }>;
    };
    const cats = o.results?.[0]?.categories;
    return { flagged: true, categories: cats };
  }

  return { flagged: false };
}

/** 댓글 등 짧은 텍스트 */
export async function moderatePlainText(text: string): Promise<OpenAIModerationResult> {
  return moderatePostContent(text, '', []);
}
