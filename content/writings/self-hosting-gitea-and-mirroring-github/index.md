+++
title = "Self-Hosting Gitea and Automating GitHub Mirrors"
description = "Self-Hosting Gitea and Automating GitHub Mirrors (and Everything Cloudflare Broke Along the Way)"
date = 2026-08-19
draft = false

[taxonomies]
tags = [ "self-hosting", "gitea", "dokploy", "cloudflare", "github-actions", "bash" ]

+++

I run a Hetzner box with [Dokploy](https://docs.dokploy.com) for most of my personal infrastructure. I'd been meaning to get a self-hosted git server on it for a while, mainly so I have a durable mirror of my GitHub repos that doesn't depend on GitHub staying up, staying free, or staying interested in hosting my code. This is the log of actually doing it: what I picked, what broke, and the debugging trail for the parts that took longer than they should have.

Full script and workflow are on [github.com/andwati/gitea-mirror-sync](https://github.com/andwati/gitea-mirror-sync) if you want to skip straight to the code.

## Why not GitLab

GitLab CE was my first instinct. It's the "serious" self-hosted option, and Dokploy ships a template for it out of the box. But the omnibus image bundles Postgres, Redis, Sidekiq, Puma, Gitaly, Workhorse, and a Prometheus stack into a single container, with an official minimum of 4GB RAM. My box has 8GB total, already shared with a handful of other services. Giving GitLab half the machine just to get merge requests and a UI I mostly wouldn't use felt like the wrong trade.

Gitea is a single Go binary. Idle footprint is a few hundred MB against GitLab's multiple gigabytes, boot time is seconds instead of minutes, and there's no `trusted_proxies` CIDR guessing or five-minute health check grace periods to plan around. For a personal git server, it's the right-sized tool. The trade-off is CI maturity (Gitea Actions is newer than GitLab CI) and no built-in SAST/DAST scanning, neither of which I actually needed here.

## The stack

Gitea and Postgres, both in one Dokploy compose file, with everything pushed out to environment variables so the compose itself never needs touching again:

```yaml
services:
  gitea:
    image: docker.gitea.com/gitea:${GITEA_IMAGE_TAG}
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - USER_UID=${GITEA_USER_UID:-1000}
      - USER_GID=${GITEA_USER_GID:-1000}

      - GITEA__database__DB_TYPE=${GITEA_DB_TYPE}
      - GITEA__database__HOST=${GITEA_DB_HOST}:${POSTGRES_PORT}
      - GITEA__database__NAME=${POSTGRES_DB}
      - GITEA__database__USER=${POSTGRES_USER}
      - GITEA__database__PASSWD=${GITEA_DB_PASSWORD}

      - GITEA__server__DOMAIN=${GITEA_HOST}
      - GITEA__server__ROOT_URL=${GITEA_PROTOCOL:-https}://${GITEA_HOST}/
      - GITEA__server__HTTP_PORT=${GITEA_HTTP_PORT:-3000}
      - GITEA__server__PROTOCOL=${GITEA_INTERNAL_PROTOCOL:-http}
      - GITEA__server__DISABLE_SSH=true
      - GITEA__server__SSH_PORT=${GITEA_SSH_EXTERNAL_PORT:-2222}
      - GITEA__server__SSH_LISTEN_PORT=${GITEA_SSH_LISTEN_PORT:-22}
      - GITEA__server__REVERSE_PROXY_TRUSTED_PROXIES=${GITEA_TRUSTED_PROXIES:-172.16.0.0/12,10.0.0.0/8}

      - GITEA__mailer__ENABLED=${GITEA_MAILER_ENABLED:-true}
      - GITEA__mailer__PROTOCOL=${GITEA_MAILER_PROTOCOL:-smtp+starttls}
      - GITEA__mailer__SMTP_ADDR=${GITEA_MAILER_SMTP_ADDR:-smtp.gmail.com}
      - GITEA__mailer__SMTP_PORT=${GITEA_MAILER_SMTP_PORT:-587}
      - GITEA__mailer__USER=${GMAIL_ADDRESS}
      - GITEA__mailer__PASSWD=${GMAIL_APP_PASSWORD}
      - GITEA__mailer__FROM=${GITEA_MAILER_FROM:-${GMAIL_ADDRESS}}

      - GITEA__mirror__ENABLED=${GITEA_MIRROR_ENABLED:-true}
      - GITEA__mirror__DEFAULT_INTERVAL=${GITEA_MIRROR_DEFAULT_INTERVAL:-8h}
      - GITEA__mirror__MIN_INTERVAL=${GITEA_MIRROR_MIN_INTERVAL:-10m}

      - GITEA__packages__ENABLED=${GITEA_PACKAGES_ENABLED:-true}

      - GITEA__service__DISABLE_REGISTRATION=${GITEA_DISABLE_REGISTRATION:-true}
      - GITEA__service__REQUIRE_SIGNIN_VIEW=${GITEA_REQUIRE_SIGNIN_VIEW:-false}
      - GITEA__other__SHOW_FOOTER_VERSION=false
    volumes:
      - gitea-data:/data
    ports:
      - "${GITEA_SSH_EXTERNAL_PORT:-2222}:${GITEA_SSH_LISTEN_PORT:-22}"
    expose:
      - "${GITEA_HTTP_PORT:-3000}"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:${GITEA_HTTP_PORT:-3000}/api/healthz"]
      interval: ${GITEA_HEALTHCHECK_INTERVAL:-15s}
      timeout: ${GITEA_HEALTHCHECK_TIMEOUT:-5s}
      retries: ${GITEA_HEALTHCHECK_RETRIES:-10}
      start_period: ${GITEA_HEALTHCHECK_START_PERIOD:-30s}

  postgres:
    image: docker.io/library/postgres:${POSTGRES_IMAGE_TAG:-17-alpine}
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${GITEA_DB_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - pg-data:/var/lib/postgresql/data
    expose:
      - "${POSTGRES_PORT}"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: ${POSTGRES_HEALTHCHECK_INTERVAL:-10s}
      timeout: ${POSTGRES_HEALTHCHECK_TIMEOUT:-5s}
      retries: ${POSTGRES_HEALTHCHECK_RETRIES:-5}

volumes:
  gitea-data: {}
  pg-data: {}
```

The GitHub Actions workflow that runs the mirror script:

```yaml
name: Mirror GitHub repos to Gitea

on:
  schedule:
    # Runs at 00:00 UTC daily. Midnight EAT (UTC+3) would be "0 21 * * *" the day before.
    - cron: "0 0 * * *"
  workflow_dispatch:
    inputs:
      debug_http:
        description: "Print request/response headers for every Gitea write call"
        type: boolean
        default: false

jobs:
  mirror:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout (for the script)
        uses: actions/checkout@v5

      - name: Install jq
        run: sudo apt-get update && sudo apt-get install -y jq

      # The mirror runs from a GitHub-hosted runner, not the network I usually test from,
      # so it can hit Gitea through a different proxy path than my laptop does. This POSTs
      # a harmless JSON body and reports whether Content-Type survived the trip. A 422
      # "Empty Content-Type" here means something between the runner and Gitea is dropping
      # the header, not that the mirror payload itself is wrong.
      - name: Preflight - can this runner POST JSON to Gitea?
        env:
          GITEA_URL: ${{ secrets.GITEA_URL }}
          GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
        run: |
          url="${GITEA_URL%/}"
          echo "GET /api/v1/version -> $(curl -s -o /dev/null -w '%{http_code}' \
            -H "Authorization: token ${GITEA_TOKEN}" "${url}/api/v1/version")"
          for proto in --http2 --http1.1; do
            code=$(curl -s $proto -o /tmp/pre.json -w '%{http_code}' \
              -X POST "${url}/api/v1/markdown" \
              -H "Authorization: token ${GITEA_TOKEN}" \
              -H "Content-Type: application/json" \
              -H "Expect:" \
              --data-binary '{"text":"preflight","mode":"markdown"}')
            echo "POST /api/v1/markdown ${proto} -> ${code}"
            [ "$code" = "200" ] || head -c 300 /tmp/pre.json; echo
          done

      - name: Mirror all repos to Gitea
        env:
          GITHUB_TOKEN: ${{ secrets.GH_PAT }}
          GITEA_URL: ${{ secrets.GITEA_URL }}
          GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
          GITEA_OWNER: ${{ secrets.GITEA_OWNER }}
          DEBUG_HTTP: ${{ inputs.debug_http && '1' || '' }}
        run: ./mirror-github-to-gitea.sh
```

A few decisions worth explaining.

**SSH on 2222, not 22.** The host's own sshd already owns port 22, so Gitea's internal SSH got mapped to 2222, with [`SSH_PORT`](https://docs.gitea.com/administration/config-cheat-sheet/) set to match so Gitea generates correct clone URLs.

{% <note> %}
I later set `GITEA__server__DISABLE_SSH=true` (see [`DISABLE_SSH`](https://docs.gitea.com/administration/config-cheat-sheet/) in Gitea's config cheat sheet) and dropped the port mapping entirely. Cloudflare's proxy only forwards HTTP and HTTPS traffic, not arbitrary TCP, so SSH on 2222 was simply unreachable once `gitea.andwati.com` sat behind the orange cloud. The two ways around that were a DNS-only subdomain, which leaks the origin IP to anyone who runs `dig`, or a Cloudflare Tunnel, which is more moving parts than a personal git server's SSH clone was worth. HTTPS clone already worked fine through the proxy, so disabling SSH was the simpler trade.
{% </note> %}

**Traefik/Dokploy terminates TLS, Gitea speaks plain HTTP internally.** [Dokploy's domain manager](https://docs.dokploy.com/docs/core/domains) handles the Let's Encrypt cert and routes to the container on port 3000. `REVERSE_PROXY_TRUSTED_PROXIES` is set so Gitea trusts the forwarded headers instead of thinking every request comes from the internal Docker network.

**Mail via Gmail SMTP**, gated behind an App Password since Google dropped plain password auth for SMTP a while back.

**Everything as env vars with sane defaults**, so the only things I actually type into Dokploy per deploy are the domain, the DB password, and the mail credentials.

## Token scopes

Two tokens drive the mirror script, and both need to be scoped correctly or the migrate call fails in ways that look unrelated to permissions.

### **GitHub token (`GH_PAT`).** 
A classic Personal Access Token with the `repo` scope, generated at [github.com/settings/tokens](https://github.com/settings/tokens). This is the scope GitHub's own docs point to for reading private repositories, and it's also what Gitea's own migration guide recommends when the source is GitHub. A fine-grained token works too, provided it has read access to Contents and Metadata across all the repos you want mirrored, but classic `repo` is simpler to reason about for a personal account with dozens of repos rather than picking them one by one.

### **Gitea token (`GITEA_TOKEN`).** 
Needs the `write:repository` scope, generated from your Gitea instance at Settings → Applications → Generate New Token (`https://<your-gitea-domain>/user/settings/applications`). `write:repository` covers both the `/repos/migrate` call that creates new mirrors and the `PATCH` call the script uses to sync visibility on existing ones. `read:repository` alone isn't enough since both of those are write operations.

### **Where they get set.** 
Both live as encrypted secrets on the `gitea-mirror-sync` repo, not in the script or the workflow file: Settings → Secrets and variables → Actions → New repository secret, alongside `GITEA_URL` and `GITEA_OWNER`. The workflow references them only as `${{ secrets.GH_PAT }}` and `${{ secrets.GITEA_TOKEN }}`, so neither value is ever visible in a log or checked into the repo itself.

## Bot Fight Mode: the wall you can't route around

The bot-challenge problem looked like a quick fix at first. Add a WAF custom rule that matches the hostname and skips security checks: Bot Fight Mode, managed rules, browser integrity check, all of it. That got a plain `curl` from my own machine through cleanly. It did nothing for the GitHub Actions runner, which kept getting served a JS challenge page on every write request.

The reason turned out to be a real platform limit, not a rule I'd written wrong. Cloudflare's free-tier [Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/) doesn't run on the Ruleset Engine at all. It's a separate evaluation pipeline where `Skip`, `Bypass`, and `Allow` actions have no effect. Only Super Bot Fight Mode, which needs a Pro plan, runs on the Ruleset Engine and actually respects skip rules. On Free there's no way to carve out an exception for a specific host or path. It's off or it's on for the whole zone.

For a git server whose traffic is almost entirely programmatic (API calls, `git clone`, CI runs, registry pushes), Bot Fight Mode was fighting the exact use case the server exists for. I turned it off zone-wide (Security → Settings → Bot traffic) rather than pay for Pro just to get a skip rule that would only ever have applied to this one subdomain anyway.

## The 422 that took a while to track down

With Cloudflare out of the way, the mirror script started reaching Gitea and immediately failed every single repo with:

```
{"message":"[]: Empty Content-Type","url":".../api/swagger"}
```

`Content-Type: application/json` was set explicitly on every `curl` call, so the error made no sense at first glance. The actual cause was structural. The migrate request was built with `curl -d @- <<EOF ... EOF` inside a `while read` loop that was itself fed by a pipe: `jq ... | while read -r entry; do ... done`. The loop's own `read` and curl's `-d @-` were both drawing from the same stdin, and the heredoc body wasn't landing in the request the way it should have on paper.

The fix was to stop routing anything through stdin inside the loop:

- Build the JSON payload with `jq -n` into a file instead of a heredoc, so there's no ambiguity about where the body comes from.
- Switch the loop from a pipe into process substitution, `done < <(...)`, so the loop body never shares stdin with anything running inside it.
- Send the body with `--data-binary "@file"` instead of `-d @-`.

That fixed it, but chasing it down surfaced a second, sneakier failure mode worth guarding against for good: a secret pasted into a GitHub Actions secret with a trailing newline. If a token has a trailing `\n`, curl writes `Authorization: token <value>\n`, and that bare newline terminates the header block early. Every header written after it, `Content-Type` included, lands in the request body instead of staying a header. GETs survive this because nothing they need comes after `Authorization`. Writes don't. The final version of the script trims all four credentials on load, warns if any of them needed trimming, and falls back to retrying over HTTP/1.1 if a write still comes back with "Empty Content-Type," since some reverse proxies handle HTTP/2 header framing differently than HTTP/1.1.

## What the script does now

It pages through `/user/repos` on GitHub, not the public-only `/users/{user}/repos`, so private repos are included. For each one:

- **Doesn't exist in Gitea yet** → migrates it as a pull mirror, matching GitHub's visibility (`private` flows straight through).
- **Already mirrored, visibility has drifted** → `PATCH`es the Gitea repo to match GitHub's current visibility. Covers the case where a repo gets made private on GitHub after the mirror was first created.
- **Already mirrored, visibility matches** → no-op.

It also picked up an `ONLY=<repo-name>` escape hatch for smoke-testing one repo before running the whole account through it, and a `DEBUG_HTTP=1` flag that dumps redacted request and response headers when something's misbehaving.

The [workflow](https://github.com/andwati/gitea-mirror-sync/blob/main/.github/workflows/mirror-to-gitea.yml) runs it daily on a [cron schedule](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule), with a `workflow_dispatch` trigger for manual runs, plus a preflight step that POSTs a harmless request to Gitea's markdown-render endpoint first and reports whether `Content-Type` survived the trip. If Cloudflare or the proxy chain ever regresses again, the workflow fails fast on the preflight instead of quietly mangling every repo migration.

## Takeaways

- **Resource-match the tool to the box.** GitLab is the obvious choice and the wrong one for an 8GB personal server running other things too. Gitea's footprint fits reality.
- **Cloudflare's proxy has real, non-obvious interactions with anything that isn't a browser.** TLS issuance and bot protection both assume the traffic model is "human on a webpage." A git server's actual traffic model is closer to machine talking to machine, on a schedule, indefinitely.
- **Free-tier Bot Fight Mode is not configurable, full stop.** If your infrastructure sees more API and CI traffic than browser traffic, know going in that the free bot protection can't be scoped down. It's off or it's Pro.
- **Heredocs and piped `while read` loops don't mix well when something inside the loop also wants stdin.** Process substitution sidesteps the whole category of bug.
- **Trim your secrets.** A trailing newline in a pasted token is invisible in every UI that shows it back to you, and it will produce an error message that points nowhere near the actual cause.
