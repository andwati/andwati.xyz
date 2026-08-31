import { getCollection } from "astro:content";

/** "2021–2026" (earliest published writing's year through now), or just
 * "2026" if that's the same year — computed from real content, not a
 * hand-maintained start-year config value. */
export async function copyrightYearRange(): Promise<string> {
  const writings = await getCollection("writings", ({ data }) => !data.draft);
  const currentYear = new Date().getFullYear();
  if (writings.length === 0) return String(currentYear);

  const startYear = Math.min(
    ...writings.map((entry) => entry.data.date.getFullYear()),
  );
  return startYear === currentYear
    ? String(currentYear)
    : `${startYear}–${currentYear}`;
}
