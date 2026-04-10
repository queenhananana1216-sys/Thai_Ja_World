import { type NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { appendAudit } from '@/lib/store';
import { isIngestAuthorized } from '@/lib/ingest/auth';
import { getAllowedMimeSet, getMaxIngestBytes } from '@/lib/ingest/limits';
import { validateSourceUrlForAudit } from '@/lib/ingest/sourceUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * 관리자 봇(Nord VPN 전용 IP 등)이 **이미 받은** 미디어 바이트를 업로드.
 * - 서버는 임의 URL을 fetch 하지 않음(SSRF 방지). 출처는 `X-Ingest-Source-Url` 헤더로 감사만.
 * - `INGEST_IP_ALLOWLIST`에 전용 IP를 넣으면 방어 레이어로 사용.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = isIngestAuthorized(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.reason.includes('not configured') ? 503 : 401 });
  }

  const sourceHeader = req.headers.get('x-ingest-source-url');
  const sourceCheck = validateSourceUrlForAudit(sourceHeader, process.env.INGEST_ALLOWED_SOURCE_HOSTS);
  if (!sourceCheck.ok) {
    return NextResponse.json({ error: sourceCheck.reason }, { status: 400 });
  }

  const maxBytes = getMaxIngestBytes();
  const mimeAllow = getAllowedMimeSet();

  const ct = req.headers.get('content-type') ?? '';
  let filename = `ingest-${Date.now()}`;
  let mime = 'application/octet-stream';
  let buffer: Buffer;

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'expected multipart field "file"' }, { status: 400 });
    }
    if (file.size > maxBytes) {
      return NextResponse.json({ error: 'file too large', maxBytes }, { status: 413 });
    }
    mime = (file.type || 'application/octet-stream').toLowerCase();
    if (!mimeAllow.has(mime)) {
      return NextResponse.json({ error: 'MIME not allowed', mime }, { status: 415 });
    }
    filename = file.name || filename;
    const ab = await file.arrayBuffer();
    buffer = Buffer.from(ab);
  } else {
    const len = req.headers.get('content-length');
    if (len && Number(len) > maxBytes) {
      return NextResponse.json({ error: 'body too large', maxBytes }, { status: 413 });
    }
    mime = (ct.split(';')[0] ?? '').trim().toLowerCase() || 'application/octet-stream';
    if (!mimeAllow.has(mime)) {
      return NextResponse.json({ error: 'MIME not allowed', mime }, { status: 415 });
    }
    const ab = await req.arrayBuffer();
    buffer = Buffer.from(ab);
    if (buffer.length > maxBytes) {
      return NextResponse.json({ error: 'body too large', maxBytes }, { status: 413 });
    }
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  let blobUrl: string | null = null;
  if (blobToken) {
    try {
      const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
      const pathname = `bot-ingest/${safeName}`;
      const uploaded = await put(pathname, buffer, {
        access: 'public',
        token: blobToken,
        contentType: mime,
      });
      blobUrl = uploaded.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await appendAudit('ingest_blob_failed', { error: msg, bytes: buffer.length, mime });
      return NextResponse.json({ error: 'blob upload failed', detail: msg }, { status: 502 });
    }
  }

  await appendAudit('ingest_media', {
    bytes: buffer.length,
    mime,
    filename,
    clientIp: auth.clientIp,
    sourceUrlHost: sourceCheck.hostname || undefined,
    blobUrl: blobUrl ?? undefined,
  });

  return NextResponse.json({
    ok: true,
    receivedBytes: buffer.length,
    mime,
    blobUrl,
    stored: Boolean(blobUrl),
  });
}
