# Multi-stage build: generate llms.txt with Node, build the site with Zola,
# then serve the static output with static-web-server.
#
# This is the Dokploy/self-hosted deployment path. It's independent of the
# Cloudflare Pages path (`npm run deploy` / wrangler.toml) - that stays in
# place as an option, this doesn't replace it.

FROM node:22-slim AS llms
WORKDIR /project
COPY . .
RUN node scripts/generate-llms.mjs

FROM ghcr.io/getzola/zola:v0.23.1 AS zola
WORKDIR /project
COPY . .
COPY --from=llms /project/static/llms.txt static/llms.txt
RUN ["/zola", "build"]

FROM ghcr.io/static-web-server/static-web-server:2
COPY --from=zola /project/public /public
EXPOSE 80
