import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const config = fs.readFileSync(path.join(root, "zola.toml"), "utf8");
const postsDir = path.join(root, "content", "posts");
const output = path.join(root, "static", "llms.txt");

function tomlString(source, key) {
  const match = source.match(
    new RegExp(`^${key}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*")`, "m"),
  );
  return match ? JSON.parse(match[1]) : undefined;
}

function frontMatter(source) {
  return source.match(/^\+\+\+\s*\n([\s\S]*?)\n\+\+\+/)?.[1];
}

function markdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(location);
    return entry.isFile() && entry.name.endsWith(".md") ? [location] : [];
  });
}

function postUrl(file, metadata, baseUrl) {
  const relative = path.relative(postsDir, file).replaceAll(path.sep, "/");
  const defaultSlug = relative.endsWith("/index.md")
    ? relative.slice(0, -"/index.md".length)
    : relative.slice(0, -".md".length);
  const slug = tomlString(metadata, "slug") ?? defaultSlug;
  return `${baseUrl}/posts/${slug}/`;
}

const baseUrl = tomlString(config, "base_url")?.replace(/\/$/, "");
const siteTitle = new URL(baseUrl).hostname;
const summary =
  tomlString(config, "llms_description") ?? tomlString(config, "description");

const posts = markdownFiles(postsDir)
  .filter((file) => path.basename(file) !== "_index.md")
  .map((file) => {
    const metadata = frontMatter(fs.readFileSync(file, "utf8"));
    if (!metadata || /^draft\s*=\s*true$/m.test(metadata)) return null;

    const title = tomlString(metadata, "title");
    const description = tomlString(metadata, "description");
    const date = metadata.match(/^date\s*=\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
    if (!title || !date) return null;

    return { title, description, date, url: postUrl(file, metadata, baseUrl) };
  })
  .filter(Boolean)
  .sort((a, b) => b.date.localeCompare(a.date));

const lines = [
  `# ${siteTitle}`,
  "",
  `> ${summary}`,
  "",
  "This site contains articles in English, often with commands, code samples, worked explanations, and material aimed at readers learning by doing.",
  "",
  "## Main pages",
  "",
  `- [Home](${baseUrl}/): Introduction and latest articles.`,
  `- [About](${baseUrl}/about/): About the author and contact information.`,
  `- [Posts](${baseUrl}/posts/): All published articles.`,
  `- [Tags](${baseUrl}/tags/): Articles grouped by topic.`,
  `- [Archive](${baseUrl}/archive/): Chronological article archive.`,
  "",
  "## Published articles",
  "",
  ...posts.map(
    ({ title, description, url }) =>
      `- [${title}](${url})${description ? `: ${description.replace(/\s+/g, " ").trim()}` : ""}`,
  ),
  "",
  "## Feeds and discovery",
  "",
  `- [RSS feed](${baseUrl}/rss.xml): Full site feed in RSS format.`,
  `- [JSON feed](${baseUrl}/feed.json): Full site feed in JSON format.`,
  `- [Sitemap](${baseUrl}/sitemap.xml): Machine-readable index of public pages.`,
  "",
];

fs.writeFileSync(output, lines.join("\n"));
console.log(
  `Generated ${path.relative(root, output)} with ${posts.length} published articles.`,
);
