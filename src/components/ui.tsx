import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import type { Payment } from "../lib/data";
import { IconAlert, IconCheck, IconMinus, IconPlus, IconSync } from "./Icons";

/* ------------------------------ CountUp --------------------------- */

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CountUp({
  value,
  fmt = (n: number) => Math.round(n).toLocaleString("en-PH"),
  className = "",
  dur = 950,
}: {
  value: number;
  fmt?: (n: number) => string;
  className?: string;
  dur?: number;
}) {
  const [v, setV] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    if (reducedMotion()) {
      fromRef.current = value;
      setV(value);
      return;
    }
    const from = fromRef.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (value - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return <span className={`tnum ${className}`}>{fmt(v)}</span>;
}

/* ------------------------------ Reveal ---------------------------- */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------ Modal ----------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-pine-deep/55">
      <div className="flex min-h-full items-center justify-center p-4" onClick={onClose}>
        <div
          className={`pop w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-xl border border-line bg-card shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="font-display text-lg font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="btn-press rounded-md p-1.5 text-ink-soft transition hover:bg-paper"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Stepper --------------------------- */

export function Stepper({
  value,
  onChange,
  min = 1,
  small = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  small?: boolean;
}) {
  const btn = `btn-press flex items-center justify-center rounded-md border border-line bg-card text-ink transition hover:border-pine hover:bg-pine-soft ${
    small ? "h-7 w-7" : "h-9 w-9"
  }`;
  return (
    <div className="flex items-center gap-1.5">
      <button className={btn} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Less">
        <IconMinus className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      <span className={`tnum text-center font-mono font-semibold ${small ? "w-7 text-sm" : "w-9 text-base"}`}>
        {value}
      </span>
      <button className={btn} onClick={() => onChange(value + 1)} aria-label="More">
        <IconPlus className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}

/* --------------------------- Segmented ---------------------------- */

export function Seg<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { key: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`btn-press rounded-md font-semibold transition ${
            size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
          } ${
            value === o.key
              ? "bg-pine text-mango shadow-sm"
              : "text-ink-soft hover:bg-card hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------- PayBadge ---------------------------- */

const PAY_META: Record<Payment, { label: string; cls: string; dot: string }> = {
  cash: { label: "Cash", cls: "bg-leaf-soft text-leaf", dot: "bg-leaf" },
  gcash: { label: "GCash", cls: "bg-gcash-soft text-gcash", dot: "bg-gcash" },
  utang: { label: "Utang", cls: "bg-cherry-soft text-cherry", dot: "bg-cherry" },
};

export function PayBadge({ p, size = "md" }: { p: Payment; size?: "sm" | "md" }) {
  const m = PAY_META[p];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${m.cls} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

/* ------------------------------ Delta ----------------------------- */

export function Delta({ pct, invert = false }: { pct: number; invert?: boolean }) {
  const up = pct >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className={`tnum inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${
        good ? "bg-leaf-soft text-leaf" : "bg-cherry-soft text-cherry"
      }`}
    >
      <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 ${up ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" />
      </svg>
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

/* --------------------------- Field/Input --------------------------- */

export function Field({
  label,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
        {label}
      </span>
      <input {...rest} className="field" />
    </label>
  );
}

/* --------------------------- TwoStepDelete ------------------------- */

export function TwoStepDelete({
  onConfirm,
  label = "Sure?",
}: {
  onConfirm: () => void;
  label?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 2600);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      className={`btn-press rounded-md px-2 py-1 text-[11px] font-bold transition ${
        armed
          ? "bg-cherry text-cherry-soft"
          : "text-ink-soft hover:bg-cherry-soft hover:text-cherry"
      }`}
    >
      {armed ? label : "Void"}
    </button>
  );
}

/* --------------------------- SyncPill ------------------------------ */

export function SyncPill({
  status,
  last,
  syncedLabel,
  syncingLabel,
}: {
  status: "synced" | "syncing";
  last: number;
  syncedLabel: string;
  syncingLabel: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
        status === "syncing"
          ? "border-mango/60 bg-mango-soft text-mango-deep"
          : "border-line bg-card text-ink-soft"
      }`}
    >
      {status === "syncing" ? (
        <IconSync className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <span className="pulse-dot h-2 w-2 rounded-full bg-leaf" />
      )}
      {status === "syncing" ? syncingLabel : `${syncedLabel} · ${fmtAgo(last)}`}
    </span>
  );
}

function fmtAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/* --------------------------- ToastHost ----------------------------- */

export function ToastHost({
  toasts,
}: {
  toasts: { id: number; kind: "ok" | "warn" | "info"; title: string; sub?: string }[];
}) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in pointer-events-auto flex items-start gap-3 rounded-lg border border-pine/40 bg-pine px-4 py-3 text-card shadow-xl"
        >
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              t.kind === "ok" ? "bg-leaf" : t.kind === "warn" ? "bg-mango text-pine-deep" : "bg-pine-soft text-pine"
            }`}
          >
            {t.kind === "ok" ? (
              <IconCheck className="h-3.5 w-3.5" />
            ) : t.kind === "warn" ? (
              <IconAlert className="h-3.5 w-3.5" />
            ) : (
              <IconSync className="h-3.5 w-3.5" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">{t.title}</p>
            {t.sub && <p className="mt-0.5 truncate text-xs text-card/70">{t.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
