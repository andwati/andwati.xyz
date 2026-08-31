import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import type { Loader } from "astro/loaders";
import { Marked } from "marked";
import { parse as parseToml } from "smol-toml";

const FRONTMATTER_RE = /^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?([\s\S]*)$/;

interface Heading {
  depth: number;
  slug: string;
  text: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strips inline markdown syntax for use as plain-text TOC labels/slugs. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1");
}

// Collects headings for the file currently being parsed (reset before each
// `marked.parse()` call below) so Astro's `render(entry)` can expose them
// as `headings`, matching the shape a built-in markdown loader would give.
let currentHeadings: Heading[] = [];

const marked = new Marked({
  renderer: {
    heading(token) {
      const plainText = stripInlineMarkdown(token.text);
      const slug = slugify(plainText);
      const html = this.parser.parseInline(token.tokens);
      currentHeadings.push({ depth: token.depth, slug, text: plainText });
      return `<h${token.depth} id="${slug}">${html}</h${token.depth}>`;
    },
  },
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      out.push(full);
    }
  }
  return out;
}

/**
 * Loads content from Zola-style TOML frontmatter (`+++ ... +++`) Markdown
 * files, so the site can read the same content/ directory Strapi's custom
 * provider will sync to — no YAML/JSON conversion step.
 */
export function tomlContentLoader(contentDir: string): Loader {
  return {
    name: "toml-content-loader",
    load: async ({ store, config, logger, watcher }) => {
      const dirUrl = new URL(contentDir, config.root);

      async function loadAll() {
        store.clear();
        let files: string[] = [];
        try {
          statSync(dirUrl);
          files = walk(dirUrl.pathname);
        } catch {
          logger.warn(
            `toml-content-loader: no directory at ${dirUrl.pathname}`,
          );
          return;
        }
        for (const file of files) {
          const raw = readFileSync(file, "utf8");
          const match = raw.match(FRONTMATTER_RE);
          if (!match) {
            logger.warn(
              `toml-content-loader: skipping ${file}, no +++ frontmatter found`,
            );
            continue;
          }
          const [, frontmatter, body] = match;
          const data = parseToml(frontmatter) as Record<string, unknown>;
          const relPath = relative(dirUrl.pathname, file);
          const id = relPath.replace(/\/index\.md$/, "").replace(/\.md$/, "");
          currentHeadings = [];
          const trimmedBody = body.trim();
          const html = await marked.parse(trimmedBody);
          const wordCount = trimmedBody.split(/\s+/).filter(Boolean).length;
          const readingMinutes = Math.max(1, Math.round(wordCount / 200));
          store.set({
            id,
            data: { ...data, wordCount, readingMinutes },
            rendered: { html, metadata: { headings: currentHeadings } },
          });
        }
      }

      await loadAll();

      // In `astro dev`, re-scan the whole directory on any add/change/unlink
      // so edits made outside Astro (Strapi's sync provider, or a file
      // edited by hand) show up without restarting the dev server.
      if (watcher) {
        watcher.add(dirUrl.pathname);
        const onChange = (changedPath: string) => {
          if (changedPath.startsWith(dirUrl.pathname)) loadAll();
        };
        watcher.on("add", onChange);
        watcher.on("change", onChange);
        watcher.on("unlink", onChange);
      }
    },
  };
}
