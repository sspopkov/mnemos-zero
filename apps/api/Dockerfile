# ---------- base ----------
FROM node:20-bookworm-slim AS base

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---------- builder ----------
FROM base AS builder
WORKDIR /work

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

ENV CI=true
ENV NODE_ENV=production
ENV PNPM_IGNORE_SCRIPTS=false
ARG DATABASE_URL="postgresql://dummy:dummy@127.0.0.1:5432/dummy?schema=public"
ENV DATABASE_URL=${DATABASE_URL}

COPY full/ ./

COPY pnpm-lock.yaml pnpm-workspace.yaml ./

COPY tsconfig.base.json ./

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

# build + deploy
RUN pnpm --filter @mnemos/api build
RUN pnpm --filter @mnemos/api deploy --prod /out

# ---------- runtime ----------
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /out/ ./

EXPOSE 4000
CMD ["node", "dist/index.js"]
