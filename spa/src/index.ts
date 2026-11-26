import { serve } from "bun";
import index from "./index.html";

// Development server only; production serves the built dist/ through server.ts.
const server = serve({
  port: 3111,

  routes: {
    // Toutes les routes renvoient vers la SPA React
    "/*": index,
  },

  development: {
    hmr: false,
    console: false,
  },
});

console.log(`🚀 Front disponible sur ${server.url}`);
