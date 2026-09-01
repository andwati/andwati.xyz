# Dokploy deployment

The production deployment is one Dokploy Compose application with two
services:

- `site` builds the Astro app and serves its static output with
  `static-web-server`.
- `cms` runs Strapi with persistent SQLite/admin data and a persistent Git
  checkout.

Markdown remains the source of truth. A Strapi edit writes into the checkout,
commits and pushes the changed Markdown (plus a generated bookshelf cover when
applicable), then calls Dokploy's deploy webhook. The redeploy builds Astro
from that new commit.

## GitHub token

Create a fine-grained personal access token restricted to the
`andwati/andwati.com` repository with:

- Repository contents: read and write
- Metadata: read (automatically included)

The configured publishing branch must accept direct pushes from the token.
Store the token only in Dokploy as `GITHUB_TOKEN`.

## Dokploy application

1. Create a Compose application from this repository and select
   `docker-compose.prod.yml`.
2. Configure its source branch to match `CONTENT_GIT_BRANCH` (normally
   `main`).
3. Route the public site domain to the `site` service on port `80`.
4. Route the CMS domain (for example `cms.andwati.com`) to the `cms` service
   on port `1337`.
5. Copy the application's deploy webhook URL into
   `DOKPLOY_DEPLOY_WEBHOOK_URL`.
6. Add the environment variables below and deploy.

Required secrets:

```dotenv
CMS_PUBLIC_URL=https://cms.andwati.com
APP_KEYS=<four comma-separated random values>
API_TOKEN_SALT=<random value>
ADMIN_JWT_SECRET=<random value>
TRANSFER_TOKEN_SALT=<random value>
JWT_SECRET=<random value>
ENCRYPTION_KEY=<random value>
GITHUB_TOKEN=<fine-grained GitHub token>
DOKPLOY_DEPLOY_WEBHOOK_URL=<Dokploy Compose deploy webhook>
```

Optional publishing settings:

```dotenv
CONTENT_GIT_REPOSITORY=andwati/andwati.com
CONTENT_GIT_BRANCH=main
CONTENT_GIT_COMMIT_NAME="andwati.com CMS"
CONTENT_GIT_COMMIT_EMAIL=andwati-cms@users.noreply.github.com
```

Generate each random secret independently; do not reuse the local development
values from `docker-compose.yml`.

## Persistent data

The production Compose file declares three named volumes:

- `cms_database` keeps Strapi's admin users, API tokens, and SQLite cache.
- `cms_uploads` keeps files uploaded through Strapi.
- `content_checkout` keeps the Git working tree used for publishing.

Back up `cms_database` and `cms_uploads`. The content checkout is recoverable
from Git, but retaining it protects an edit if the process stops between the
filesystem write and Git push.

On startup, the CMS fast-forwards a clean checkout to the configured branch.
If it finds uncommitted files, it preserves them and starts without pulling so
an interrupted edit is not overwritten. Resolve and push those files from the
volume before forcing a reset.

## Local validation

Provide temporary values for required interpolation variables, then validate
the production manifest:

```sh
docker compose --env-file .env.production \
  -f docker-compose.prod.yml config
docker compose --env-file .env.production \
  -f docker-compose.prod.yml build
```

The existing `docker-compose.yml` remains the local Strapi development setup.
