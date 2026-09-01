import { useState, type FormEvent } from "react";
import { IconCheck, LogoMark } from "./Icons";

export default function LoginGate({
  busy,
  sent,
  onSend,
  onDemo,
}: {
  busy: boolean;
  sent: boolean;
  onSend: (email: string) => Promise<void>;
  onDemo: () => void;
}) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await onSend(email.trim());
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not send magic link");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-pine-deep px-5">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 480px at 85% 10%, rgba(246,168,28,0.14), transparent 60%), radial-gradient(640px 480px at 8% 90%, rgba(47,143,91,0.16), transparent 60%)",
        }}
      />
      <div className="stripes stripes-anim absolute inset-x-0 top-0 h-2.5" />
      <div className="pointer-events-none absolute -right-16 top-24 hidden rotate-12 select-none font-display text-[220px] font-extrabold leading-none text-card/[0.04] lg:block">
        ₱
      </div>

      <div className="rise relative w-full max-w-md">
        <div className="overflow-hidden rounded-overlay border border-card/10 bg-card shadow-elev-3">
          <div className="stripes-soft h-2" />
          <div className="px-8 py-9">
            <div className="flex items-center gap-3">
              <LogoMark className="h-11 w-11" />
              <div>
                <p className="font-display text-xl font-extrabold leading-none">SukiBook</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-mango-deep">
                  Sari-sari store OS
                </p>
              </div>
            </div>

            <h1 className="mt-6 font-display text-2xl font-extrabold leading-snug">
              Ang ledger ng tindahan mo, <span className="text-leaf">naka-sync sa cloud.</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Sign in with your email — we'll send a one-tap magic link. No passwords to forget,
              data stays yours (row-level security per store).
            </p>

            {sent ? (
              <div className="pop mt-6 rounded-xl border border-leaf/40 bg-leaf-soft p-5 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-leaf text-card">
                  <IconCheck className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-base font-extrabold text-pine">Check your inbox</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  We sent a magic link to <span className="font-semibold text-ink">{email}</span>.
                  Click it and you're in — your store loads instantly.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-6 space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@tindahan.ph"
                  className="field py-3 text-sm"
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-press w-full rounded-lg bg-mango py-3 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-md transition enabled:hover:bg-mango-deep disabled:cursor-wait disabled:opacity-60"
                >
                  {busy ? "Sending link…" : "Send magic link"}
                </button>
                {err && (
                  <p className="rise rounded-md bg-cherry-soft px-3 py-2 text-xs font-semibold text-cherry">{err}</p>
                )}
              </form>
            )}

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              onClick={onDemo}
              className="btn-press w-full rounded-lg border border-line bg-paper py-2.5 text-xs font-extrabold uppercase tracking-wide text-ink-soft transition hover:border-pine hover:text-pine"
            >
              Browse the live demo store
            </button>
            <p className="mt-3 text-center font-mono text-[10px] text-ink-soft">
              Demo uses on-device data · sign in to sync across devices
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-mono text-[10px] text-card/50">
          <span>Vercel · Supabase</span>
          <span className="hidden sm:inline">·</span>
          <span>offline-first</span>
          <span className="hidden sm:inline">·</span>
          <span>EN / Tagalog</span>
        </div>
      </div>
    </div>
  );
}
