# Build stage
# Node 24.22.1 fixes the October 2026 security releases (HIGH severity:
# Brotli decoder OOB write, TLS hostname bypasses, dns.resolve NUL truncation).
# See https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
FROM node:24.22.1-alpine AS builder

ARG VITE_SERVER_URL=http://localhost:3000
ENV VITE_SERVER_URL=${VITE_SERVER_URL}

# Optional build identifier (e.g. short git SHA) injected by the build runner.
ARG GIT_COMMIT=
ENV VITE_GIT_COMMIT=${GIT_COMMIT}

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN cd apps/web && npm install

# Copy source code
COPY . .

# Build the application
RUN cd apps/web && npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
