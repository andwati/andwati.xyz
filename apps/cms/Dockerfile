# Production image for the Strapi CMS. Multi-stage: install deps, build the
# admin panel, then copy only the built output + prod node_modules into the
# runtime layer.
#
# Build context must be the repo root (pnpm workspace root), e.g.:
#   docker build -f apps/cms/Dockerfile -t andwati-cms .

FROM node:24-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
# better-sqlite3 needs to compile if no prebuilt binary matches the platform.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/site/package.json apps/site/package.json
COPY apps/cms/package.json apps/cms/package.json
RUN pnpm install --frozen-lockfile --filter cms

FROM deps AS build
ENV NODE_ENV=production
COPY apps/cms apps/cms
RUN pnpm --filter cms build

FROM base AS runtime
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/cms /app/apps/cms
COPY --chmod=755 apps/cms/docker-entrypoint.sh /usr/local/bin/andwati-cms-entrypoint
WORKDIR /app/apps/cms
EXPOSE 1337
ENTRYPOINT ["andwati-cms-entrypoint"]
