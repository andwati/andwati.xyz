// Generates apps/site/public/llms.txt for the new Astro site, covering all
// four content types. Run before `astro build` (wired into
// apps/site/package.json's build script) so it's included as a static file.
//
// Site metadata is duplicated from apps/site/src/site.config.ts rather than
// imported — this script runs as plain Node outside Vite/Astro's pipeline,
// and the config is small enough that duplicating it beats adding a
// cross-module-system import.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";

const baseUrl = "https://andwati.com";
const siteTitle = "Thoughts and Musings";
const summary =
  "Ian Andwati's personal digital-legacy site covering computer science and mathematics — writings, portfolio, and a curated bookshelf.";

// Resolved relative to this file, not process.cwd() — this script runs as
// part of apps/site's build script, whose cwd is apps/site, not the repo
// root where content/ lives.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content");
const outFile = path.join(root, "apps", "site", "public", "llms.txt");

const FRONTMATTER_RE = /^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?([\s\S]*)$/;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith(".md") ? [full] : [];
  });
}

function slugFor(dir, file) {
  const rel = path.relative(dir, file).split(path.sep).join("/");
  return rel.endsWith("/index.md")
    ? rel.slice(0, -"/index.md".length)
    : rel.slice(0, -".md".length);
}

function readEntries(typeDir) {
  return walk(typeDir)
    .map((file) => {
      const raw = fs.readFileSync(file, "utf8");
      const match = raw.match(FRONTMATTER_RE);
      if (!match) return null;
      const frontmatter = parseToml(match[1]);
      return { slug: slugFor(typeDir, file), frontmatter };
    })
    .filter(Boolean);
}

const writings = readEntries(path.join(contentDir, "writings"))
  .filter((e) => !e.frontmatter.draft)
  .sort((a, b) =>
    String(b.frontmatter.date).localeCompare(String(a.frontmatter.date)),
  );
const portfolio = readEntries(path.join(contentDir, "portfolio")).filter(
  (e) => !e.frontmatter.draft,
);
const bookshelf = readEntries(path.join(contentDir, "bookshelf"));
const blogs = readEntries(path.join(contentDir, "blogs"));

function link(title, url, description) {
  return `- [${title}](${url})${description ? `: ${description.replace(/\s+/g, " ").trim()}` : ""}`;
}

const lines = [
  `# ${siteTitle}`,
  "",
  `> ${summary}`,
  "",
  "## Main pages",
  "",
  `- [Home](${baseUrl}/): Introduction and latest writings.`,
  `- [Writings](${baseUrl}/writings/): Long-form essays and technical posts.`,
  `- [Portfolio](${baseUrl}/portfolio/): Projects and professional work.`,
  `- [Bookshelf](${baseUrl}/bookshelf/): Books and papers read, with notes.`,
  `- [Blogs](${baseUrl}/blogs/): Curated external blogs.`,
  `- [Tags](${baseUrl}/tags/): Writings grouped by topic.`,
  "",
  "## Writings",
  "",
  ...writings.map((e) =>
    link(
      e.frontmatter.title,
      `${baseUrl}/writings/${e.slug}/`,
      e.frontmatter.description,
    ),
  ),
  "",
  "## Portfolio",
  "",
  ...portfolio.map((e) =>
    link(e.frontmatter.title, `${baseUrl}/portfolio/`, e.frontmatter.outcome),
  ),
  "",
  "## Bookshelf",
  "",
  ...bookshelf.map((e) =>
    link(
      e.frontmatter.title,
      `${baseUrl}/bookshelf/`,
      (e.frontmatter.authors ?? []).join(", "),
    ),
  ),
  "",
  "## Blogs followed",
  "",
  ...blogs.map((e) => link(e.frontmatter.title, e.frontmatter.url)),
  "",
  "## Feeds and discovery",
  "",
  `- [RSS feed](${baseUrl}/rss.xml): Full writings feed in RSS format.`,
  `- [JSON feed](${baseUrl}/feed.json): Full writings feed in JSON Feed format.`,
  `- [Sitemap](${baseUrl}/sitemap-index.xml): Machine-readable index of public pages.`,
  "",
];

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, lines.join("\n"));
console.log(
  `Generated ${path.relative(root, outFile)} (${writings.length} writings, ${portfolio.length} portfolio, ${bookshelf.length} bookshelf, ${blogs.length} blogs).`,
);
