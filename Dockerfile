# Production Dockerfile for Next.js Application
# Multi-stage build for optimal image size

# ============================================
# Stage 1: Builder
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN apk add --no-cache python3 make g++ && \
    npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN pnpm build

# ============================================
# Stage 2: Runtime
# ============================================
FROM node:18-alpine AS runtime

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod && \
    pnpm cache clean

# Copy built application from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Create upload directory
RUN mkdir -p /app/public/uploads && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Run with dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["pnpm", "start"]

# ============================================
# Build Labels
# ============================================
LABEL org.opencontainers.image.title="Unified Athlete Platform"
LABEL org.opencontainers.image.description="Production-ready athlete management platform"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created="2026-02-04"
