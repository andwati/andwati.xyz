import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { siteConfig } from "../site.config";

export async function GET(context: APIContext) {
  const writings = (
    await getCollection("writings", ({ data }) => !data.draft)
  ).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? siteConfig.baseUrl,
    items: writings.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.date,
      link: `/writings/${entry.id}/`,
      categories: entry.data.taxonomies?.tags,
    })),
  });
}
