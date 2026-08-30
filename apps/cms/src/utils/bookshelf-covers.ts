import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Covers are cached into the Astro app's public/ dir directly, so the built
 * site serves them from /covers/<slug>.jpg with no runtime dependency on the
 * source (Open Library, Semantic Scholar, ...).
 */
const COVERS_DIR = join(process.cwd(), "..", "site", "public", "covers");

async function download(url: string): Promise<Buffer | undefined> {
  const res = await fetch(url);
  if (!res.ok) return undefined;
  const buf = Buffer.from(await res.arrayBuffer());
  // Open Library serves a tiny placeholder image for ISBNs it doesn't have a cover for.
  if (buf.byteLength < 500) return undefined;
  return buf;
}

/** Fetches a book cover by ISBN from Open Library and caches it locally. */
export async function fetchBookCover(
  isbn: string,
  slug: string,
): Promise<string | undefined> {
  const buf = await download(
    `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`,
  );
  if (!buf) return undefined;
  const file = join(COVERS_DIR, `${slug}.jpg`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buf);
  return `/covers/${slug}.jpg`;
}

interface PaperMetadata {
  title?: string;
  authors?: string[];
}

/**
 * Fetches title/author metadata for a paper from Semantic Scholar by DOI or
 * arXiv id, used to backfill fields left blank in Strapi. Semantic Scholar
 * has no reliable thumbnail/cover source for papers, so unlike books this
 * does not produce a cached image.
 */
export async function fetchPaperMetadata(identifier: {
  doi?: string;
  arxivId?: string;
}): Promise<PaperMetadata | undefined> {
  const id = identifier.doi
    ? `DOI:${identifier.doi}`
    : identifier.arxivId
      ? `ARXIV:${identifier.arxivId}`
      : undefined;
  if (!id) return undefined;
  const res = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(id)}?fields=title,authors`,
  );
  if (!res.ok) return undefined;
  const data = (await res.json()) as {
    title?: string;
    authors?: { name: string }[];
  };
  return { title: data.title, authors: data.authors?.map((a) => a.name) };
}
