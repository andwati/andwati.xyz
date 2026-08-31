import { getCollection } from "astro:content";

export interface ConstellationNode {
  title: string;
  type: "writing" | "portfolio" | "bookshelf";
  url: string;
}

export interface ConstellationGraph {
  nodes: ConstellationNode[];
  edges: [number, number][];
}

/**
 * Nodes are real content entries; an edge means two entries share at least
 * one tag — the same relationship "related posts" already uses, just drawn
 * instead of listed. No decorative/fake data.
 */
export async function buildConstellationGraph(): Promise<ConstellationGraph> {
  const writings = await getCollection("writings", ({ data }) => !data.draft);
  const portfolio = await getCollection("portfolio", ({ data }) => !data.draft);
  const bookshelf = await getCollection("bookshelf");

  const withTags = [
    ...writings.map((e) => ({
      title: e.data.title,
      type: "writing" as const,
      url: `/writings/${e.id}/`,
      tags: e.data.taxonomies?.tags ?? [],
    })),
    ...portfolio.map((e) => ({
      title: e.data.title,
      type: "portfolio" as const,
      url: "/portfolio/",
      tags: e.data.taxonomies?.tags ?? [],
    })),
    ...bookshelf.map((e) => ({
      title: e.data.title,
      type: "bookshelf" as const,
      url: "/bookshelf/",
      tags: e.data.taxonomies?.tags ?? [],
    })),
  ];

  const nodes: ConstellationNode[] = withTags.map(
    ({ tags: _tags, ...node }) => node,
  );
  const edges: [number, number][] = [];
  for (let i = 0; i < withTags.length; i++) {
    for (let j = i + 1; j < withTags.length; j++) {
      if (withTags[i].tags.some((t) => withTags[j].tags.includes(t))) {
        edges.push([i, j]);
      }
    }
  }

  return { nodes, edges };
}
