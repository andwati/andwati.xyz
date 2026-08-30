# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal blog (andwati.com — "Thoughts and Musings") built with [Zola](https://www.getzola.org/), a Rust-based static site generator. All templates, styles, and content are custom (no external theme is used — `themes/` is empty).

## Commands

- `zola build` (or `make build`) — build the site into `public/`
- `zola serve` (or `make serve`) — serve locally with live reload
- `make clean` — remove `public/`
- `make all` — clean + build
- `./bin/update-zola` — checks the installed Zola version against the latest GitHub release and offers to install it into `~/.cargo/bin`
- `node scripts/validate-post.mjs` — validates staged post front-matter (run as a pre-commit hook); checks kebab-case filenames and required `title`/`date` TOML front-matter fields

There is no JS/CSS build tooling beyond Zola itself: `compile_sass = true` in `zola.toml` means Sass under `sass/` is compiled directly by Zola.

Deployment is self-hosted via Dokploy: `Dockerfile` builds the site with Zola and serves `public/` with `static-web-server`, configured by `sws.toml` (security headers, redirects) at the image's working directory root.

## Content structure

- Posts live in `content/posts/`, either as a single `.md` file (`content/posts/my-post.md`) or as a directory with `index.md` (`content/posts/my-post/index.md`) when a post has co-located assets.
- Front matter is TOML (`+++ ... +++`), e.g.:
  ```
  +++
  title = "..."
  description = "..."
  author = "andwati"
  date = YYYY-MM-DD
  [taxonomies]
  tags = ["..."]
  +++
  ```
- `tags` is the only taxonomy (`taxonomies = [{ name = "tags" }]` in `zola.toml`).
- `content/archive/_index.md`, `content/about.md`, `content/_index.md` are standalone pages.
- Custom shortcodes available in post bodies: `note`, `tip`, `warning`, `danger` (callout boxes, see `templates/shortcodes/`) and `youtube(id="...")`.

## Templates & styling

- `templates/base.html` is the root layout; page-type templates (`index.html`, `page.html`, `posts.html`, `taxonomy_list.html`, `taxonomy_single.html`, `archive.html`, `404.html`) extend it.
- `templates/partials/` holds reusable fragments (header, footer, profile, post-card, post-nav, series-nav, related-posts, toc/toc-sidebar, comments, social-share).
- `templates/feed.json`, `templates/rss.xml`, `templates/sitemap.xml`, `templates/robots.txt` are generated-output templates driven by the `generate_feeds`/`generate_robots_txt` settings in `zola.toml`.
- Sass is split by concern in `sass/` (`_layout`, `_header`, `_footer`, `_hero`, `_article`, `_typography`, `_theme`, `_search`, `_variables`, `_utilities`, `_transitions`, `_404`, `_scroll-top`, `_feed`) and assembled via `sass/main.scss`.
- Site supports light/dark theme toggling (`enable_theme_toggle`) and full-text search (`enable_search`, `build_search_index = true`) — search index and theme logic live in the corresponding JS under `static/js/` and Sass partials above.

## Site configuration

All site-wide behavior/config (analytics, author/profile info, social links, nav menu, Utterances comment settings, search, related posts, the 404 terminal-themed easter egg) is centralized in `zola.toml` under `[extra]`. Check there before hardcoding values in templates.

## Astro/Strapi migration (in progress, `astro-migration` branch)

The site is being rebuilt as a pnpm workspace with two apps: `apps/site` (Astro) and `apps/cms` (Strapi, SQLite-backed). Package management is **pnpm only** (no npm/yarn) and linting/formatting is **Biome** (`pnpm lint`, `pnpm lint:fix`) — not ESLint/Prettier. Markdown files under `content/` remain the canonical source of truth; Strapi is an editing UI over them, not the source of record. The existing Zola site (`zola.toml`, `templates/`, `sass/`, `content/posts/` etc.) stays in place until migration is complete — remove Zola-specific files progressively as their Astro/Strapi equivalents land, not all at once.

## Agent skills

`.agents/skills/` contains pulled-in skills (`animation-vocabulary`, `emil-design-eng`, `review-animations`) tracked via `skills-lock.json`, useful for UI/animation review and design-engineering guidance when touching templates or Sass.

## Git commits

Never add `Co-Authored-By: Claude` (or any other Claude/Anthropic self-attribution) to commit messages or pull request descriptions/titles. Write commit messages and PRs as if authored solely by the user.

Commit regularly: after each successful, working step (not just at the end of a task), so history stays granular and revertible.