/* Stable boot shim — resolved by the dual-boot loader in index.html when the
   dev entry (/src/main.tsx) cannot execute (no live transform on the host).
   Tries same-directory assets first (dist root), then ../dist (project root).
   Keep the hashes in sync with `npm run build` output. */
import("./assets/index-BsnBlOD2.js").catch(() => import("../dist/assets/index-BsnBlOD2.js"));
