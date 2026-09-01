import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import type { Loader } from "astro/loaders";
import hljs from "highlight.js/lib/core";
import hljsBash from "highlight.js/lib/languages/bash";
import hljsC from "highlight.js/lib/languages/c";
import hljsCss from "highlight.js/lib/languages/css";
import hljsDos from "highlight.js/lib/languages/dos";
import hljsIni from "highlight.js/lib/languages/ini";
import hljsJavascript from "highlight.js/lib/languages/javascript";
import hljsPowershell from "highlight.js/lib/languages/powershell";
import hljsPython from "highlight.js/lib/languages/python";
import hljsX86asm from "highlight.js/lib/languages/x86asm";
import hljsXml from "highlight.js/lib/languages/xml";
import hljsYaml from "highlight.js/lib/languages/yaml";
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

// highlight.js's core build (no bundled grammars) plus only the languages
// actually used in content/'s fenced code blocks — keeps the highlighter
// thin instead of shipping its full ~190-language bundle. Aliases below
// map every fence lang seen in content to one of these registered names.
hljs.registerLanguage("bash", hljsBash);
hljs.registerLanguage("c", hljsC);
hljs.registerLanguage("css", hljsCss);
hljs.registerLanguage("dos", hljsDos);
hljs.registerLanguage("ini", hljsIni);
hljs.registerLanguage("javascript", hljsJavascript);
hljs.registerLanguage("powershell", hljsPowershell);
hljs.registerLanguage("python", hljsPython);
hljs.registerLanguage("x86asm", hljsX86asm);
hljs.registerLanguage("xml", hljsXml);
hljs.registerLanguage("yaml", hljsYaml);

const LANG_ALIASES: Record<string, string> = {
  asm: "x86asm",
  bat: "dos",
  gdb: "plaintext",
  html: "xml",
  js: "javascript",
  ps1: "powershell",
  sh: "bash",
  svg: "xml",
  toml: "ini",
  txt: "plaintext",
  zsh: "bash",
  "": "plaintext",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightCode(code: string, lang: string | undefined): string {
  const resolved = LANG_ALIASES[lang ?? ""] ?? lang ?? "plaintext";
  const inner = hljs.getLanguage(resolved)
    ? hljs.highlight(code, { language: resolved }).value
    : escapeHtml(code);
  return `<pre class="hljs"><code>${inner}</code></pre>`;
}

const marked = new Marked({
  renderer: {
    heading(token) {
      const plainText = stripInlineMarkdown(token.text);
      const slug = slugify(plainText);
      const html = this.parser.parseInline(token.tokens);
      currentHeadings.push({ depth: token.depth, slug, text: plainText });
      return `<h${token.depth} id="${slug}">${html}</h${token.depth}>`;
    },
    code(token) {
      return highlightCode(token.text, token.lang);
    },
  },
});

const CALLOUT_ICONS: Record<string, string> = {
  note: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
  tip: '<circle cx="12" cy="12" r="10"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path>',
  warning:
    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  danger:
    '<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>',
};

const CALLOUT_TITLES: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
  danger: "Danger",
};

// Legacy Zola shortcode syntax carried over verbatim by the posts→writings
// migration script (which flagged, but didn't translate, these blocks —
// see scripts/migrate-posts-to-writings.mjs). Matches
// `{% <note> %}\n...body...\n{% </note> %}` for note/tip/warning/danger.
const CALLOUT_RE =
  /\{%\s*<(note|tip|warning|danger)>\s*%\}\r?\n?([\s\S]*?)\r?\n?\{%\s*<\/\1>\s*%\}/g;

/** Replaces legacy callout shortcode blocks with the `.callout` markup
 * (styled in global.css), rendering each block's inner markdown. Must run
 * before the body's own `marked.parse()` call so the shortcode syntax
 * doesn't get treated as literal paragraph text. */
async function renderCallouts(body: string): Promise<string> {
  const matches = [...body.matchAll(CALLOUT_RE)];
  if (!matches.length) return body;
  let out = body;
  for (const match of matches) {
    const [full, tag, inner] = match;
    const innerHtml = await marked.parseInline(inner.trim());
    out = out.replace(
      full,
      `<aside class="callout callout-${tag}">
  <div class="callout-header">
    <svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CALLOUT_ICONS[tag]}</svg>
    <span class="callout-title">${CALLOUT_TITLES[tag]}</span>
  </div>
  <div class="callout-content">${innerHtml}</div>
</aside>`,
    );
  }
  return out;
}

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
          const trimmedBody = await renderCallouts(body.trim());
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
