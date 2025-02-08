# Base image
FROM node:22 AS base

WORKDIR /usr/src/app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Install dependencies in a temporary development environment
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json pnpm-lock.yaml /temp/dev/
WORKDIR /temp/dev
RUN pnpm install --frozen-lockfile

# Install production dependencies
RUN mkdir -p /temp/prod
COPY package.json pnpm-lock.yaml /temp/prod/
WORKDIR /temp/prod
RUN pnpm install --frozen-lockfile --prod

# Build the application
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN pnpm run build

# Prepare the final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=build /usr/src/app/.output ./output
COPY --from=build /usr/src/app/package.json .

USER node
EXPOSE 3000/tcp
ENTRYPOINT ["node", "output/server/index.mjs"]