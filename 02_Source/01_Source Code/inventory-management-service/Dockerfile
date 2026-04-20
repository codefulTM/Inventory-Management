# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY inventory-management-service/package*.json ./
RUN npm ci

COPY inventory-management-service/ .
COPY proto/ ./proto/
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY inventory-management-service/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proto ./dist/proto

EXPOSE 3001
EXPOSE 50052

CMD ["node", "dist/src/main.js"]
