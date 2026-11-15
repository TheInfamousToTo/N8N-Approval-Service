# Build stage for frontend (use build platform for speed)
FROM --platform=$BUILDPLATFORM node:24-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Build stage for backend (use build platform for speed)
FROM --platform=$BUILDPLATFORM node:24-alpine AS backend-build

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source files
COPY src ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Production stage - use Debian-based image to avoid Alpine QEMU issues
FROM node:24-trixie-slim AS production

WORKDIR /app

# Install dumb-init and required packages
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    dumb-init \
    openssl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash nodejs

# Copy package files and install production dependencies only
COPY package*.json ./
# npm is not needed at runtime: the prisma CLI is a local dependency and is
# run from node_modules/.bin. Removing npm drops its bundled dependencies,
# which made up most of the node-pkg findings in the nightly Trivy scan.
RUN npm install --omit=dev \
    && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Copy prisma schema and generated client
COPY --from=backend-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma/

# Copy built backend
COPY --from=backend-build /app/dist ./dist

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Use dumb-init as entrypoint
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/index.js"]
