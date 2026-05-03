# syntax=docker/dockerfile:1
#
# Next.js 15 standalone — smallest runnable image.
#
# 빌드 시 `NEXT_PUBLIC_*` 등은 빌드 타임에 고정됩니다. 호스트의 백업 파일을 BuildKit secret 으로 넣으세요:
#   docker build --secret id=dockerenv,src=F:/02_Master_Keys/API_JSON/.env.docker -t taeja-world .
#
# 실행 시 서버 전용 키는 런타임 주입(이미지 레이어에 시크릿을 남기지 않음):
#   docker run -p 3000:3000 --env-file F:/02_Master_Keys/API_JSON/.env.docker taeja-world
#
# (선택) Docker Desktop — BuildKit 기본 켜짐. secret 경로는 본인 PC 기준으로 조정.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
# postinstall 가 이 스크립트를 호출하므로 npm ci 전에 필요
COPY scripts/strip-console-ninja-next-hook.js scripts/strip-console-ninja-next-hook.js
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}

# `.env.docker` 는 저장소에 두지 않고, 빌드 시에만 secret 마운트로 주입합니다.
# NEXT_SUPPRESS_DUMMY_SUPABASE_WARN: 시크릿이 워커에 안 붙은 빌드 단계에서 더미 Supabase 경고만 숨김(런타임 컨테이너에는 미설정).
RUN --mount=type=secret,id=dockerenv,target=/run/secrets/.env.docker \
  DOTENV_CONFIG_PATH=/run/secrets/.env.docker \
  NEXT_SUPPRESS_DUMMY_SUPABASE_WARN=1 \
  node -r dotenv/config ./node_modules/.bin/next build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
