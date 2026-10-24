# Build stage
# Node 24.22.1 fixes the October 2026 security releases (HIGH severity:
# Brotli decoder OOB write, TLS hostname bypasses, dns.resolve NUL truncation).
# See https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
FROM node:26.12.0-alpine AS builder

WORKDIR /app

# Copy package files and workspace package.json files
COPY package.json package-lock.json* ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Reproduce the committed workspace dependency graph (--ignore-scripts skips the prepare hooks).
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the backend
RUN npm run build --workspace=server

# Build the frontend
RUN npm run build --workspace=web

# Production stage
FROM node:26.12.0-alpine

WORKDIR /app

# Install runtime dependencies from the committed workspace lockfile so the image
# matches the tested dependency graph. Resolving fresh can drift to newer
# releases whose peer ranges conflict with the pinned ones.
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
RUN npm ci --omit=dev --ignore-scripts --workspace=server

# Copy built application into its workspace. npm can install workspace
# dependencies into apps/server/node_modules instead of hoisting them to the
# root (TanStack AI 1.0 does this), so the compiled code has to stay under
# apps/server for Node's resolution to find them.
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Copy the built frontend to public directory
COPY --from=builder /app/apps/web/dist ./public

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

# Fail the build if the compiled runtime graph cannot resolve its imports.
# A successful `npm ci` is not enough: a missing package only shows up when
# Node actually loads the module at startup. The placeholder env values only
# satisfy import-time validation and are scoped to this RUN command.
RUN DISCORD_CLIENT_ID=build-check \
    DISCORD_CLIENT_SECRET=build-check \
    CORS_ORIGIN=http://build-check.invalid \
    node --input-type=module -e "await import('./apps/server/dist/src/index.js'); await import('./apps/server/dist/src/lib/suggestion-queue.js')"

CMD ["sh", "-c", "node apps/server/dist/src/db/migrate.js && exec node apps/server/dist/src/start.js"]
