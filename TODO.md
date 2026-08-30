# Astro + Strapi Rebuild — TODO

Tracking doc for the `astro-migration` branch. See the locked spec in the
approved plan for full rationale on each decision referenced below.

## Done

- [x] Scaffold pnpm workspace (`apps/site` Astro, `apps/cms` Strapi + SQLite)
- [x] Switch tooling to pnpm-only, add Biome for lint/format
- [x] Define shared `content/` schema (writings, portfolio, bookshelf, blogs)
      with TOML frontmatter matching the legacy Zola format
- [x] Bookshelf schema covers both books (ISBN) and papers (DOI/arXiv id)
- [x] Custom Astro content loader parsing `+++` TOML frontmatter directly
      (no YAML conversion step)
- [x] Basic list/detail pages for all four content types, verified running
      end-to-end in-browser (`pnpm --filter site dev`)
- [x] CLAUDE.md updated: no agent self-attribution in commits/PRs, commit
      regularly after each working step
- [x] Strapi content-type definitions matching the `content/` schema exactly
      (writings, portfolio, bookshelf, blogs) — verified boots and registers
      all four REST routes
- [x] `apps/cms/Dockerfile.dev` + root `docker-compose.yml` for running
      Strapi locally in a container (node:24-bookworm-slim, matches local
      Node version); `apps/cms/Dockerfile` production multi-stage build for
      later Dokploy deployment. Verified: builds, boots, admin panel and API
      reachable, shared `content/` volume mounted at the right relative path

## Content pipeline

- [x] Strapi custom provider/lifecycle hooks that read + write the same
      Markdown files in `content/` (Strapi's DB stays a disposable cache) —
      `apps/cms/src/utils/content-{file,sync}.ts`, wired in `src/index.ts`
- [x] Verify round-trip: edit in Strapi admin → file on disk updates, and
      vice versa, without drift — verified create/update/delete via the
      content-manager API, plus idempotent re-import across a restart
- [x] Bookshelf ISBN lookup hook with local cover caching —
      `apps/cms/src/utils/bookshelf-covers.ts` fetches from Open Library by
      ISBN and caches into `apps/site/public/covers/`; verified end-to-end
      (real cover downloaded, `cover_image` synced to file, cleaned up on
      delete)
- [x] Bookshelf paper lookup hook — Semantic Scholar backfills title/authors
      by DOI/arXiv id when missing. No cover/thumbnail: neither Semantic
      Scholar nor arXiv offers a reliable image source for papers, so
      `cover_image` stays manually-set for papers (or gets one later from
      the OG-image pipeline below)
- [ ] OG image auto-generation extended from the legacy per-post script to
      all three content types (writings, portfolio, bookshelf)
- [ ] `llms.txt` generation extended to cover all content types, not just
      posts

## Design system

- [ ] New typography scale + color system (full reset, not inherited from
      `sass/_theme.scss`)
- [ ] Motion primitives: CSS + native Web Animations API spring utility
- [ ] Base layout/components replacing the placeholder `Base.astro`
- [ ] Homepage redesign around the Three.js centerpiece as hero
- [ ] New 404 page concept (terminal easter egg retired)

## Three.js centerpiece

- [ ] Decide the constellation/node-graph data model (what nodes/edges
      represent — writings ↔ portfolio ↔ beliefs connections)
- [ ] Build as an isolated Astro island
- [ ] Static image/CSS fallback for `prefers-reduced-motion` and low-end
      devices
- [ ] Perf budget check on a low-end/mobile profile

## Content features carried over from the Zola site

- [ ] Series-nav (multi-part post series)
- [ ] Table of contents (inline + sidebar)
- [ ] Prev/next post navigation
- [ ] Related posts (tag-based)
- [ ] Per-tag descriptions on tag archive pages
- [ ] `llms_description` meta (site-wide + per-post override — schema
      already supports the override)
- [ ] RSS/JSON feeds
- [ ] Sitemap + robots.txt

## Search & comments

- [ ] Pagefind integration (static search index from the Astro build output)
- [ ] Webmentions integration (replacing Utterances) — decide self-hosted
      endpoint vs. webmention.io

## Analytics

- [ ] Stand up Plausible or Umami on the Dokploy host, wire up tracking
      snippet (replacing Google Analytics)

## Migration from the legacy Zola site

- [ ] Script/process to convert `content/posts/*.md` into the new
      `content/writings/` schema
- [ ] Preserve slugs/URLs or add redirects (mechanism TBD — Astro
      middleware vs. `static-web-server`/`sws.toml` rules)
- [ ] Migrate `content/archive/`, `content/about.md` equivalents
- [ ] Verify RSS subscribers and inbound links survive the cutover

## Infra / deployment

- [ ] Wire Strapi into the Dokploy deployment alongside the Astro build
- [ ] Decide build trigger: webhook on Strapi publish → CI rebuild, vs.
      manual/scheduled rebuild
- [ ] Update `Dockerfile`/`sws.toml` for the new build output (currently
      Zola-specific)

## Cleanup

- [ ] Remove Zola-specific files (`zola.toml`, `templates/`, `sass/`,
      `themes/`, `content/posts/`, legacy OG/llms scripts) once each has a
      working Astro/Strapi equivalent — progressively, not all at once
