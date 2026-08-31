import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = fileURLToPath(new URL("../../public/", import.meta.url));

/** Books/papers reference a cover_image path that may not have been fetched
 * yet (the ISBN/DOI lookup only runs on live Strapi create/update, not for
 * hand-seeded content) — check the file is actually there before rendering
 * an <img> that would otherwise 404. */
export function coverExists(
  coverImage: string | undefined,
): coverImage is string {
  if (!coverImage) return false;
  return existsSync(join(publicDir, coverImage.replace(/^\//, "")));
}
