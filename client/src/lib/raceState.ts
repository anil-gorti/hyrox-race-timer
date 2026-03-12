import type { Activity, TransitionTime } from "./events";

const RACE_STATE_KEY = "HYFIT_RACE_STATE";
const MAX_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface PersistedRaceState {
  athleteBib: string;
  athleteName: string;
  athletePhone: string;
  athleteCategory: string;
  partnerBib: string;
  partnerName: string;
  activities: Activity[];
  transitionTimes: TransitionTime[];
  activeTargetKind: "activity" | "transition" | null;
  activeTargetId: number | null;
  raceAccumulatedMs: number;
  activityAccumulatedMs: number;
  isRunning: boolean;
  lastSavedAt: number;
}

export function saveRaceState(state: PersistedRaceState): void {
  try {
    localStorage.setItem(RACE_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function loadRaceState(): PersistedRaceState | null {
  try {
    const raw = localStorage.getItem(RACE_STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as PersistedRaceState;
    if (Date.now() - state.lastSavedAt > MAX_AGE_MS) {
      clearRaceState();
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function clearRaceState(): void {
  localStorage.removeItem(RACE_STATE_KEY);
}
