import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { generateLocalTemplateFromVision } from '@/lib/admin/generateLocalTemplateFromVision';
import type { VisionTemplateImage } from '@/lib/admin/generateLocalTemplateFromVision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_FILES = 14;
const MAX_BYTES_PER_FILE = 6 * 1024 * 1024;
const ALLOWED_PREFIX = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

async function fileToDataUrl(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const mimePart = (file.type || 'image/jpeg').split(';')[0];
  const mime = (mimePart ?? 'image/jpeg').trim().toLowerCase();
  if (!ALLOWED_PREFIX.has(mime)) throw new Error(`unsupported_mime:${mime}`);
  const b64 = buf.toString('base64');
  return `data:${mime};base64,${b64}`;
}

function collectFiles(form: FormData, key: string): File[] {
  return form
    .getAll(key)
    .filter((x): x is File => x instanceof File && x.name !== '' && x.size > 0);
}

export async function POST(req: Request): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
  }

  const businessNameRaw = form.get('businessName');
  const businessName =
    typeof businessNameRaw === 'string' ? businessNameRaw.trim() : String(businessNameRaw ?? '').trim();
  if (!businessName || businessName.length > 200) {
    return NextResponse.json({ error: 'invalid_business_name' }, { status: 400 });
  }

  const exterior = collectFiles(form, 'exterior');
  const interior = collectFiles(form, 'interior');
  const menu = collectFiles(form, 'menu');
  const all = [...exterior, ...interior, ...menu];

  if (all.length === 0) {
    return NextResponse.json({ error: 'images_required' }, { status: 400 });
  }
  if (all.length > MAX_FILES) {
    return NextResponse.json({ error: `too_many_files_max_${MAX_FILES}` }, { status: 400 });
  }

  for (const f of all) {
    if (f.size > MAX_BYTES_PER_FILE) {
      return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
    }
  }

  const images: VisionTemplateImage[] = [];

  try {
    for (const f of exterior) {
      images.push({ role: 'exterior', dataUrl: await fileToDataUrl(f) });
    }
    for (const f of interior) {
      images.push({ role: 'interior', dataUrl: await fileToDataUrl(f) });
    }
    for (const f of menu) {
      images.push({ role: 'menu', dataUrl: await fileToDataUrl(f) });
    }

    const result = await generateLocalTemplateFromVision({ businessName, images });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status =
      msg.includes('OPENAI_API_KEY') || msg.includes('decoration_assets_catalog_empty')
        ? 503
        : msg.startsWith('openai_vision_')
          ? 502
          : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
