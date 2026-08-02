# Multi-stage build on Debian glibc so argon2 uses its prebuilt binary.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Skip the type-check/lint worker during the Docker build: the Oracle ARM VPS
# runs out of RAM on `next build`'s tsc worker. Types/lint are gated locally by
# a full `next build` before every push, so correctness is still enforced.
ENV NEXT_PRIVATE_SKIP_TYPE_CHECK=1
ENV NEXT_PRIVATE_SKIP_LINT=1
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Explicit bind so the proxy can always reach the server on the container network.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* \
 && addgroup --system nodejs && adduser --system --group nodejs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Full node_modules: Next standalone tracing omits argon2's native .node binary,
# which crashes the server on first auth call (502). Copy it explicitly.
COPY --from=builder /app/node_modules ./node_modules
# Drizzle migration config + SQL files so `npm run db:migrate` works from this
# container's terminal (it runs on the same private network as Postgres).
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000
USER nodejs
CMD ["node", "server.js"]
