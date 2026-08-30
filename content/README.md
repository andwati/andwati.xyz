# content/

This directory is the canonical source of truth for all site content. It is
shared between `apps/site` (Astro reads it directly at build time) and
`apps/cms` (Strapi's custom provider reads/writes these same files — its
SQLite database is only a disposable cache/index, never the source of
record). The site must always be buildable straight from this directory with
Strapi entirely absent.

Frontmatter is TOML (`+++ ... +++`), matching the legacy Zola posts under
`content/posts/` to ease migration. Each content type below is one file (or a
directory with `index.md` for entries with co-located assets), one frontmatter
schema.

## `writings/` (blog / essays)

```toml
+++
title = "..."
description = "..."
author = "andwati"
date = 2026-04-08
updated = 2026-04-10       # optional, only when the post has been revised
draft = false
canonical_url = ""         # optional, only if first published elsewhere
[taxonomies]
tags = ["..."]
[extra]
series = "..."             # optional
series_index = 1           # required if `series` is set
llms_description = "..."   # optional per-post override of the site-wide one
+++
```

## `portfolio/` (projects / professional work)

```toml
+++
title = "..."
description = "..."
role = "..."
date_start = 2025-01-01
date_end = 2025-06-01      # optional, omit if ongoing
outcome = "one-line result"
draft = false
[[links]]
label = "Live"
url = "https://..."
[[links]]
label = "Source"
url = "https://..."
[taxonomies]
tags = ["..."]             # stack / tech tags
+++
```

Body is a free-form Markdown case study.

## `bookshelf/` (books *and* papers)

`kind` selects which identifier fields apply — books use `isbn`, papers use
`doi`/`arxiv_id`. Cover images are fetched by a lookup (Open Library/Google
Books for ISBNs; Semantic Scholar/arXiv for papers) and cached under
`static/covers/`, never fetched at page-render time.

```toml
+++
title = "..."
kind = "book"               # "book" | "paper"
authors = ["..."]
isbn = "9780000000000"      # books only
doi = "10.1000/xyz123"      # papers only
arxiv_id = "2101.00001"     # papers only, optional
url = "https://..."         # papers only: landing page / source link
cover_image = "/covers/slug.jpg"
rating = 5                  # optional, 1-5
status = "read"             # "reading" | "read" | "abandoned"
date_started = 2026-01-01
date_finished = 2026-01-20  # optional, omit if still in progress
[taxonomies]
tags = ["..."]              # genre / topic
+++
```

Body is a free-form personal review/notes.

## `blogs/` (curated external blogs)

```toml
+++
title = "..."     # the blog/site's name
url = "https://..."
feed_url = "https://.../rss.xml"
+++
```

Body is a one-to-two sentence blurb on why you follow it. No live feed
fetching — this list is hand-curated and static.
