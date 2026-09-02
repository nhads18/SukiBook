import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import type { Toast } from "../lib/store";
import { IconAlert, IconCheck, IconMinus, IconPlus, IconSync, IconX } from "./Icons";

/* ------------------------------ CountUp ---------------------------- */

export function CountUp({
  value,
  fmt = (n) => String(Math.round(n)),
}: {
  value: number;
  fmt?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const t0 = performance.now();
    const dur = 600;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className="tnum">{fmt(display)}</span>;
}

/* ------------------------------ Reveal ----------------------------- */

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
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ------------------------------- Modal ------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  /* Escape closes, Tab cycles within the dialog, focus returns on close. */
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    window.setTimeout(() => panelRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const el = panelRef.current;
      if (!el) return;
      const focusables = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-pine-deep/60 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="pop relative w-full max-w-md rounded-xl border border-line bg-card p-5 shadow-2xl outline-none">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="btn-press rounded-md p-1.5 text-ink-soft transition hover:bg-paper hover:text-ink" aria-label="Close">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------- Field ------------------------------ */

export function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">{label}</span>
      <input {...props} className={`field ${props.className ?? ""}`} />
    </label>
  );
}

/* ------------------------------ Stepper ----------------------------- */

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
  const btn = `btn-press flex items-center justify-center rounded-md bg-pine text-mango transition hover:bg-pine-deep ${small ? "h-6 w-6" : "h-9 w-9"}`;
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => onChange(Math.max(min, value - 1))} className={btn} aria-label="Decrease">
        <IconMinus className={small ? "h-3 w-3" : "h-4 w-4"} />
      </button>
      <span className={`tnum text-center font-mono font-bold ${small ? "w-6 text-xs" : "w-8 text-base"}`}>{value}</span>
      <button onClick={() => onChange(value + 1)} className={btn} aria-label="Increase">
        <IconPlus className={small ? "h-3 w-3" : "h-4 w-4"} />
      </button>
    </div>
  );
}

/* -------------------------------- Seg ------------------------------- */

export function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-paper p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`btn-press rounded-md px-3 py-1.5 text-xs font-bold transition ${
            value === o.key ? "bg-pine text-mango shadow-sm" : "text-ink-soft hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ SyncPill ---------------------------- */

export function SyncPill({ status, label }: { status: "synced" | "syncing"; label: string }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
        status === "syncing" ? "bg-mango-soft text-mango-deep" : "bg-leaf-soft text-leaf"
      }`}
    >
      <IconSync className={`h-3.5 w-3.5 ${status === "syncing" ? "animate-spin" : ""}`} />
      {status === "syncing" ? "Syncing…" : label}
    </span>
  );
}

/* ------------------------------ ToastHost --------------------------- */

export function ToastHost({ toasts }: { toasts: Toast[] }) {
  const tint = {
    ok: "border-leaf/40 bg-leaf text-card",
    warn: "border-cherry/40 bg-cherry text-card",
    info: "border-pine/40 bg-pine text-mango",
  } as const;
  const icon = {
    ok: <IconCheck className="h-4 w-4" />,
    warn: <IconAlert className="h-4 w-4" />,
    info: <IconSync className="h-4 w-4" />,
  } as const;
  return (
    <div role="status" aria-live="polite" className="safe-b pointer-events-none fixed bottom-4 right-4 z-[60] flex w-72 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-in flex items-start gap-2.5 rounded-lg border px-3.5 py-3 shadow-lg ${tint[t.kind]}`}>
          <span className="mt-0.5 shrink-0">{icon[t.kind]}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">{t.title}</p>
            {t.sub && <p className="mt-0.5 truncate text-xs opacity-80">{t.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- Delta ----------------------------- */

export function Delta({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={`tnum inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
        up ? "bg-leaf-soft text-leaf" : "bg-cherry-soft text-cherry"
      }`}
      title="vs previous period"
    >
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}
