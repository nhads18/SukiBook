/* Stable boot shim — resolves the hashed production bundle.
   Dual-path: works whether this page is served from dist/ or the project root. */
async function start() {
  try {
    await import("./assets/index-4oeHuj32.js");
  } catch (_e) {
    await import("../dist/assets/index-4oeHuj32.js");
  }
}
start();
