// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { siteConfig } from "./src/site.config.ts";

// https://astro.build/config
export default defineConfig({
  site: siteConfig.baseUrl,
  integrations: [sitemap()],
});
