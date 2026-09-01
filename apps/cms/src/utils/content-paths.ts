import { isAbsolute, join, resolve } from "node:path";

/**
 * Root of the Git checkout that owns content/ and apps/site/public/covers/.
 * Production points this at the persistent checkout prepared by the
 * container entrypoint; local development falls back to the workspace root.
 */
export function repositoryRoot(): string {
  const configured = process.env.CONTENT_REPOSITORY_ROOT;
  if (!configured) return resolve(process.cwd(), "..", "..");
  return isAbsolute(configured)
    ? configured
    : resolve(process.cwd(), configured);
}

export function contentRoot(): string {
  return join(repositoryRoot(), "content");
}

export function coversRoot(): string {
  return join(repositoryRoot(), "apps", "site", "public", "covers");
}
