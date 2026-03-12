import { fetchAdminPin } from "./eventService";

export type AppRole = "admin" | "user";

const STORAGE_KEY = "HYFIT_ROLE";

export function getRole(): AppRole {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "admin" || stored === "user") return stored;
  return "user";
}

export function setRole(role: AppRole): void {
  localStorage.setItem(STORAGE_KEY, role);
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}

/** Check PIN against the event's admin_pin in Supabase (with fallback) */
export async function checkAdminPin(pin: string): Promise<boolean> {
  const correctPin = await fetchAdminPin();
  return pin.trim() === correctPin;
}

/** Synchronous fallback for offline scenarios */
export function checkAdminPinSync(pin: string): boolean {
  return pin.trim() === "admin";
}

export async function setAdminWithPin(pin: string): Promise<boolean> {
  const valid = await checkAdminPin(pin);
  if (!valid) return false;
  setRole("admin");
  return true;
}
