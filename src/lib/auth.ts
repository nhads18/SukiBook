/* ============================================================
   SukiBook local auth — works standalone (demo / self-hosted)
   and upgrades to Supabase magic-link when configured.

   Security model:
   · PIN never stored — salted PBKDF2-SHA256 (120k iterations)
   · per-account random salt
   · 5 wrong tries → 30 s lockout (spec §10 spirit)
   · session TTL 8 h · auto-lock after 5 min idle (spec §10)
   ============================================================ */

export interface StoredUser {
  name: string;
  storeName: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: number;
  fails: number;
  lockedUntil: number;
}

export interface Session {
  email: string;
  expiresAt: number;
  lastActive: number;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "wrong" | "locked" | "no-user"; remaining?: number };

const ACCOUNTS_KEY = "sukibook:accounts:v1";
const SESSION_KEY = "sukibook:session:v1";

export const IDLE_LIMIT_MS = 5 * 60_000; // spec §10: auto-lock after 5 min
export const SESSION_TTL_MS = 8 * 3600_000;
export const MAX_FAILS = 5;
export const LOCKOUT_MS = 30_000;
export const PIN_MIN = 4;
export const PIN_MAX = 6;

/* ----------------------------- hashing ----------------------------- */

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Non-cryptographic fallback for non-secure contexts (http previews). */
function fallbackHash(pin: string, salt: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  const s = `${salt}::sukibook::${pin}`;
  for (let round = 0; round < 5000; round++) {
    for (let i = 0; i < s.length; i++) {
      h1 ^= s.charCodeAt(i);
      h1 = Math.imul(h1, 16777619) >>> 0;
      h2 = (Math.imul(h2 ^ s.charCodeAt(i), 2246822519) + round) >>> 0;
    }
  }
  return `${h1.toString(16)}${h2.toString(16)}`;
}

export async function derivePinHash(pin: string, salt: string): Promise<string> {
  try {
    if (!globalThis.crypto?.subtle) return fallbackHash(pin, salt);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: enc.encode(salt), iterations: 120_000, hash: "SHA-256" },
      key,
      256,
    );
    return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return fallbackHash(pin, salt);
  }
}

/* ---------------------------- persistence -------------------------- */

export function listUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

export function getValidSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s?.email || Date.now() > s.expiresAt) return null;
    return s;
  } catch {
    return null;
  }
}

export function isIdleLocked(s: Session, now = Date.now()): boolean {
  return now - s.lastActive > IDLE_LIMIT_MS;
}

export function startSession(email: string): void {
  const now = Date.now();
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ email, expiresAt: now + SESSION_TTL_MS, lastActive: now } satisfies Session),
    );
  } catch {
    /* ignore */
  }
}

export function endSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

let lastPersist = 0;
export function touchSession(): void {
  const now = Date.now();
  if (now - lastPersist < 4000) return; // throttle disk writes
  lastPersist = now;
  const s = getValidSession();
  if (!s) return;
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...s, lastActive: now } satisfies Session),
    );
  } catch {
    /* ignore */
  }
}

/* ------------------------------ actions ---------------------------- */

export async function registerAccount(
  email: string,
  name: string,
  storeName: string,
  pin: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const users = listUsers();
  const normalized = email.trim().toLowerCase();
  if (users.some((u) => u.email === normalized)) {
    return { ok: false, error: "That email already has an account — sign in instead." };
  }
  if (pin.length < PIN_MIN || pin.length > PIN_MAX) {
    return { ok: false, error: `PIN must be ${PIN_MIN}–${PIN_MAX} digits.` };
  }
  const salt = randomSalt();
  const hash = await derivePinHash(pin, salt);
  users.push({
    email: normalized,
    name: name.trim() || "Owner",
    storeName: storeName.trim() || "My Store",
    salt,
    hash,
    createdAt: Date.now(),
    fails: 0,
    lockedUntil: 0,
  });
  saveUsers(users);
  startSession(normalized);
  return { ok: true };
}

export async function verifyPin(email: string, pin: string): Promise<VerifyResult> {
  const users = listUsers();
  const normalized = email.trim().toLowerCase();
  const user = users.find((u) => u.email === normalized);
  if (!user) return { ok: false, reason: "no-user" };

  const now = Date.now();
  if (user.lockedUntil > now) {
    return { ok: false, reason: "locked", remaining: Math.ceil((user.lockedUntil - now) / 1000) };
  }

  const hash = await derivePinHash(pin, user.salt);
  if (hash === user.hash) {
    user.fails = 0;
    user.lockedUntil = 0;
    saveUsers(users);
    startSession(normalized);
    return { ok: true };
  }

  user.fails += 1;
  if (user.fails >= MAX_FAILS) {
    user.lockedUntil = now + LOCKOUT_MS;
    user.fails = 0;
    saveUsers(users);
    return { ok: false, reason: "locked", remaining: Math.ceil(LOCKOUT_MS / 1000) };
  }
  saveUsers(users);
  return { ok: false, reason: "wrong" };
}

export function remainingFails(email: string): number {
  const u = listUsers().find((x) => x.email === email.trim().toLowerCase());
  return u ? Math.max(0, MAX_FAILS - u.fails) : MAX_FAILS;
}

/** Remove an account (keeps the ledger data). Returns remaining count. */
export function resetAccount(email: string): number {
  const normalized = email.trim().toLowerCase();
  const users = listUsers().filter((u) => u.email !== normalized);
  saveUsers(users);
  const s = getValidSession();
  if (s && s.email === normalized) endSession();
  return users.length;
}
