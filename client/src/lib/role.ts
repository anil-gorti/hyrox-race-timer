export type AppRole = "admin" | "user";

const STORAGE_KEY = "HYROX_ROLE";
const ADMIN_PIN = "admin"; // Simple PIN to unlock admin; change for production

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

export function checkAdminPin(pin: string): boolean {
  return pin.trim() === ADMIN_PIN;
}

export function setAdminWithPin(pin: string): boolean {
  if (!checkAdminPin(pin)) return false;
  setRole("admin");
  return true;
}
