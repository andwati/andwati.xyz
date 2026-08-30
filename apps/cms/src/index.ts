import type { Core } from "@strapi/strapi";
import {
  importContentFromDisk,
  registerContentSync,
} from "./utils/content-sync";

export default {
  register() {},

  /**
   * content/ is the source of truth (see content/README.md). On boot we
   * import every file into Strapi's DB (a disposable cache), then register
   * a Document Service middleware that writes any create/update/delete made
   * through Strapi straight back to the same files.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    registerContentSync(strapi as never);
    await importContentFromDisk(strapi as never);
  },
};
