import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import type { Loader } from "astro/loaders";
import { marked } from "marked";
import { parse as parseToml } from "smol-toml";

const FRONTMATTER_RE = /^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?([\s\S]*)$/;

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
    load: async ({ store, config, logger }) => {
      store.clear();
      const dirUrl = new URL(contentDir, config.root);
      let files: string[] = [];
      try {
        statSync(dirUrl);
        files = walk(dirUrl.pathname);
      } catch {
        logger.warn(`toml-content-loader: no directory at ${dirUrl.pathname}`);
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
        const html = await marked.parse(body.trim());
        store.set({ id, data, rendered: { html } });
      }
    },
  };
}
