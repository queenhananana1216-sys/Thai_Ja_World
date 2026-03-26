'use client';

import type { Dictionary } from '@/i18n/dictionaries';
import { createBrowserClient } from '@/lib/supabase/client';
import { getAuthSiteOrigin } from '@/lib/auth/getAuthSiteOrigin';

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE === '1';
const SHOW_DEV_GOOGLE_HINT =
  process.env.NODE_ENV === 'development' && !GOOGLE_ENABLED;

const ENV_CODE = 'NEXT_PUBLIC_AUTH_GOOGLE=1';

type Props = {
  next: string;
  social: Pick<Dictionary['auth'], 'googleContinue' | 'devGoogleBadge' | 'devGoogleTail'>;
};

export default function SocialAuthButtons({ next, social }: Props) {
  if (!GOOGLE_ENABLED) {
    if (!SHOW_DEV_GOOGLE_HINT) return null;
    return (
      <p
        className="auth-dev-hint"
        style={{
          fontSize: '0.72rem',
          color: '#94a3b8',
          marginTop: 8,
          lineHeight: 1.45,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.03)',
          border: '1px dashed var(--tj-line)',
        }}
      >
        <strong>{social.devGoogleBadge}</strong>
        {social.devGoogleTail}
        <code style={{ fontSize: '0.68rem' }}>{ENV_CODE}</code>
      </p>
    );
  }

  async function oauthGoogle() {
    const sb = createBrowserClient();
    const origin = getAuthSiteOrigin();
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: 'select_account' },
      },
    });
  }

  return (
    <div style={{ marginTop: 4 }}>
      <button
        type="button"
        className="board-form__submit auth-btn--social"
        onClick={() => void oauthGoogle()}
      >
        <span aria-hidden style={{ marginRight: 8 }}>
          G
        </span>
        {social.googleContinue}
      </button>
    </div>
  );
}
