# ---------- builder ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /work

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1

COPY full/ ./

COPY pnpm-lock.yaml pnpm-workspace.yaml ./

COPY tsconfig.base.json ./

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# build landing
RUN pnpm --filter @mnemos/landing build

# ---------- runtime ----------
FROM node:20-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
EXPOSE 3001

# standalone output
COPY --from=builder /work/apps/landing/.next/standalone ./
COPY --from=builder /work/apps/landing/.next/static ./apps/landing/.next/static
COPY --from=builder /work/apps/landing/public ./apps/landing/public

CMD ["node", "apps/landing/server.js"]
