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
      all three content types (writings, portfolio, bookshelf) — **blocked
      on the design system**: `scripts/generate-og-images.mjs` is hard-coded
      to the old "CASE FILE" hacker-terminal branding being fully replaced;
      building this now would just be redone once the new visual identity
      lands
- [x] `llms.txt` generation extended to cover all content types — unblocked
      once `site.config.ts` existed (built above for feeds/meta anyway):
      `scripts/generate-llms.astro-site.mjs` reads all four content
      directories directly, wired into `apps/site`'s build script

## Design system

- [x] New typography scale + color system — dark-first (warm near-black,
      cream text, coral accent) with a warm-paper light mode;
      Fraunces (display/italic) + Newsreader (body) + JetBrains Mono
      (nav/meta/code), fluid clamp() type scale. `src/styles/tokens.css`.
      Referenced pixperk.tech and mcyoung.xyz — see the commit for specifics
- [x] Motion primitives: CSS + native Web Animations API spring utility —
      `apps/site/src/lib/spring.ts` (damped-oscillator keyframes,
      `prefers-reduced-motion` aware). Not wired into any component yet —
      the Three.js centerpiece below is the natural first user
- [x] Base layout/components replacing the placeholder `Base.astro` — real
      header/nav with active-link state, theme toggle, footer with social
      links. Verified light + dark in-browser across home, a writing
      detail page (TOC/headings), bookshelf, and 404
- [x] Homepage redesign around the Three.js centerpiece as hero — the
      constellation sits above a 3-column dashboard (latest writings,
      portfolio, bookshelf), verified rendering and hover/click working
      in-browser
- [x] New 404 page concept (terminal easter egg retired) — "Page Fault",
      now fully styled with the rest of the design system

## Three.js centerpiece

- [x] Constellation data model: nodes are real content entries (writings,
      portfolio, bookshelf), edges are shared-tag connections — the same
      relationship "related posts" already uses, drawn instead of listed.
      No decorative/fake data. `src/lib/constellation-data.ts`
- [x] Built as an isolated component (`Constellation.astro` + a plain
      client `<script>` module, no framework), fibonacci-sphere layout,
      hover raycasting with a title tooltip, click-through to the entry
- [x] Fallback for `prefers-reduced-motion` (skips rotation/entrance
      animation) and no-WebGL (`supportsWebGL()` check hides the canvas
      entirely, falls back to a `<noscript>`-style plain count)
- [ ] Perf budget check on a low-end/mobile profile — not yet measured

## Content features carried over from the Zola site

- [x] Series-nav (multi-part post series) — `writings/[...slug].astro`,
      uses the existing `extra.series`/`extra.series_index` fields
- [x] Table of contents — inline only, no separate sidebar layout yet (that's
      a design-system concern); heading ids + `headings` metadata now flow
      through `toml-content-loader.ts` so `render(entry)` exposes them
- [x] Prev/next post navigation
- [x] Related posts (tag-based, tag-overlap ranked, limit 3)
- [x] Per-tag descriptions on tag archive pages — `/tags/` + `/tags/[tag]/`,
      descriptions ported from `zola.toml`'s `[extra.tag_descriptions]`
- [x] `llms_description` meta (site-wide default in `site.config.ts` +
      per-post override, rendered as `<meta name="description">` in
      `Base.astro`)
- [x] RSS/JSON feeds — `/rss.xml`, `/feed.json`
- [x] Sitemap + robots.txt — `@astrojs/sitemap`, static `public/robots.txt`

## Search & comments

- [x] Pagefind integration — indexes the build output (`pnpm build` runs
      `astro build && pagefind --site dist`), `/search/` page using
      Pagefind's default UI; verified with a real query in a browser
- [ ] Webmentions integration (replacing Utterances) — **plumbing only**:
      `Base.astro` links `rel="webmention"` to a webmention.io endpoint for
      `andwati.com`, but nothing displays received mentions yet, and the
      endpoint won't receive anything until the domain is actually
      registered/verified on webmention.io (**needs your input**: create an
      account, verify domain ownership, then I can build the display side)

## Analytics

- [ ] Stand up Plausible or Umami on the Dokploy host, wire up tracking
      snippet (replacing Google Analytics) — **needs your input**: requires
      your Dokploy access, not something I can provision from the repo

## Migration from the legacy Zola site

- [x] Script/process to convert `content/posts/*.md` into the new
      `content/writings/` schema — `scripts/migrate-posts-to-writings.mjs`,
      additive only (`content/posts/` untouched), re-runnable/idempotent.
      2 of 20 posts (`from-c-to-machine-code`,
      `self-hosting-gitea-and-mirroring-github`) use note/tip/warning/danger
      callout shortcodes with no Astro equivalent yet — flagged by the
      script, needs a real component once the design system exists
      (**not blocking**, just noted for later)
- [x] Preserve slugs/URLs via redirects — the script generates 301s from
      `/posts/<slug>/` to `/writings/<slug>/` into `sws.toml`, idempotently
- [ ] Migrate `content/archive/`, `content/about.md` equivalents — holding
      off: the Astro site doesn't have archive/about pages built yet, and
      "about" copy/framing is exactly the kind of thing you'd want to
      review/rewrite for the new "digital legacy" identity, not port as-is
- [ ] Verify RSS subscribers and inbound links survive the cutover — can
      only really be checked once this is deployed live (**needs your
      input**: this is a production-cutover verification, not a build-time
      one)

## Infra / deployment

- [ ] Wire Strapi into the Dokploy deployment alongside the Astro build —
      **needs your input**: requires your Dokploy access
- [ ] Decide build trigger: webhook on Strapi publish → CI rebuild, vs.
      manual/scheduled rebuild — **needs your input**: your call, not an
      engineering constraint either way
- [ ] Update `Dockerfile`/`sws.toml` for the new build output (currently
      Zola-specific) — holding off until the migration/cutover is actually
      ready to ship, so this doesn't drift out of sync in the meantime

## Cleanup

- [ ] Remove Zola-specific files (`zola.toml`, `templates/`, `sass/`,
      `themes/`, `content/posts/`, legacy OG/llms scripts) once each has a
      working Astro/Strapi equivalent — progressively, not all at once
