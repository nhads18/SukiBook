import { useEffect, useRef, useState } from "react";
import {
  IDLE_LIMIT_MS,
  MAX_FAILS,
  PIN_MAX,
  PIN_MIN,
  remainingFails,
  type StoredUser,
} from "../lib/auth";
import { IconBackspace, IconCheck, IconLock, LogoMark } from "./Icons";

export type AuthPhase = "register" | "login" | "locked";

/* ------------------------------- PinPad ---------------------------- */

function PinPad({
  pin,
  onChange,
  onSubmit,
  submitLabel,
  disabled,
  shakeKey,
}: {
  pin: string;
  onChange: (pin: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled: boolean;
  shakeKey: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key)) onChange((pin + e.key).slice(0, PIN_MAX));
      else if (e.key === "Backspace") onChange(pin.slice(0, -1));
      else if (e.key === "Enter" && pin.length >= PIN_MIN) onSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin, disabled, onChange, onSubmit]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div key={shakeKey} className={shakeKey > 0 ? "shake" : undefined}>
      {/* dots */}
      <div className="mb-4 flex items-center justify-center gap-2.5">
        {Array.from({ length: PIN_MAX }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? "scale-110 border-mango bg-mango"
                : "border-line bg-transparent"
            }`}
          />
        ))}
      </div>

      <div className="mx-auto grid max-w-64 grid-cols-3 gap-2">
        {keys.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              disabled={disabled}
              onClick={() => {
                if (k === "back") onChange(pin.slice(0, -1));
                else onChange((pin + k).slice(0, PIN_MAX));
              }}
              aria-label={k === "back" ? "Delete digit" : `Digit ${k}`}
              className={`btn-press flex h-14 items-center justify-center rounded-xl border font-display text-xl font-bold transition disabled:opacity-40 ${
                k === "back"
                  ? "border-line bg-paper text-ink-soft hover:border-cherry hover:text-cherry"
                  : "border-line bg-card text-pine shadow-sm hover:border-pine hover:bg-pine-soft active:bg-mango-soft"
              }`}
            >
              {k === "back" ? <IconBackspace className="h-5 w-5" /> : k}
            </button>
          ),
        )}
      </div>

      <button
        onClick={onSubmit}
        disabled={disabled || pin.length < PIN_MIN}
        className="btn-press mt-4 w-full rounded-xl bg-mango py-3 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-md transition enabled:hover:bg-mango-deep disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitLabel}
      </button>
      <p className="mt-2 text-center font-mono text-[10px] text-ink-soft">
        {PIN_MIN}–{PIN_MAX} digits · keyboard works too
      </p>
    </div>
  );
}

/* ----------------------------- AuthScreen -------------------------- */

export default function AuthScreen({
  phase,
  email,
  users,
  onRegister,
  onSignIn,
  onUnlock,
  onResetAccount,
}: {
  phase: AuthPhase;
  email: string | null;
  users: Pick<StoredUser, "email" | "name" | "storeName">[];
  onRegister: (email: string, name: string, storeName: string, pin: string) => Promise<string | null>;
  onSignIn: (email: string, pin: string) => Promise<string | null>;
  onUnlock: (pin: string) => Promise<string | null>;
  onResetAccount: (email: string) => void;
}) {
  const [step, setStep] = useState(0); // register: 0 details · 1 set PIN · 2 confirm
  const [form, setForm] = useState({ storeName: "", name: "", email: "" });
  const [loginEmail, setLoginEmail] = useState(users[0]?.email ?? "");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [lockLeft, setLockLeft] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const timer = useRef<number | null>(null);

  const fail = (msg: string) => {
    setError(msg);
    setShakeKey((k) => k + 1);
    setPin("");
    // surface any fresh lockout countdown
    const target = loginEmail || email || "";
    if (target) {
      const left = Math.max(0, MAX_FAILS - remainingFails(target));
      void left;
    }
  };

  /* lockout countdown ticker */
  useEffect(() => {
    if (lockLeft <= 0) return;
    timer.current = window.setInterval(() => {
      setLockLeft((s) => {
        if (s <= 1) {
          if (timer.current) window.clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [lockLeft]);

  const parseLockout = (msg: string) => {
    const m = msg.match(/(\d+)s/);
    if (m) setLockLeft(parseInt(m[1], 10));
  };

  const submitDetails = () => {
    setError(null);
    if (!form.storeName.trim()) return fail("Store name is required");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return fail("Enter a valid email");
    setStep(1);
    setPin("");
  };

  const submitSetPin = async () => {
    setError(null);
    setFirstPin(pin);
    setPin("");
    setStep(2);
  };

  const submitConfirmPin = async () => {
    setBusy(true);
    setError(null);
    try {
      if (pin !== firstPin) {
        setStep(1);
        setFirstPin("");
        fail("PINs did not match — set it again");
        return;
      }
      const err = await onRegister(form.email.trim(), form.name.trim(), form.storeName.trim(), pin);
      if (err) {
        setStep(0);
        fail(err);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      const err = await onSignIn(loginEmail, pin);
      if (err) {
        if (err.startsWith("Locked")) parseLockout(err);
        fail(err);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitUnlock = async () => {
    setBusy(true);
    setError(null);
    try {
      const err = await onUnlock(pin);
      if (err) {
        if (err.startsWith("Locked")) parseLockout(err);
        fail(err);
      }
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || lockLeft > 0;

  /* ------------------------------ copy ----------------------------- */

  const heading =
    phase === "register"
      ? step === 0
        ? "Open your counter"
        : step === 1
          ? "Set your register PIN"
          : "One more time"
      : phase === "locked"
        ? "Register locked"
        : "Welcome back";

  const sub =
    phase === "register"
      ? step === 0
        ? "One owner account guards the whole ledger — helpers get scoped roles inside."
        : step === 1
          ? "Like a cash drawer code: quick to tap, hard to guess."
          : "Confirm the PIN to seal the account."
      : phase === "locked"
        ? `Idle for ${Math.round(IDLE_LIMIT_MS / 60000)} minutes — enter your PIN to reopen the store.`
        : "Enter your PIN to open the store.";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-pine-deep px-5 py-10">
      {/* ambient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 82% 8%, color-mix(in srgb, var(--color-mango) 13%, transparent), transparent 60%), radial-gradient(700px 520px at 8% 92%, color-mix(in srgb, var(--color-leaf) 16%, transparent), transparent 60%)",
        }}
      />
      <div className="stripes stripes-anim absolute inset-x-0 top-0 h-2.5" />
      <div className="pointer-events-none absolute -left-20 bottom-0 hidden select-none font-display text-[300px] font-extrabold leading-none text-card/[0.04] lg:block">
        ₱
      </div>

      <div className="rise relative grid w-full max-w-4xl gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        {/* brand side */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-3">
            <LogoMark className="h-12 w-12" />
            <div>
              <p className="font-display text-2xl font-extrabold leading-none text-card">SukiBook</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-mango">Sari-sari store OS</p>
            </div>
          </div>
          <h1 className="mt-8 font-display text-5xl font-extrabold leading-[1.04] text-card">
            Bawat piso,
            <br />
            <span className="text-mango">may tala.</span>
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-card/70">
            Sales, stock, utang and reports — guarded by your register PIN. Every peso is recorded,
            every login is verified.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "PIN auth — salted & hashed, never stored in plain text",
              "Auto-locks after 5 minutes idle, per spec §10",
              "5 wrong tries → 30-second lockout",
              "Owner, helper & accountant roles inside the store",
            ].map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-card/85">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mango text-pine-deep">
                  <IconCheck className="h-3 w-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* auth card */}
        <div className="mx-auto w-full max-w-md">
          <div className="overflow-hidden rounded-overlay border border-card/10 bg-card shadow-elev-3">
            <div className="stripes-soft h-2" />
            <div className="px-7 pb-7 pt-6">
              <div className="mb-5 flex items-center gap-3 lg:hidden">
                <LogoMark className="h-10 w-10" />
                <p className="font-display text-lg font-extrabold">SukiBook</p>
              </div>

              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine text-mango">
                  <IconLock className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-extrabold leading-tight">{heading}</h2>
                  {phase === "register" && (
                    <div className="mt-1 flex gap-1">
                      {[0, 1, 2].map((s) => (
                        <span key={s} className={`h-1 w-6 rounded-full ${s <= step ? "bg-mango" : "bg-line"}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="mb-5 text-xs leading-relaxed text-ink-soft">{sub}</p>

              {lockLeft > 0 && (
                <div className="pop mb-4 rounded-lg border border-cherry/40 bg-cherry-soft px-3.5 py-2.5 text-center">
                  <p className="text-xs font-bold text-cherry">
                    Too many tries — pad locked for <span className="tnum font-mono">{lockLeft}s</span>
                  </p>
                </div>
              )}

              {error && lockLeft === 0 && (
                <p className="rise mb-4 rounded-md bg-cherry-soft px-3 py-2 text-xs font-semibold text-cherry">{error}</p>
              )}

              {/* register step 0: details */}
              {phase === "register" && step === 0 && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">Store name</span>
                    <input
                      className="field"
                      value={form.storeName}
                      onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                      placeholder="Aling Nena's Store"
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">Owner name</span>
                    <input
                      className="field"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Aling Nena"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">Email</span>
                    <input
                      className="field"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="nena@tindahan.ph"
                      onKeyDown={(e) => e.key === "Enter" && submitDetails()}
                    />
                  </label>
                  <button
                    onClick={submitDetails}
                    className="btn-press mt-1 w-full rounded-xl bg-mango py-3 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-md transition hover:bg-mango-deep"
                  >
                    Continue
                  </button>
                </div>
              )}

              {/* register steps 1–2 · login · locked: PIN pad */}
              {phase === "register" && step > 0 && (
                <PinPad
                  pin={pin}
                  onChange={setPin}
                  onSubmit={step === 1 ? submitSetPin : submitConfirmPin}
                  submitLabel={step === 1 ? "Set PIN" : "Confirm & open store"}
                  disabled={disabled}
                  shakeKey={shakeKey}
                />
              )}

              {phase === "login" && (
                <div>
                  {users.length > 1 ? (
                    <div className="mb-4 grid gap-2">
                      {users.map((u) => (
                        <button
                          key={u.email}
                          onClick={() => {
                            setLoginEmail(u.email);
                            setError(null);
                          }}
                          className={`btn-press flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                            loginEmail === u.email ? "border-pine bg-pine text-card" : "border-line bg-paper/60 hover:border-pine/50"
                          }`}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-extrabold ${loginEmail === u.email ? "bg-mango text-pine-deep" : "bg-pine text-mango"}`}>
                            {u.name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">{u.storeName}</span>
                            <span className={`block truncate font-mono text-[10px] ${loginEmail === u.email ? "text-card/60" : "text-ink-soft"}`}>{u.email}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-paper/70 px-3 py-2 text-center font-mono text-[11px] text-ink-soft">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pine font-display text-[10px] font-extrabold text-mango">
                        {(users[0]?.name ?? "O").slice(0, 1).toUpperCase()}
                      </span>
                      {users[0]?.storeName} · {loginEmail}
                    </p>
                  )}
                  <PinPad
                    pin={pin}
                    onChange={setPin}
                    onSubmit={submitLogin}
                    submitLabel={busy ? "Checking…" : "Unlock store"}
                    disabled={disabled}
                    shakeKey={shakeKey}
                  />
                  <div className="mt-4 text-center">
                    {confirmReset ? (
                      <p className="rise text-[11px] text-ink-soft">
                        Reset removes the account (ledger data stays).{" "}
                        <button
                          onClick={() => onResetAccount(loginEmail)}
                          className="font-bold text-cherry underline underline-offset-2"
                        >
                          Yes, reset
                        </button>{" "}
                        ·{" "}
                        <button onClick={() => setConfirmReset(false)} className="font-bold text-pine underline underline-offset-2">
                          Keep it
                        </button>
                      </p>
                    ) : (
                      <button onClick={() => setConfirmReset(true)} className="text-[11px] font-semibold text-ink-soft underline decoration-dotted underline-offset-2 transition hover:text-cherry">
                        Forgot PIN? Reset account
                      </button>
                    )}
                  </div>
                </div>
              )}

              {phase === "locked" && (
                <div>
                  <p className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-paper/70 px-3 py-2 text-center font-mono text-[11px] text-ink-soft">
                    <IconLock className="h-3.5 w-3.5" />
                    {email}
                  </p>
                  <PinPad
                    pin={pin}
                    onChange={setPin}
                    onSubmit={submitUnlock}
                    submitLabel={busy ? "Checking…" : "Reopen store"}
                    disabled={disabled}
                    shakeKey={shakeKey}
                  />
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 text-center font-mono text-[10px] text-card/50">
            Offline-first · PIN hashed on-device · session ends after 8 h
          </p>
        </div>
      </div>
    </div>
  );
}
