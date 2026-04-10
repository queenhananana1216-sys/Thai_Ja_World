<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->

## Cursor Cloud specific instructions

### Project overview

**taeja-world** — Korean-Thai community portal (Next.js 15 App Router + React 19 + TypeScript + Supabase). Package manager: **npm**. Node 22+ required.

### Environment variables

A `.env.local` file is required with at minimum `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Copy from `.env.example`. Without real Supabase credentials the dev server starts and renders pages, but data-fetching sections fall back to defaults or show "fetch failed" gracefully.

### Running the dev server

```
npm run dev          # http://127.0.0.1:3000
```

The dev server uses webpack polling (`watchOptions.poll: 1000`) for file-watch compatibility.

### Lint / type-check / build

- `npm run type-check` — `tsc --noEmit` (passes cleanly)
- `npm run lint` — `next lint` (requires `eslint` + `eslint-config-next` as devDependencies; the repo ships without an ESLint config — if none exists, create `eslint.config.mjs` with `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` ignoring `auto/`, `cloudflare/`, `my-project/`, `my-workflow-app/`, `llangkka/`)
- `npm run build` — may fail on pre-existing React hooks lint errors in the codebase; this is a known state, not a setup issue

### Supabase

The app requires a hosted Supabase project (or Supabase CLI for local dev). 76 migrations live in `supabase/migrations/`. Without a real DB the app still renders public UI with fallback data.

### Sub-projects

`auto/`, `cloudflare/workers/edge-guard/`, `my-project/`, `my-workflow-app/` are independent sub-projects excluded from the root tsconfig. They are not needed for taeja-world development.
