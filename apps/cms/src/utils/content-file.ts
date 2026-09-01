import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  parse as parseToml,
  stringify as stringifyToml,
  TomlDate,
} from "smol-toml";

const FRONTMATTER_RE = /^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?([\s\S]*)$/;

export interface ParsedEntryFile {
  slug: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

/** Strips undefined/null/empty-string/empty-array values so smol-toml doesn't choke on them. */
export function compact<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      const nested = compact(value as Record<string, unknown>);
      if (Object.keys(nested).length === 0) continue;
      out[key] = nested;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Converts a Strapi "date" field (an ISO `YYYY-MM-DD` string) to a bare TOML local-date. */
export function toTomlDate(
  value: string | null | undefined,
): TomlDate | undefined {
  return value ? new TomlDate(value) : undefined;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith(".md")) out.push(full);
  }
  return out;
}

function slugFromPath(dir: string, file: string): string {
  const rel = relative(dir, file).split("\\").join("/");
  return rel.endsWith("/index.md")
    ? rel.slice(0, -"/index.md".length)
    : rel.slice(0, -".md".length);
}

/** Reads every `+++`-frontmatter Markdown file under `dir` (flat or `<slug>/index.md`). */
export function readAllEntries(dir: string): ParsedEntryFile[] {
  let files: string[];
  try {
    files = walk(dir);
  } catch {
    return [];
  }
  return files.flatMap((file) => {
    const raw = readFileSync(file, "utf8");
    const match = raw.match(FRONTMATTER_RE);
    if (!match) return [];
    const [, fm, body] = match;
    return [
      {
        slug: slugFromPath(dir, file),
        frontmatter: parseToml(fm),
        body: body.trim(),
      },
    ];
  });
}

function entryPath(
  dir: string,
  slug: string,
  layout: "nested" | "flat",
): string {
  return layout === "nested"
    ? join(dir, slug, "index.md")
    : join(dir, `${slug}.md`);
}

/** Writes (or overwrites) the frontmatter+body file for `slug` under `dir`. */
export function writeEntry(
  dir: string,
  slug: string,
  layout: "nested" | "flat",
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const file = entryPath(dir, slug, layout);
  mkdirSync(dirname(file), { recursive: true });
  const toml = stringifyToml(compact(frontmatter)).trimEnd();
  writeFileSync(file, `+++\n${toml}\n+++\n\n${(body ?? "").trim()}\n`);
  return file;
}

/** Deletes the file (and, for nested layout, its now-empty directory) for `slug`. */
export function deleteEntry(
  dir: string,
  slug: string,
  layout: "nested" | "flat",
): string {
  const file = entryPath(dir, slug, layout);
  rmSync(file, { force: true });
  if (layout === "nested")
    rmSync(join(dir, slug), { recursive: true, force: true });
  return file;
}
