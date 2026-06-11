# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:25-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci

COPY src ./src/

RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:25-alpine AS production

RUN apk add --no-cache wget

WORKDIR /app

# Copy package files and install production deps only
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && \
    npx prisma generate && \
    npm cache clean --force

# Copy compiled output
COPY --from=builder /app/dist ./dist/

# Non-root user for security
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
