const STORAGE_KEY = "HYFIT_VOLUNTEER";

export function getVolunteerName(): string {
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function setVolunteerName(name: string): void {
  localStorage.setItem(STORAGE_KEY, name);
}
