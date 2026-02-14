# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install dependencies (monorepo: install from root so workspaces resolve, or install per-app)
RUN cd apps/server && npm install
RUN cd apps/web && npm install

# Copy source code
COPY . .

# Build the backend
RUN cd apps/server && npm run build

# Build the frontend
RUN cd apps/web && npm run build

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy the built frontend to public directory
COPY --from=builder /app/apps/web/dist ./public

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/src/start.js"]
