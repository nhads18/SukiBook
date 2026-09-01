/* Stable boot shim — resolves the real (hashed) production entry under any
   hosting layout: dist root, project root, or sub-path. Kept in sync with builds. */
import("./assets/index-DoxtQzPV.js").catch(() => import("../dist/assets/index-DoxtQzPV.js"));
