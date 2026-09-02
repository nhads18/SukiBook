/* Stable boot shim for the production bundle. The preview fallback loader in
   index.html imports this file, which resolves the real hashed entry module.
   Two relative paths cover dist-root and project-root serving layouts.
   Keep the hash in sync with `npm run build` output. */
import("./assets/index-Fpq_nC3V.js").catch(() => import("../dist/assets/index-Fpq_nC3V.js"));
