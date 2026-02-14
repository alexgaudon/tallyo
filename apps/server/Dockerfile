# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files and workspace package.json files
COPY package.json package-lock.json* ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Single root install so workspace lockfile and hoisting match local (--ignore-scripts skips husky)
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Build the backend
RUN npm run build --workspace=server

# Build the frontend
RUN npm run build --workspace=web

# Production stage
FROM node:24-alpine

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts

# Copy the built frontend to public directory
COPY --from=builder /app/apps/web/dist ./public

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/src/start.js"]
