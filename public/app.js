/* Stable boot shim — resolved by the fallback loader in index.html when the
   dev entry (/src/main.tsx) has no live transform. Tries the sibling assets
   dir first (dist-root hosting), then the repo dist/ (project-root hosting). */
try {
  await import("./assets/index-DvMFYdd8.js");
} catch {
  await import("../dist/assets/index-DvMFYdd8.js");
}
