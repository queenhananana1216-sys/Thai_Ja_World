# TaejaWorld Stability Verification (2026-04-13)

## 1) Image moderation fail-open hotfix

### Changes

- `src/lib/moderation/openaiModeration.ts`
  - Added `REQUIRE_OPENAI_FOR_IMAGE_MODERATION` flag.
  - Default behavior when `OPENAI_API_KEY` is missing:
    - image moderation is skipped (fail-open),
    - post submission is not blocked,
    - warning log is emitted.
- `.env.example`
  - Added `OPENAI_API_KEY` and `REQUIRE_OPENAI_FOR_IMAGE_MODERATION` guidance.

### Verification

- `npm run type-check` passed.
- Runtime behavior check:
  - without key + default flag -> `{"flagged":false}`
  - without key + `REQUIRE_OPENAI_FOR_IMAGE_MODERATION=true` -> `{"error":"IMAGE_REQUIRES_OPENAI"}`

## 2) OPENAI key recovery status

### Deployment env audit (Vercel)

- `OPENAI_API_KEY`: **not found**
- `GEMINI_API_KEY`: found
- Result: image moderation was previously blocking image posts due to missing OpenAI key path.

### Current operational state

- Service is protected from hard failure by fail-open hotfix.
- To restore strict image moderation policy:
  1. add `OPENAI_API_KEY` to Vercel env (Production/Preview/Development),
  2. optionally set `REQUIRE_OPENAI_FOR_IMAGE_MODERATION=true`,
  3. redeploy and verify.

## 3) DB/storage schema checks (executed against Supabase project `yjjxlrkxqdipjkdpudde`)

### Checks executed

- `public.posts.image_urls` column existence/constraints
- storage buckets:
  - `post-images`
  - `minihome-photos`
- storage policies for both buckets
- minihome photo/album public table policies

### Result

- `public.posts.image_urls`: present, `text[]`, `not null`, default `'{}'::text[]`.
- buckets:
  - `post-images`: public, 5MB, mime allowlist configured
  - `minihome-photos`: public, 5MB, mime allowlist configured
- required storage/object RLS policies: present.
- minihome photo/album policies: present.

No schema mismatch was found for the investigated image upload paths.

## 4) Full-site button audit (browser run)

### Scope tested

- `/`, `/tips`, `/local`, `/community/boards`, `/community/trade`, `/ilchon`, `/minihome`
- global nav links, homepage CTA links, auth page links

### Full-site outcome

- Pass: home, tips, tip detail/back, login/signup links, ilchon page load.
- Blocker (auth-required redirects): local, community, trade, minihome, chat join.
- Reproducible functional defect: none found in tested public scope.

## 5) Minihome E2E verification

### Minihome outcome

- `minihome` owner/visitor full E2E is currently blocked by data/access conditions:
  - `/minihome` requires login.
  - public minihome slugs currently absent (`is_public=true` rows: 0).
  - auth flow showed captcha verification failure in automated login path.

### Verified facts

- minihome implementation code exists and is wired:
  - page routing and rendering (`app/minihome/[slug]/page.tsx`)
  - panel actions and upload handlers (`app/minihome/_components/MinihomeRoomView.tsx`)
  - DB/storage schema and policies present for photo features.

### Remaining gate for full E2E completion

- Prepare testable access path:
  - at least one public minihome seed row,
  - or valid QA account/login path without captcha blocking automation.
