import { randomUUID } from 'node:crypto';
import { config as dotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv({ path: '.env.local' });
dotenv();

type Env = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

function requireEnv(name: keyof Env): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

async function main() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

  const email = `ops.verify.image.${Date.now()}@example.com`;
  const password = `Tmp!${Date.now()}A`;
  const title = `[OPS_VERIFY] image upload ${new Date().toISOString()}`;
  const content = '자동 점검: 게시판 이미지 업로드/등록 경로 확인';

  let createdUserId: string | null = null;
  let createdPostId: string | null = null;
  let uploadedPath: string | null = null;

  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(`createUser failed: ${created.error?.message ?? 'unknown'}`);
    }
    createdUserId = created.data.user.id;

    const userClient = createClient(url, anon, { auth: { persistSession: false } });
    const signedIn = await userClient.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) {
      throw new Error(`signInWithPassword failed: ${signedIn.error?.message ?? 'unknown'}`);
    }
    const accessToken = signedIn.data.session.access_token;

    // 1x1 transparent PNG
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgN7lWwAAAABJRU5ErkJggg==';
    const pngBytes = Buffer.from(pngBase64, 'base64');
    uploadedPath = `${createdUserId}/${Date.now()}_${randomUUID()}.png`;

    const up = await userClient.storage.from('post-images').upload(uploadedPath, pngBytes, {
      contentType: 'image/png',
      upsert: false,
    });
    if (up.error) {
      throw new Error(`storage upload failed: ${up.error.message}`);
    }

    const pub = userClient.storage.from('post-images').getPublicUrl(uploadedPath);
    const imageUrl = pub.data.publicUrl;

    const res = await fetch('http://127.0.0.1:3000/api/community/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        category: 'free',
        title,
        content,
        image_urls: [imageUrl],
      }),
    });

    const payload = (await res.json()) as { id?: string; code?: string; message?: string };
    if (!res.ok || !payload.id) {
      throw new Error(
        `post API failed: status=${res.status}, code=${payload.code ?? ''}, message=${payload.message ?? ''}`,
      );
    }
    createdPostId = payload.id;

    console.log('VERIFY_POST_IMAGE_FLOW_OK', {
      postId: createdPostId,
      uploadedPath,
      imageUrl,
    });
  } finally {
    if (createdPostId) {
      await admin.from('posts').delete().eq('id', createdPostId);
    }
    if (uploadedPath) {
      await admin.storage.from('post-images').remove([uploadedPath]);
    }
    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId);
    }
  }
}

main().catch((err: unknown) => {
  console.error('VERIFY_POST_IMAGE_FLOW_FAIL', err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});

