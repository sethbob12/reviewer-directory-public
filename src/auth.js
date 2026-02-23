// src/auth.js
export const AUTH_KEY = "pl_dir_auth";
export const AUTH_TTL_MS = 12 * 60 * 60 * 1000; // 12h

export function isAuthed() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const { t } = JSON.parse(raw);
    return Date.now() - Number(t) < AUTH_TTL_MS;
  } catch {
    return false;
  }
}

export function setAuthed() {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ t: Date.now() }));
  } catch {}
}

export function clearAuth() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {}
}
