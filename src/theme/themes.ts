/**
 * Theme registry — one entry per `data-theme` block in src/index.css.
 * Adding a theme = new entry here + one CSS override block. Nothing else.
 */

export type ThemeKey = "awning" | "barako" | "jeepney" | "gabi";

export interface ThemeMeta {
  key: ThemeKey;
  /** Human name shown in the switchers. */
  name: string;
  /** One-line character description. */
  tagline: string;
  /** [brand surface, accent, paper] — used for the swatch preview dots. */
  swatches: [string, string, string];
  /** Display face sample for the Settings card. */
  font: string;
  /** Browser-chrome color (meta[name=theme-color]). */
  meta: string;
}

export const THEMES: ThemeMeta[] = [
  {
    key: "awning",
    name: "Awning",
    tagline: "The classic tindahan — pine green & mango under the tarpaulin",
    swatches: ["#103524", "#f6a81c", "#f1f2ea"],
    font: '"Bricolage Grotesque Variable", sans-serif',
    meta: "#103524",
  },
  {
    key: "barako",
    name: "Barako",
    tagline: "Kapeng barako counter — espresso, copper & latte paper",
    swatches: ["#241812", "#cf7a2a", "#efe6d8"],
    font: '"Fraunces Variable", serif',
    meta: "#241812",
  },
  {
    key: "jeepney",
    name: "Jeepney",
    tagline: "Hand-painted livery — maroon body, chrome yellow signwriting",
    swatches: ["#4a101f", "#f7c91f", "#f7f2e7"],
    font: '"Alfa Slab One", sans-serif',
    meta: "#4a101f",
  },
  {
    key: "gabi",
    name: "Gabi",
    tagline: "Night shift — deep greens under the lantern's mango glow",
    swatches: ["#12281d", "#f2a91e", "#0b1d15"],
    font: '"Bricolage Grotesque Variable", sans-serif',
    meta: "#06120c",
  },
];
