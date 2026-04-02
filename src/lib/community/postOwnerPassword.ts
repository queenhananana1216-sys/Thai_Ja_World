import 'server-only';

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PREFIX = 'v1';
const KEYLEN = 64;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

export function hashPostOwnerPassword(plain: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(plain.normalize('NFKC'), salt, KEYLEN, SCRYPT_OPTS);
  return `${PREFIX}$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPostOwnerPassword(plain: string, stored: string): boolean {
  const parts = String(stored).split('$');
  if (parts.length !== 3 || parts[0] !== PREFIX) return false;
  try {
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    if (salt.length !== 16 || expected.length !== KEYLEN) return false;
    const key = scryptSync(plain.normalize('NFKC'), salt, KEYLEN, SCRYPT_OPTS);
    return timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}
