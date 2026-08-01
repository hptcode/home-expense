# Multi-stage build on Debian glibc so argon2 uses its prebuilt binary
# (Alpine/musl fails to compile argon2; Nixpacks is heavy/fragile on small VPS).
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update -y && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* \
 && addgroup --system nodejs && adduser --system --group nodejs
# Next standalone output (see next.config.mjs) -> small self-contained server
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
USER nodejs
CMD ["node", "server.js"]
