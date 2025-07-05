# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build the backend
RUN cd apps/server && bun run build

# Build the frontend
RUN cd apps/web && bun run build

# Production stage
FROM oven/bun:1-alpine

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy the built frontend to public directory
COPY --from=builder /app/apps/web/dist ./public

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "dist/src/index.js"] 