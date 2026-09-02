import type { DB } from "./data";
import { dailySeries, heatmap, lowStock, overdueDays, peso0, productAgg } from "./data";

export type InsightKind = "warn" | "ok" | "info";
export type InsightView = "dashboard" | "sales" | "products" | "stock" | "utang" | "reports";

export type Insight = {
  id: string;
  kind: InsightKind;
  title: string;
  detail: string;
  action: string;
  view: InsightView;
};

const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_TL = ["Ling", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"];

function hourLabel(h: number): string {
  if (h === 12) return "12 NN";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/** Units sold per product inside an explicit time window. */
function unitsInWindow(db: DB, from: number, to: number): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of db.sales) {
    if (s.ts < from || s.ts >= to) continue;
    for (const it of s.items) m.set(it.productId, (m.get(it.productId) ?? 0) + it.qty);
  }
  return m;
}

function payMixInWindow(db: DB, from: number, to: number): { gcash: number; total: number } {
  let gcash = 0;
  let total = 0;
  for (const s of db.sales) {
    if (s.ts < from || s.ts >= to) continue;
    total += s.total;
    if (s.payment === "gcash") gcash += s.total;
  }
  return { gcash, total };
}

/**
 * The "reads for today" — narrative intelligence derived purely from the
 * live ledger. No AI service: just honest arithmetic on the owner's data.
 */
export function buildInsights(db: DB, lang: "en" | "tl"): Insight[] {
  const out: Insight[] = [];
  const tl = lang === "tl";
  const now = Date.now();
  const DAY = 86400000;
  const days = DAYS_TL.length ? (tl ? DAYS_TL : DAYS_EN) : DAYS_EN;

  /* 1 · restock cue */
  const lows = lowStock(db);
  if (lows.length > 0) {
    const agg = productAgg(db, 7);
    const first = lows[0];
    const rate = (agg.get(first.id)?.units ?? 0) / 7;
    const left = rate > 0 ? (first.stock / rate).toFixed(0) : "—";
    out.push({
      id: "restock",
      kind: "warn",
      title: tl ? `Mag-restock ng ${lows.length} item` : `Restock ${lows.length} item${lows.length > 1 ? "s" : ""}`,
      detail: tl
        ? `${first.name} — ~${left} araw na lang ubos`
        : `${first.name} — about ${left}d of stock left`,
      action: tl ? "Buksan ang imbentaryo" : "Open inventory",
      view: "stock",
    });
  }

  /* 2 · most overdue suki */
  const overdue = [...db.customers]
    .map((c) => ({ c, d: overdueDays(c) }))
    .filter((x) => x.d > 0 && x.c.balance > 0)
    .sort((a, b) => b.d - a.d);
  if (overdue.length > 0) {
    const top = overdue[0];
    out.push({
      id: "overdue",
      kind: "warn",
      title: tl ? `${top.c.name} · ${top.d}d na lampas` : `${top.c.name} · ${top.d}d overdue`,
      detail: tl
        ? `${peso0(top.c.balance)} ang utang — cobrahin na`
        : `${peso0(top.c.balance)} outstanding — time to collect`,
      action: tl ? "Cobrahin" : "Collect",
      view: "utang",
    });
  }

  /* 3 · peak-hour read (from the 4-week heatmap) */
  const grid = heatmap(db);
  let best = { r: 4, c: 11, v: 0 };
  grid.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v > best.v) best = { r, c, v };
    }),
  );
  if (best.v > 0) {
    const dayIdx = [1, 2, 3, 4, 5, 6, 0][best.r]; // grid rows start Monday
    out.push({
      id: "peak",
      kind: "info",
      title: tl ? `Rush: ${days[dayIdx]} ${hourLabel(5 + best.c)}` : `Peak: ${days[dayIdx]} ${hourLabel(5 + best.c)}`,
      detail: tl
        ? "Ayusin ang staff at stock bago ang rush"
        : "Staff up and stock up before the rush",
      action: tl ? "Tingnan ang heatmap" : "See heatmap",
      view: "reports",
    });
  }

  /* 4 · product champion — new #1 detection */
  const cur = unitsInWindow(db, now - 7 * DAY, now);
  const prev = unitsInWindow(db, now - 14 * DAY, now - 7 * DAY);
  const champOf = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1])[0] as [string, number] | undefined;
  const curChamp = champOf(cur);
  const prevChamp = champOf(prev);
  if (curChamp) {
    const p = db.products.find((x) => x.id === curChamp[0]);
    const isNew = prevChamp && prevChamp[0] !== curChamp[0];
    if (p) {
      out.push({
        id: "champ",
        kind: isNew ? "info" : "ok",
        title: tl ? `Si ${p.name} ang bida ngayong linggo` : `${p.name} is this week's champ`,
        detail: tl
          ? `${curChamp[1]} pcs${isNew ? " — bagong #1!" : " — tuloy ang takbo"}`
          : `${curChamp[1]} pcs sold${isNew ? " — new #1!" : " — holding the top spot"}`,
        action: tl ? "Tingnan ang produkto" : "View products",
        view: "products",
      });
    }
  }

  /* 5 · weekend share of revenue */
  const series = dailySeries(db, 14);
  const total14 = series.reduce((s, x) => s + x.revenue, 0);
  const weekend = series
    .filter((x) => {
      const d = new Date(x.ts).getDay();
      return d === 0 || d === 6;
    })
    .reduce((s, x) => s + x.revenue, 0);
  if (total14 > 0) {
    const pct = Math.round((weekend / total14) * 100);
    if (pct >= 45) {
      out.push({
        id: "weekend",
        kind: "info",
        title: tl ? `Sa weekend galing ang ${pct}% ng benta` : `Weekends drive ${pct}% of sales`,
        detail: tl ? "Huling 14 araw — mag-stock tuwing Biyernes" : "Last 14 days — stock heavy on Fridays",
        action: tl ? "Ikumpara ang linggo" : "Compare weeks",
        view: "reports",
      });
    }
  }

  /* 6 · GCash drift vs previous week */
  const g1 = payMixInWindow(db, now - 7 * DAY, now);
  const g0 = payMixInWindow(db, now - 14 * DAY, now - 7 * DAY);
  if (g1.total > 0 && g0.total > 0) {
    const s1 = (g1.gcash / g1.total) * 100;
    const s0 = (g0.gcash / g0.total) * 100;
    const delta = Math.round(s1 - s0);
    if (Math.abs(delta) >= 3) {
      out.push({
        id: "gcash",
        kind: delta > 0 ? "ok" : "info",
        title: tl
          ? `GCash ${delta > 0 ? "tumaas" : "bumaba"} ng ${Math.abs(delta)} pts`
          : `GCash ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} pts`,
        detail: tl
          ? `${Math.round(s1)}% ng benta ngayong linggo vs ${Math.round(s0)}% noong nakaraan`
          : `${Math.round(s1)}% of sales this week vs ${Math.round(s0)}% last`,
        action: tl ? "Payment mix" : "Payment mix",
        view: "reports",
      });
    }
  }

  /* 7 · all-clear when nothing warns */
  if (!out.some((i) => i.kind === "warn")) {
    out.push({
      id: "clear",
      kind: "ok",
      title: tl ? "Malinis ang ledger" : "Ledger's clean",
      detail: tl ? "Walang lampas na utang, walang mababang stock — ayos!" : "No overdue utang, no low stock — smooth sailing",
      action: tl ? "Mag-rekord ng benta" : "Record a sale",
      view: "sales",
    });
  }

  return out.slice(0, 6);
}
