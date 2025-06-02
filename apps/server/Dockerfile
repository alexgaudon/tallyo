# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY apps/server/package.json ./apps/server/
COPY packages/ ./packages/

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build the application
RUN cd apps/server && bun run build

# Production stage
FROM oven/bun:1-alpine

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "dist/src/index.js"] 