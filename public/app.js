/* Stable boot shim — loaded by the fallback path in index.html.
   Tries the sibling assets folder first (served from dist/), then the
   repo layout (served from project root). Keep hashes in sync with builds. */
const BASES = ["./assets/index-Bp19ciYX.js", "../dist/assets/index-Bp19ciYX.js"];
async function boot() {
  for (const src of BASES) {
    try {
      await import(src);
      return;
    } catch (e) {
      // try next base
    }
  }
}
boot();
