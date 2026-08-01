# Multi-stage build on Debian glibc so argon2 uses its prebuilt binary.
# (Alpine/musl fails to compile argon2; Nixpacks is heavy/fragile on small VPS.)
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

# Copy the standalone server + static assets (small, fast self-hosted image).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Next standalone tracing often omits native modules (argon2's .node binary),
# which crashes the container at first auth call. Copy the full node_modules
# so argon2's prebuilt linux-x64 binary is present and loadable.
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
USER nodejs
# Standalone server.js resolves node_modules from the app root.
CMD ["node", "server.js"]
