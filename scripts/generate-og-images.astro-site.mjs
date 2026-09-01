// Generates OG images for the new Astro site's writings, portfolio, and
// bookshelf entries, replacing the legacy Zola script (which was hard-coded
// to the retired "CASE FILE" branding). Output goes to
// apps/site/public/images/og/<type>/<slug>.png, wired into apps/site's
// build script (mirrors generate-llms.astro-site.mjs).
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { parse as parseToml } from "smol-toml";
import { decompress } from "wawoff2";

// Design tokens, duplicated from apps/site/src/styles/tokens.css's dark
// palette — OG images always render dark regardless of the viewer's theme.
const COLORS = {
  bg: "#0d0d0b",
  text: "#ece7db",
  muted: "#8e897b",
  accent: "#ff6b45",
  border: "rgba(236, 231, 219, 0.12)",
};

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = path.join(root, "content");
const outDir = path.join(root, "apps", "site", "public", "images", "og");
const pnpmDir = path.join(root, "node_modules", ".pnpm");

const FRONTMATTER_RE = /^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?([\s\S]*)$/;

function walk(dir) {
  return fs
    .readdir(dir, { withFileTypes: true })
    .then((entries) =>
      Promise.all(
        entries.map((entry) => {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) return walk(full);
          return entry.isFile() && entry.name.endsWith(".md") ? [full] : [];
        }),
      ),
    )
    .then((lists) => lists.flat());
}

function slugFor(typeDir, file) {
  const rel = path.relative(typeDir, file).split(path.sep).join("/");
  return rel.endsWith("/index.md")
    ? rel.slice(0, -"/index.md".length)
    : rel.slice(0, -".md".length);
}

async function readEntries(typeDir) {
  if (
    !(await fs.access(typeDir).then(
      () => true,
      () => false,
    ))
  ) {
    return [];
  }
  const files = await walk(typeDir);
  const entries = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(file, "utf8");
      const match = raw.match(FRONTMATTER_RE);
      if (!match) return null;
      return { slug: slugFor(typeDir, file), frontmatter: parseToml(match[1]) };
    }),
  );
  return entries.filter(Boolean);
}

async function findPnpmPackageDir(prefix) {
  const entries = await fs.readdir(pnpmDir);
  const match = entries.find((e) => e.startsWith(prefix));
  if (!match) throw new Error(`Could not find pnpm package matching ${prefix}`);
  return path.join(pnpmDir, match, "node_modules");
}

async function loadFont(absPath) {
  const woff2 = await fs.readFile(absPath);
  const ttf = await decompress(woff2);
  return Buffer.from(ttf);
}

function h(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.flat().filter((c) => c !== null && c !== undefined),
    },
  };
}

function formatDate(date) {
  if (!date) return undefined;
  // smol-toml parses TOML dates into Date objects directly.
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function card({ kicker, title, meta, tags }) {
  const stampTag = tags[0];
  const footerTags =
    tags.length > 4 ? `${tags.slice(0, 4).join(" · ")} ⋯` : tags.join(" · ");
  const titleSize = title.length > 70 ? 46 : title.length > 45 ? 54 : 64;

  return h(
    "div",
    {
      style: {
        width: "1200px",
        height: "630px",
        display: "flex",
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        fontFamily: "Newsreader",
      },
    },
    h(
      "div",
      {
        style: {
          flex: 1,
          margin: "40px",
          border: `1px solid ${COLORS.border}`,
          borderRadius: "6px",
          padding: "48px 56px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              fontFamily: "JetBrains Mono",
              fontWeight: 400,
              fontSize: "22px",
              color: COLORS.muted,
              letterSpacing: "2px",
            },
          },
          `ANDWATI.COM · ${kicker}`,
        ),
        stampTag
          ? h(
              "div",
              {
                style: {
                  display: "flex",
                  border: `2px solid ${COLORS.accent}`,
                  borderRadius: "4px",
                  padding: "8px 16px",
                  color: COLORS.accent,
                  fontFamily: "JetBrains Mono",
                  fontWeight: 700,
                  fontSize: "20px",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  transform: "rotate(3deg)",
                },
              },
              stampTag,
            )
          : null,
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: `${titleSize}px`,
            lineHeight: 1.15,
            letterSpacing: "-1px",
            color: COLORS.text,
            overflow: "hidden",
          },
        },
        title,
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${COLORS.border}`,
            paddingTop: "24px",
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              fontFamily: "JetBrains Mono",
              fontWeight: 400,
              fontSize: "20px",
              color: COLORS.muted,
              letterSpacing: "1px",
            },
          },
          meta ?? "",
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              fontFamily: "JetBrains Mono",
              fontWeight: 400,
              fontSize: "20px",
              color: COLORS.muted,
              letterSpacing: "1px",
            },
          },
          footerTags,
        ),
      ),
    ),
  );
}

function writingsCard(entry) {
  return card({
    kicker: "WRITINGS",
    title: entry.frontmatter.title,
    meta: formatDate(entry.frontmatter.date),
    tags: entry.frontmatter.taxonomies?.tags ?? [],
  });
}

function portfolioCard(entry) {
  return card({
    kicker: "PORTFOLIO",
    title: entry.frontmatter.title,
    meta: entry.frontmatter.role ?? entry.frontmatter.outcome,
    tags: entry.frontmatter.taxonomies?.tags ?? [],
  });
}

function bookshelfCard(entry) {
  const authors = entry.frontmatter.authors ?? [];
  return card({
    kicker: "BOOKSHELF",
    title: entry.frontmatter.title,
    meta: authors.length ? authors.join(", ") : undefined,
    tags: entry.frontmatter.taxonomies?.tags ?? [],
  });
}

// Static-weight builds, not the variable fonts the site ships — satori's
// opentype.js parser can't read these packages' fvar table (throws on the
// axis-name lookup), so a fixed weight per family is loaded instead.
const jetbrainsMonoDir = await findPnpmPackageDir("@fontsource+jetbrains-mono");
const fraunceDir = await findPnpmPackageDir("@fontsource+fraunces");
const newsreaderDir = await findPnpmPackageDir("@fontsource+newsreader");

const fonts = [
  {
    name: "Fraunces",
    data: await loadFont(
      path.join(
        fraunceDir,
        "@fontsource/fraunces/files/fraunces-latin-600-normal.woff2",
      ),
    ),
    weight: 600,
    style: "normal",
  },
  {
    name: "Newsreader",
    data: await loadFont(
      path.join(
        newsreaderDir,
        "@fontsource/newsreader/files/newsreader-latin-400-normal.woff2",
      ),
    ),
    weight: 400,
    style: "normal",
  },
  {
    name: "JetBrains Mono",
    data: await loadFont(
      path.join(
        jetbrainsMonoDir,
        "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2",
      ),
    ),
    weight: 400,
    style: "normal",
  },
  {
    name: "JetBrains Mono",
    data: await loadFont(
      path.join(
        jetbrainsMonoDir,
        "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2",
      ),
    ),
    weight: 700,
    style: "normal",
  },
];

const TYPES = [
  {
    name: "writings",
    buildCard: writingsCard,
    isDraft: (e) => e.frontmatter.draft,
  },
  {
    name: "portfolio",
    buildCard: portfolioCard,
    isDraft: (e) => e.frontmatter.draft,
  },
  { name: "bookshelf", buildCard: bookshelfCard, isDraft: () => false },
];

let count = 0;
for (const type of TYPES) {
  const typeDir = path.join(contentDir, type.name);
  const entries = await readEntries(typeDir);
  const typeOutDir = path.join(outDir, type.name);
  await fs.mkdir(typeOutDir, { recursive: true });

  for (const entry of entries) {
    if (!entry.frontmatter.title || type.isDraft(entry)) continue;
    const svg = await satori(type.buildCard(entry), {
      width: 1200,
      height: 630,
      fonts,
    });
    const png = new Resvg(svg).render().asPng();
    await fs.writeFile(path.join(typeOutDir, `${entry.slug}.png`), png);
    count += 1;
  }
}

console.log(
  `Generated ${count} OG image${count === 1 ? "" : "s"} in ${path.relative(root, outDir)}/`,
);
