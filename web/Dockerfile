# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:25-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM nginx:alpine AS production

# Copy compiled React app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx SPA config
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser && \
    chown -R appuser:appgroup /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
