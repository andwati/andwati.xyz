import { rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  cacheRemoteImage,
  fetchBookCover,
  fetchPaperMetadata,
} from "./bookshelf-covers";
import {
  deleteEntry,
  readAllEntries,
  toTomlDate,
  writeEntry,
} from "./content-file";
import { contentRoot, coversRoot } from "./content-paths";
import { publishContentChanges } from "./git-publisher";

const BOOKSHELF_UID = "api::bookshelf-entry.bookshelf-entry";

type Layout = "nested" | "flat";

interface SyncConfig {
  uid: string;
  dir: string;
  layout: Layout;
  /** Strapi entry -> { frontmatter, body } written to disk. */
  toFile: (entry: Record<string, unknown>) => {
    frontmatter: Record<string, unknown>;
    body: string;
  };
  /** Parsed file -> Strapi entry fields, for importing content/ into Strapi on boot. */
  toEntry: (
    slug: string,
    frontmatter: Record<string, unknown>,
    body: string,
  ) => Record<string, unknown>;
}

const isoDate = (value: unknown): string | undefined =>
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : typeof value === "string"
      ? value
      : undefined;

function buildConfigs(): Record<string, SyncConfig> {
  const root = contentRoot();

  const writing: SyncConfig = {
    uid: "api::writing.writing",
    dir: join(root, "writings"),
    layout: "nested",
    toFile: (e) => ({
      frontmatter: {
        title: e.title,
        description: e.description,
        author: e.author,
        date: toTomlDate(e.date as string),
        updated: toTomlDate(e.updated as string),
        draft: e.draft ?? false,
        canonical_url: e.canonical_url,
        taxonomies: { tags: e.tags ?? [] },
        extra: {
          series: e.series,
          series_index: e.series_index,
          llms_description: e.llms_description,
        },
      },
      body: (e.body as string) ?? "",
    }),
    toEntry: (slug, fm, body) => {
      const taxonomies = fm.taxonomies as { tags?: string[] } | undefined;
      const extra = fm.extra as
        | { series?: string; series_index?: number; llms_description?: string }
        | undefined;
      return {
        slug,
        title: fm.title,
        description: fm.description,
        author: fm.author,
        date: isoDate(fm.date),
        updated: isoDate(fm.updated),
        draft: fm.draft ?? false,
        canonical_url: fm.canonical_url,
        tags: taxonomies?.tags ?? [],
        series: extra?.series,
        series_index: extra?.series_index,
        llms_description: extra?.llms_description,
        body,
      };
    },
  };

  const portfolioEntry: SyncConfig = {
    uid: "api::portfolio-entry.portfolio-entry",
    dir: join(root, "portfolio"),
    layout: "flat",
    toFile: (e) => ({
      frontmatter: {
        title: e.title,
        description: e.description,
        role: e.role,
        date_start: toTomlDate(e.date_start as string),
        date_end: toTomlDate(e.date_end as string),
        outcome: e.outcome,
        draft: e.draft ?? false,
        links: e.links ?? [],
        taxonomies: { tags: e.tags ?? [] },
      },
      body: (e.body as string) ?? "",
    }),
    toEntry: (slug, fm, body) => {
      const taxonomies = fm.taxonomies as { tags?: string[] } | undefined;
      return {
        slug,
        title: fm.title,
        description: fm.description,
        role: fm.role,
        date_start: isoDate(fm.date_start),
        date_end: isoDate(fm.date_end),
        outcome: fm.outcome,
        draft: fm.draft ?? false,
        links: fm.links ?? [],
        tags: taxonomies?.tags ?? [],
        body,
      };
    },
  };

  const bookshelfEntry: SyncConfig = {
    uid: "api::bookshelf-entry.bookshelf-entry",
    dir: join(root, "bookshelf"),
    layout: "flat",
    toFile: (e) => ({
      frontmatter: {
        title: e.title,
        kind: e.kind,
        authors: e.authors ?? [],
        isbn: e.isbn,
        doi: e.doi,
        arxiv_id: e.arxiv_id,
        url: e.url,
        cover_image: e.cover_image,
        rating: e.rating,
        read_status: e.read_status,
        date_started: toTomlDate(e.date_started as string),
        date_finished: toTomlDate(e.date_finished as string),
        taxonomies: { tags: e.tags ?? [] },
      },
      body: (e.body as string) ?? "",
    }),
    toEntry: (slug, fm, body) => {
      const taxonomies = fm.taxonomies as { tags?: string[] } | undefined;
      return {
        slug,
        title: fm.title,
        kind: fm.kind,
        authors: fm.authors ?? [],
        isbn: fm.isbn,
        doi: fm.doi,
        arxiv_id: fm.arxiv_id,
        url: fm.url,
        cover_image: fm.cover_image,
        rating: fm.rating,
        read_status: fm.read_status,
        date_started: isoDate(fm.date_started),
        date_finished: isoDate(fm.date_finished),
        tags: taxonomies?.tags ?? [],
        body,
      };
    },
  };

  const curatedBlog: SyncConfig = {
    uid: "api::curated-blog.curated-blog",
    dir: join(root, "blogs"),
    layout: "flat",
    toFile: (e) => ({
      frontmatter: {
        title: e.title,
        url: e.url,
        feed_url: e.feed_url,
      },
      body: (e.body as string) ?? "",
    }),
    toEntry: (slug, fm, body) => ({
      slug,
      title: fm.title,
      url: fm.url,
      feed_url: fm.feed_url,
      body,
    }),
  };

  return {
    [writing.uid]: writing,
    [portfolioEntry.uid]: portfolioEntry,
    [bookshelfEntry.uid]: bookshelfEntry,
    [curatedBlog.uid]: curatedBlog,
  };
}

export const SYNC_CONFIGS = buildConfigs();

/** Guards the outbound (DB -> file) middleware while the inbound (file -> DB) import runs. */
let importing = false;

function writeEntryForConfig(
  config: SyncConfig,
  entry: Record<string, unknown>,
): string | undefined {
  const slug = entry.slug as string | undefined;
  if (!slug) return undefined;
  const { frontmatter, body } = config.toFile(entry);
  return writeEntry(config.dir, slug, config.layout, frontmatter, body);
}

function coverFileForEntry(
  entry: Record<string, unknown> | null,
): string | undefined {
  const coverImage = entry?.cover_image;
  if (typeof coverImage !== "string" || !coverImage.startsWith("/covers/")) {
    return undefined;
  }

  const root = resolve(coversRoot());
  const file = resolve(root, coverImage.slice("/covers/".length));
  const fromRoot = relative(root, file);
  if (fromRoot === ".." || fromRoot.startsWith("../")) {
    throw new Error(`Refusing unsafe local cover path: ${coverImage}`);
  }
  return file;
}

/**
 * On boot, upserts every file under content/<type>/ into Strapi so the admin
 * UI reflects on-disk edits made outside Strapi. Strapi's DB stays a
 * disposable cache: this can always rebuild it from content/ alone.
 */
export async function importContentFromDisk(strapi: {
  documents: (uid: string) => {
    findFirst: (params: {
      filters: Record<string, unknown>;
    }) => Promise<Record<string, unknown> | null>;
    create: (params: { data: Record<string, unknown> }) => Promise<unknown>;
    update: (params: {
      documentId: string;
      data: Record<string, unknown>;
    }) => Promise<unknown>;
  };
  log: { info: (msg: string) => void; error: (msg: string) => void };
}): Promise<void> {
  importing = true;
  try {
    for (const config of Object.values(SYNC_CONFIGS)) {
      const files = readAllEntries(config.dir);
      let created = 0;
      let updated = 0;
      for (const { slug, frontmatter, body } of files) {
        const data = config.toEntry(slug, frontmatter, body);
        try {
          const existing = await strapi
            .documents(config.uid)
            .findFirst({ filters: { slug } });
          if (existing) {
            await strapi
              .documents(config.uid)
              .update({ documentId: existing.documentId as string, data });
            updated += 1;
          } else {
            await strapi.documents(config.uid).create({ data });
            created += 1;
          }
        } catch (err) {
          strapi.log.error(
            `content-sync: failed to import ${config.dir}/${slug}: ${(err as Error).message}`,
          );
        }
      }
      strapi.log.info(
        `content-sync: imported ${config.uid} (${created} created, ${updated} updated, ${files.length} total)`,
      );
    }
  } finally {
    importing = false;
  }
}

interface DocumentsClient {
  findOne: (params: {
    documentId: string;
  }) => Promise<Record<string, unknown> | null>;
  update: (params: {
    documentId: string;
    data: Record<string, unknown>;
  }) => Promise<Record<string, unknown>>;
}

/**
 * Backfills a bookshelf entry's cover — either by caching whatever URL is
 * already in `cover_image` (e.g. one pasted in by hand, or an editor's own
 * hosted cover) locally, or by looking one up (books via Open Library by
 * ISBN) when there's no cover_image at all yet — and, for papers, missing
 * title/authors via Semantic Scholar by DOI/arXiv id. Runs once per entry:
 * a `cover_image` already pointing at a local /covers/... path is treated
 * as "done" and left alone.
 */
async function enrichBookshelfEntry(
  documents: (uid: string) => DocumentsClient,
  entry: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const slug = entry.slug as string;
  const coverImage = entry.cover_image as string | undefined;
  const patch: Record<string, unknown> = {};

  try {
    if (coverImage && /^https?:\/\//i.test(coverImage)) {
      const cached = await cacheRemoteImage(coverImage, slug);
      if (cached) patch.cover_image = cached;
    } else if (!coverImage) {
      if (entry.kind === "book" && entry.isbn) {
        const cover = await fetchBookCover(entry.isbn as string, slug);
        if (cover) patch.cover_image = cover;
      } else if (entry.kind === "paper" && (entry.doi || entry.arxiv_id)) {
        const meta = await fetchPaperMetadata({
          doi: entry.doi as string | undefined,
          arxivId: entry.arxiv_id as string | undefined,
        });
        if (meta?.title && !entry.title) patch.title = meta.title;
        if (
          meta?.authors?.length &&
          !(entry.authors as string[] | undefined)?.length
        ) {
          patch.authors = meta.authors;
        }
      }
    }
  } catch {
    // Network/API failures shouldn't block saving the entry itself.
    return entry;
  }

  if (Object.keys(patch).length === 0) return entry;
  // Keep the nested update outside the network-failure guard. Its middleware
  // persists and publishes the enriched entry; publication errors must reach
  // the caller instead of being mistaken for a cover-provider outage.
  return documents(BOOKSHELF_UID).update({
    documentId: entry.documentId as string,
    data: patch,
  });
}

/** Registers the outbound (DB -> file) sync as a Document Service middleware. */
export function registerContentSync(strapi: {
  documents: {
    use: (
      middleware: (
        ctx: { uid: string; action: string; params: Record<string, unknown> },
        next: () => Promise<unknown>,
      ) => Promise<unknown>,
    ) => void;
    (uid: string): DocumentsClient;
  };
  log: { info: (msg: string) => void; error: (msg: string) => void };
}): void {
  strapi.documents.use(async (ctx, next) => {
    const config = SYNC_CONFIGS[ctx.uid];
    if (!config || importing) return next();

    let preDeleteEntry: Record<string, unknown> | null = null;
    if (ctx.action === "delete") {
      const documentId = (ctx.params as { documentId?: string }).documentId;
      if (documentId) {
        preDeleteEntry = await strapi
          .documents(ctx.uid)
          .findOne({ documentId });
      }
    }

    const result = await next();

    try {
      if (
        (ctx.action === "create" || ctx.action === "update") &&
        result &&
        typeof result === "object"
      ) {
        const entry =
          ctx.uid === BOOKSHELF_UID
            ? await enrichBookshelfEntry(
                strapi.documents,
                result as Record<string, unknown>,
              )
            : (result as Record<string, unknown>);
        const entryFile = writeEntryForConfig(config, entry);
        if (entryFile) {
          const paths = [entryFile];
          const coverFile = coverFileForEntry(entry);
          if (coverFile) paths.push(coverFile);
          await publishContentChanges(
            paths,
            `content: ${ctx.action} ${entry.slug as string}`,
          );
        }
      } else if (ctx.action === "delete" && preDeleteEntry) {
        const slug = preDeleteEntry.slug as string | undefined;
        if (!slug) return result;

        const paths = [deleteEntry(config.dir, slug, config.layout)];
        const coverFile = coverFileForEntry(preDeleteEntry);
        if (coverFile) {
          rmSync(coverFile, { force: true });
          paths.push(coverFile);
        }
        await publishContentChanges(paths, `content: delete ${slug}`);
      }
    } catch (err) {
      strapi.log.error(
        `content-sync: failed to write ${ctx.uid} to disk: ${(err as Error).message}`,
      );
      throw err;
    }

    return result;
  });
}
