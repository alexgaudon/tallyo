# Build stage
FROM node:24-alpine AS builder

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
FROM node:24-alpine

WORKDIR /app

# Install runtime dependencies from the committed workspace lockfile so the image
# matches the tested dependency graph. Resolving fresh can drift to newer
# releases whose peer ranges conflict with the pinned ones.
COPY package.json package-lock.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
RUN npm ci --omit=dev --ignore-scripts --workspace=server

# Put the server manifest at the image root so Node loads dist/ as ESM.
COPY --from=builder /app/apps/server/package.json ./package.json

# Copy built application
COPY --from=builder /app/apps/server/dist ./dist

# Copy the built frontend to public directory
COPY --from=builder /app/apps/web/dist ./public

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "node dist/src/db/migrate.js && exec node dist/src/start.js"]
