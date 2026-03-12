import { getEventConfigSync, type EventConfig } from "./eventService";

// Re-export for backward compatibility
export type { EventConfig };

/** Synchronous getter for immediate render (reads from localStorage cache) */
export function getEventConfig(): EventConfig {
  return getEventConfigSync();
}

/** Synchronous setter for localStorage cache (used by admin before Supabase save) */
export function setEventConfig(config: Partial<EventConfig>): void {
  const current = getEventConfigSync();
  const next = { ...current, ...config };
  localStorage.setItem("HYFIT_EVENT_CONFIG", JSON.stringify(next));
}
