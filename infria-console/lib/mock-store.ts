/**
 * Mock Store — localStorage-based persistence for prototype.
 * Replace with real API calls in production (api-client.ts).
 */

const PREFIX = "infria_mock_";

export const mockStore = {
  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },

  remove(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PREFIX + key);
  },

  getList<T>(key: string): T[] {
    return this.get<T[]>(key) ?? [];
  },

  setList<T>(key: string, list: T[]): void {
    this.set(key, list);
  },
};

// Utility: generate a short random ID
export function generateId(prefix: string, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${slug}-${rand}`;
}

export function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const key = Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return `infria_pk_${key}`;
}

export function maskApiKey(key: string): string {
  if (key.length <= 12) return "infria_pk_****";
  return key.slice(0, 12) + "****" + key.slice(-4);
}

export function now(): string {
  return new Date().toISOString();
}
