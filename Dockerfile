# Production image for the Astro site. Build from the workspace root:
#   docker build -t andwati-site .

FROM node:24-bookworm-slim AS build
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/site/package.json apps/site/package.json
COPY apps/cms/package.json apps/cms/package.json
COPY apps/site apps/site
COPY content content
COPY scripts scripts
RUN pnpm install --frozen-lockfile --filter andwati-com --filter site
RUN pnpm --filter site build

FROM ghcr.io/static-web-server/static-web-server:2
COPY --from=build /app/apps/site/dist /public
COPY sws.toml /sws.toml
EXPOSE 80
