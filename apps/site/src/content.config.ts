import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { tomlContentLoader } from "./lib/toml-content-loader";

const taxonomies = z
  .object({
    tags: z.array(z.string()).default([]),
  })
  .optional();

const writings = defineCollection({
  loader: tomlContentLoader("../../content/writings/"),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    canonical_url: z.string().optional(),
    taxonomies,
    extra: z
      .object({
        series: z.string().optional(),
        series_index: z.number().optional(),
        llms_description: z.string().optional(),
      })
      .optional(),
  }),
});

const portfolio = defineCollection({
  loader: tomlContentLoader("../../content/portfolio/"),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    role: z.string().optional(),
    date_start: z.coerce.date().optional(),
    date_end: z.coerce.date().optional(),
    outcome: z.string().optional(),
    draft: z.boolean().default(false),
    links: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
    taxonomies,
  }),
});

const bookshelf = defineCollection({
  loader: tomlContentLoader("../../content/bookshelf/"),
  schema: z.object({
    title: z.string(),
    kind: z.enum(["book", "paper"]),
    authors: z.array(z.string()).default([]),
    isbn: z.string().optional(),
    doi: z.string().optional(),
    arxiv_id: z.string().optional(),
    url: z.string().optional(),
    cover_image: z.string().optional(),
    rating: z.number().optional(),
    read_status: z.enum(["reading", "read", "abandoned"]).optional(),
    date_started: z.coerce.date().optional(),
    date_finished: z.coerce.date().optional(),
    taxonomies,
  }),
});

const blogs = defineCollection({
  loader: tomlContentLoader("../../content/blogs/"),
  schema: z.object({
    title: z.string(),
    url: z.string(),
    feed_url: z.string().optional(),
  }),
});

export const collections = { writings, portfolio, bookshelf, blogs };
