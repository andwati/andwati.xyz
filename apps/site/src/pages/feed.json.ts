import { getCollection } from "astro:content";
import { siteConfig } from "../site.config";

export async function GET() {
  const writings = (
    await getCollection("writings", ({ data }) => !data.draft)
  ).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: siteConfig.title,
    home_page_url: siteConfig.baseUrl,
    feed_url: `${siteConfig.baseUrl}/feed.json`,
    description: siteConfig.description,
    items: writings.map((entry) => ({
      id: `${siteConfig.baseUrl}/writings/${entry.id}/`,
      url: `${siteConfig.baseUrl}/writings/${entry.id}/`,
      title: entry.data.title,
      summary: entry.data.description,
      date_published: entry.data.date.toISOString(),
      ...(entry.data.updated
        ? { date_modified: entry.data.updated.toISOString() }
        : {}),
      tags: entry.data.taxonomies?.tags ?? [],
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { "Content-Type": "application/feed+json; charset=utf-8" },
  });
}
