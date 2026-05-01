# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY analytics-indexer-service/package*.json ./
RUN npm ci

COPY analytics-indexer-service/ .
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY analytics-indexer-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# No EXPOSE — pure background worker, no HTTP port
CMD ["node", "dist/main.js"]
