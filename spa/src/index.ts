import { serve } from "bun";
import index from "./index.html";

const server = serve({
  port: 3111,

  routes: {
    // Toutes les routes renvoient vers la SPA React
    "/*": index,
  },

  development:
    process.env.NODE_ENV !== "production"
      ? {
          hmr: true,
          console: true,
        }
      : undefined,
});

console.log(`🚀 Front disponible sur ${server.url}`);