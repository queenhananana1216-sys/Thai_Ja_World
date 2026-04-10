import 'server-only';

export function getMaxIngestBytes(): number {
  const n = Number(process.env.INGEST_MAX_BYTES ?? `${10 * 1024 * 1024}`);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 100 * 1024 * 1024) : 10 * 1024 * 1024;
}

export function getAllowedMimeSet(): Set<string> {
  const raw =
    process.env.INGEST_ALLOWED_MIME ??
    'image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}
