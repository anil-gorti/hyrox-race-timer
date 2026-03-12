import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  Activity, ActivityType, ActivityStatus, TransitionTime,
  getStoredActivities, buildDefaultTransitionTimes
} from "@/lib/events";
import { getEventConfig, type EventConfig } from "@/lib/eventConfig";
import { getVolunteerName } from "@/lib/volunteer";
import { getActiveEventId } from "@/lib/eventService";
import { saveRaceState, clearRaceState, type PersistedRaceState } from "@/lib/raceState";
import { enqueueResult, drainQueue } from "@/lib/offlineQueue";
import { refreshAthleteCache } from "@/lib/athleteCache";
import { playRaceCompleteSound, speakActivityName } from "@/lib/audio";
import { hapticRaceComplete } from "@/lib/haptics";

type TimerTarget = { kind: "activity"; id: number } | { kind: "transition"; afterActivityId: number } | null;

export interface RaceState {
  // Athlete
  athleteName: string;
  athletePhone: string;
  athleteBib: string;
  athleteCategory: string;
  partnerName: string;
  partnerBib: string;
  // Activities & transitions
  activities: Activity[];
  transitionTimes: TransitionTime[];
  // Timer
  activeTarget: TimerTarget;
  isRunning: boolean;
  timerMs: number;
  raceElapsedMs: number;
  isRaceRunning: boolean;
  // Derived
  completedCount: number;
  totalTransitionMs: number;
  allComplete: boolean;
  activeActivity: Activity | null;
  lastCompletedActivityId: number | null;
  lastCompletedKind: "activity" | "transition" | null;
  // Sync
  hasSynced: boolean;
  eventConfig: EventConfig;
}

export interface RaceActions {
  setAthleteName: (v: string) => void;
  setAthletePhone: (v: string) => void;
  setAthleteBib: (v: string) => void;
  setAthleteCategory: (v: string) => void;
  setPartnerName: (v: string) => void;
  setPartnerBib: (v: string) => void;
  selectActivity: (id: number) => void;
  selectTransition: (afterActivityId: number) => void;
  completeActivity: () => void;
  completeTransition: () => void;
  startTimer: () => void;
  pauseTimer: () => void;
  beginTimer: (fromMs?: number) => void;
  resetCurrentTimer: () => void;
  redoActivity: (id: number) => void;
  redoTransition: (afterId: number) => void;
  goBackOneStep: () => void;
  resetRace: () => void;
  restoreRace: (state: PersistedRaceState) => void;
  bumpActiveCounter: (delta: number) => void;
  handleComplete: (() => void) | undefined;
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
}

const RaceContext = createContext<(RaceState & RaceActions) | null>(null);

export function useRace() {
  const ctx = useContext(RaceContext);
  if (!ctx) throw new Error("useRace must be used within RaceProvider");
  return ctx;
}

export function RaceProvider({ children }: { children: ReactNode }) {
  const [athleteName, setAthleteName] = useState("");
  const [athletePhone, setAthletePhone] = useState("");
  const [athleteBib, setAthleteBib] = useState("");
  const [athleteCategory, setAthleteCategory] = useState("Singles Open Male");
  const [partnerName, setPartnerName] = useState("");
  const [partnerBib, setPartnerBib] = useState("");

  const [activities, setActivities] = useState<Activity[]>(getStoredActivities());
  const [transitionTimes, setTransitionTimes] = useState<TransitionTime[]>([]);
  const [hasSynced, setHasSynced] = useState(false);

  const [activeTarget, setActiveTarget] = useState<TimerTarget>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(0);
  const [raceElapsedMs, setRaceElapsedMs] = useState(0);
  const [isRaceRunning, setIsRaceRunning] = useState(false);

  const [lastCompletedActivityId, setLastCompletedActivityId] = useState<number | null>(null);
  const [lastCompletedKind, setLastCompletedKind] = useState<"activity" | "transition" | null>(null);
  const [lastCompletedRef, setLastCompletedRef] = useState<number | null>(null);

  const eventConfig = getEventConfig();

  useEffect(() => {
    setTransitionTimes(buildDefaultTransitionTimes(activities.length));
  }, [activities.length]);

  // Refs
  const startTimeRef = useRef(0);
  const accumulatedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const raceStartRef = useRef(0);
  const raceAccumulatedRef = useRef(0);
  const raceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCompletedAtRaceMsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    };
  }, []);

  // Derived
  const completedCount = activities.filter((a) => a.status === "completed").length;
  const totalTransitionMs = transitionTimes.reduce((sum, r) => sum + r.elapsedMs, 0);
  const allComplete = activities.length > 0 && completedCount === activities.length;
  const activeActivity = activeTarget?.kind === "activity" ? activities.find((a) => a.id === activeTarget.id) || null : null;

  // On mount: drain any queued offline results and refresh athlete cache
  useEffect(() => {
    drainQueue().catch(() => {});
    refreshAthleteCache().catch(() => {});
  }, []);

  // Broadcast live timer state for /display page (every 1s while race is running)
  useEffect(() => {
    if (!isRaceRunning || allComplete) return;

    const eventId = getActiveEventId() || "default";
    const channel = supabase.channel(`live-timer-${eventId}`);

    const broadcastInterval = setInterval(() => {
      const currentActivity = activeTarget?.kind === "activity"
        ? (() => {
            const a = activities.find(act => act.id === activeTarget.id);
            if (!a) return "—";
            return a.name === "Run" ? `Run ${Math.ceil(a.id / 2)}` : a.name;
          })()
        : activeTarget?.kind === "transition"
          ? "Transition"
          : "—";

      channel.send({
        type: "broadcast",
        event: "timer-update",
        payload: {
          athleteName,
          partnerName: partnerName || undefined,
          category: athleteCategory,
          currentActivity,
          elapsedMs: accumulatedRef.current + (isRunning ? Date.now() - startTimeRef.current : 0),
          raceElapsedMs: raceAccumulatedRef.current + (Date.now() - raceStartRef.current),
        },
      });
    }, 1000);

    channel.subscribe();

    return () => {
      clearInterval(broadcastInterval);
      supabase.removeChannel(channel);
    };
  }, [isRaceRunning, allComplete, activeTarget, activities, athleteName, partnerName, athleteCategory, isRunning]);

  // Sync to Supabase on completion (with offline fallback)
  useEffect(() => {
    if (allComplete && !hasSynced) {
      const splits = activities.map(a => ({
        id: a.id,
        name: a.name,
        timeMs: a.elapsedMs,
        transitionMs: transitionTimes.find(r => r.afterActivityId === a.id)?.elapsedMs || 0,
        count: a.hasCounter ? (a.counter || 0) : undefined
      }));

      const payload = {
        event_id: getActiveEventId() || null,
        athlete_bib: athleteBib || "UNKNOWN",
        athlete_name: athleteName || "UNKNOWN",
        category: athleteCategory,
        volunteer_name: getVolunteerName() || null,
        partner_bib: partnerBib || null,
        partner_name: partnerName || null,
        total_time_ms: raceElapsedMs,
        splits
      };

      supabase.from('race_results').insert([payload]).then(({ error }) => {
        if (!error) {
          setHasSynced(true);
        } else {
          console.error("Sync Failed — queuing offline", error);
          enqueueResult(payload);
          setHasSynced(true); // Mark as "handled" so UI doesn't retry
        }
      });
    }
  }, [allComplete, hasSynced, activities, transitionTimes, athleteBib, athleteName, athleteCategory, partnerBib, partnerName, raceElapsedMs]);

  // Persist race state on significant changes
  useEffect(() => {
    const hasStarted = activities.some(a => a.status !== "pending");
    if (!hasStarted || allComplete) return;

    saveRaceState({
      athleteBib, athleteName, athletePhone, athleteCategory,
      partnerBib, partnerName,
      activities, transitionTimes,
      activeTargetKind: activeTarget?.kind ?? null,
      activeTargetId: activeTarget?.kind === "activity" ? activeTarget.id
        : activeTarget?.kind === "transition" ? activeTarget.afterActivityId
        : null,
      raceAccumulatedMs: isRaceRunning
        ? raceAccumulatedRef.current + (Date.now() - raceStartRef.current)
        : raceAccumulatedRef.current,
      activityAccumulatedMs: isRunning
        ? accumulatedRef.current + (Date.now() - startTimeRef.current)
        : accumulatedRef.current,
      isRunning,
      lastSavedAt: Date.now(),
    });
  }, [activities, transitionTimes, activeTarget, athleteName, athleteBib, athleteCategory, athletePhone, partnerName, partnerBib, allComplete, isRunning, isRaceRunning]);

  // Clear persisted state once synced
  useEffect(() => {
    if (allComplete && hasSynced) clearRaceState();
  }, [allComplete, hasSynced]);

  // Timer callbacks
  const clearActivityInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const saveCurrentTimerValue = useCallback(() => {
    if (isRunning) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      clearActivityInterval();
      setIsRunning(false);
    }
    const savedMs = accumulatedRef.current;
    if (activeTarget?.kind === "activity") {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activeTarget.id && a.status === "active"
            ? { ...a, elapsedMs: savedMs, status: "pending" as ActivityStatus }
            : a
        )
      );
    } else if (activeTarget?.kind === "transition") {
      setTransitionTimes((prev) =>
        prev.map((r) =>
          r.afterActivityId === activeTarget.afterActivityId && r.status === "active"
            ? { ...r, elapsedMs: savedMs, status: "pending" as ActivityStatus }
            : r
        )
      );
    }
  }, [isRunning, activeTarget, clearActivityInterval]);

  const startRaceTimer = useCallback(() => {
    if (!isRaceRunning) {
      raceStartRef.current = Date.now();
      setIsRaceRunning(true);
      raceIntervalRef.current = setInterval(() => {
        setRaceElapsedMs(raceAccumulatedRef.current + (Date.now() - raceStartRef.current));
      }, 100);
    }
  }, [isRaceRunning]);

  const stopRaceTimer = useCallback(() => {
    if (isRaceRunning) {
      raceAccumulatedRef.current += Date.now() - raceStartRef.current;
      setRaceElapsedMs(raceAccumulatedRef.current);
      setIsRaceRunning(false);
      if (raceIntervalRef.current) {
        clearInterval(raceIntervalRef.current);
        raceIntervalRef.current = null;
      }
    }
  }, [isRaceRunning]);

  const beginTimer = useCallback((fromMs: number = 0) => {
    accumulatedRef.current = fromMs;
    setTimerMs(fromMs);
    startTimeRef.current = Date.now();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setTimerMs(accumulatedRef.current + (Date.now() - startTimeRef.current));
    }, 10);
    startRaceTimer();
  }, [startRaceTimer]);

  const startTimer = useCallback(() => {
    beginTimer(accumulatedRef.current);
  }, [beginTimer]);

  const pauseTimer = useCallback(() => {
    accumulatedRef.current += Date.now() - startTimeRef.current;
    setTimerMs(accumulatedRef.current);
    setIsRunning(false);
    clearActivityInterval();
  }, [clearActivityInterval]);

  const selectActivity = useCallback(
    (id: number) => {
      if (activeTarget?.kind === "activity" && activeTarget.id === id) return;
      saveCurrentTimerValue();
      setLastCompletedActivityId(null);
      const activity = activities.find((a) => a.id === id);
      if (activity) {
        setActiveTarget({ kind: "activity", id });
        setActivities((prev) =>
          prev.map((a) => {
            if (a.id === id) return { ...a, status: "active" as ActivityStatus };
            if (a.status === "active") return { ...a, status: "pending" as ActivityStatus };
            return a;
          })
        );
        beginTimer(activity.elapsedMs);
        const label = activity.name === "Run" ? `Run ${Math.ceil(activity.id / 2)}` : activity.name;
        speakActivityName(label);
      }
    },
    [activeTarget, activities, saveCurrentTimerValue, beginTimer]
  );

  const selectTransition = useCallback(
    (afterActivityId: number) => {
      if (activeTarget?.kind === "transition" && activeTarget.afterActivityId === afterActivityId) return;
      saveCurrentTimerValue();
      setLastCompletedActivityId(null);
      const tt = transitionTimes.find((r) => r.afterActivityId === afterActivityId);
      if (tt) {
        setActiveTarget({ kind: "transition", afterActivityId });
        setActivities((prev) => prev.map((a) => (a.status === "active" ? { ...a, status: "pending" as ActivityStatus } : a)));
        setTransitionTimes((prev) =>
          prev.map((r) => {
            if (r.afterActivityId === afterActivityId) return { ...r, status: "active" as ActivityStatus };
            if (r.status === "active") return { ...r, status: "pending" as ActivityStatus };
            return r;
          })
        );
        beginTimer(tt.elapsedMs);
      }
    },
    [activeTarget, transitionTimes, saveCurrentTimerValue, beginTimer]
  );

  const completeActivity = useCallback(() => {
    if (activeTarget?.kind !== "activity") return;
    const activityId = activeTarget.id;

    if (isRunning) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      clearActivityInterval();
    }

    const finalTime = accumulatedRef.current;
    lastCompletedAtRaceMsRef.current = raceAccumulatedRef.current + (Date.now() - raceStartRef.current);

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, elapsedMs: finalTime, status: "completed" as ActivityStatus } : a))
    );
    setLastCompletedActivityId(activityId);
    setLastCompletedKind("activity");
    setLastCompletedRef(activityId);

    const lastActivityId = activities.length > 0 ? Math.max(...activities.map((a) => a.id)) : 0;
    if (activityId < lastActivityId) {
      const tt = transitionTimes.find((r) => r.afterActivityId === activityId);
      if (tt && tt.status !== "completed") {
        setActiveTarget({ kind: "transition", afterActivityId: activityId });
        setTransitionTimes((prev) =>
          prev.map((r) =>
            r.afterActivityId === activityId ? { ...r, status: "active" as ActivityStatus } : r
          )
        );
        beginTimer(tt.elapsedMs);
        return;
      }
    }

    const currentIndex = activities.findIndex((a) => a.id === activityId);
    const nextPending = activities.slice(currentIndex + 1).find((a) => a.status === "pending");
    if (nextPending) {
      setActiveTarget({ kind: "activity", id: nextPending.id });
      setActivities((prev) =>
        prev.map((a) => (a.id === nextPending.id ? { ...a, status: "active" as ActivityStatus } : a))
      );
      beginTimer(0);
    } else {
      setActiveTarget(null);
      setIsRunning(false);
      setTimerMs(0);
      accumulatedRef.current = 0;
      const willAllBeComplete = activities.filter((a) => a.id !== activityId).every((a) => a.status === "completed");
      if (willAllBeComplete) {
        stopRaceTimer();
        playRaceCompleteSound();
        hapticRaceComplete();
      }
    }
  }, [activeTarget, isRunning, activities, transitionTimes, clearActivityInterval, stopRaceTimer, beginTimer]);

  const completeTransition = useCallback(() => {
    if (activeTarget?.kind !== "transition") return;
    const afterId = activeTarget.afterActivityId;

    if (isRunning) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      clearActivityInterval();
    }

    const finalTime = accumulatedRef.current;
    lastCompletedAtRaceMsRef.current = raceAccumulatedRef.current + (Date.now() - raceStartRef.current);

    setTransitionTimes((prev) =>
      prev.map((r) => (r.afterActivityId === afterId ? { ...r, elapsedMs: finalTime, status: "completed" as ActivityStatus } : r))
    );
    setLastCompletedKind("transition");
    setLastCompletedRef(afterId);

    setLastCompletedActivityId(null);
    const nextActivityId = afterId + 1;
    const nextActivity = activities.find((a) => a.id === nextActivityId);
    if (nextActivity && nextActivity.status !== "completed") {
      setActiveTarget({ kind: "activity", id: nextActivityId });
      setActivities((prev) =>
        prev.map((a) => (a.id === nextActivityId ? { ...a, status: "active" as ActivityStatus } : a))
      );
      beginTimer(nextActivity.elapsedMs);
    } else {
      setActiveTarget(null);
      setIsRunning(false);
      setTimerMs(0);
      accumulatedRef.current = 0;
    }
  }, [activeTarget, isRunning, activities, clearActivityInterval, beginTimer]);

  const resetCurrentTimer = useCallback(() => {
    if (isRunning) {
      clearActivityInterval();
      setIsRunning(false);
    }
    accumulatedRef.current = 0;
    setTimerMs(0);
    if (activeTarget?.kind === "activity") {
      setActivities((prev) =>
        prev.map((a) => (a.id === activeTarget.id ? { ...a, elapsedMs: 0 } : a))
      );
    } else if (activeTarget?.kind === "transition") {
      setTransitionTimes((prev) =>
        prev.map((r) => (r.afterActivityId === activeTarget.afterActivityId ? { ...r, elapsedMs: 0 } : r))
      );
    }
  }, [activeTarget, isRunning, clearActivityInterval]);

  const redoActivity = useCallback(
    (id: number) => {
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, elapsedMs: 0, status: "pending" as ActivityStatus } : a))
      );
      if (activeTarget?.kind === "activity" && activeTarget.id === id) {
        accumulatedRef.current = 0;
        setTimerMs(0);
        setIsRunning(false);
        setActiveTarget(null);
      }
    },
    [activeTarget]
  );

  const redoTransition = useCallback(
    (afterId: number) => {
      setTransitionTimes((prev) =>
        prev.map((r) => (r.afterActivityId === afterId ? { ...r, elapsedMs: 0, status: "pending" as ActivityStatus } : r))
      );
      if (activeTarget?.kind === "transition" && activeTarget.afterActivityId === afterId) {
        accumulatedRef.current = 0;
        setTimerMs(0);
        setIsRunning(false);
        setActiveTarget(null);
      }
    },
    [activeTarget]
  );

  const goBackOneStep = useCallback(() => {
    if (lastCompletedKind === null || lastCompletedRef === null) return;
    if (isRunning) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      clearActivityInterval();
      setIsRunning(false);
    }
    const nowRaceMs = raceAccumulatedRef.current + (Date.now() - raceStartRef.current);
    const extraMs = Math.max(0, nowRaceMs - lastCompletedAtRaceMsRef.current);

    if (lastCompletedKind === "activity") {
      const activity = activities.find((a) => a.id === lastCompletedRef);
      const previousElapsed = activity?.elapsedMs ?? 0;
      const wouldBeElapsed = previousElapsed + extraMs;
      setActivities((prev) =>
        prev.map((a) =>
          a.id === lastCompletedRef
            ? { ...a, elapsedMs: wouldBeElapsed, status: "active" as ActivityStatus }
            : a.status === "active"
              ? { ...a, status: "pending" as ActivityStatus }
              : a
        )
      );
      setTransitionTimes((prev) => prev.map((r) => (r.status === "active" ? { ...r, status: "pending" as ActivityStatus } : r)));
      setActiveTarget({ kind: "activity", id: lastCompletedRef });
      setLastCompletedActivityId(null);
      beginTimer(wouldBeElapsed);
    } else {
      const tt = transitionTimes.find((r) => r.afterActivityId === lastCompletedRef);
      const previousElapsed = tt?.elapsedMs ?? 0;
      const wouldBeElapsed = previousElapsed + extraMs;
      setActivities((prev) => prev.map((a) => (a.status === "active" ? { ...a, status: "pending" as ActivityStatus } : a)));
      setTransitionTimes((prev) =>
        prev.map((r) =>
          r.afterActivityId === lastCompletedRef
            ? { ...r, elapsedMs: wouldBeElapsed, status: "active" as ActivityStatus }
            : r.status === "active"
              ? { ...r, status: "pending" as ActivityStatus }
              : r
        )
      );
      setActiveTarget({ kind: "transition", afterActivityId: lastCompletedRef });
      setLastCompletedActivityId(lastCompletedRef);
      beginTimer(wouldBeElapsed);
    }
    setLastCompletedKind(null);
    setLastCompletedRef(null);
  }, [lastCompletedKind, lastCompletedRef, isRunning, activities, transitionTimes, clearActivityInterval, beginTimer]);

  const resetRace = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    intervalRef.current = null;
    raceIntervalRef.current = null;
    setActivities(getStoredActivities().map((a) => ({ ...a, elapsedMs: 0, counter: 0, status: "pending" })));
    setTransitionTimes(buildDefaultTransitionTimes(activities.length));
    setActiveTarget(null);
    setIsRunning(false);
    setTimerMs(0);
    setLastCompletedActivityId(null);
    setLastCompletedKind(null);
    setLastCompletedRef(null);
    accumulatedRef.current = 0;
    setRaceElapsedMs(0);
    setIsRaceRunning(false);
    raceAccumulatedRef.current = 0;
    setHasSynced(false);
    clearRaceState();
  }, [activities.length]);

  const restoreRace = useCallback((state: PersistedRaceState) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    intervalRef.current = null;
    raceIntervalRef.current = null;

    setAthleteName(state.athleteName);
    setAthletePhone(state.athletePhone);
    setAthleteBib(state.athleteBib);
    setAthleteCategory(state.athleteCategory);
    setPartnerName(state.partnerName);
    setPartnerBib(state.partnerBib);

    setActivities(state.activities);
    setTransitionTimes(state.transitionTimes);

    if (state.activeTargetKind === "activity" && state.activeTargetId !== null) {
      setActiveTarget({ kind: "activity", id: state.activeTargetId });
    } else if (state.activeTargetKind === "transition" && state.activeTargetId !== null) {
      setActiveTarget({ kind: "transition", afterActivityId: state.activeTargetId });
    } else {
      setActiveTarget(null);
    }

    accumulatedRef.current = state.activityAccumulatedMs;
    setTimerMs(state.activityAccumulatedMs);
    raceAccumulatedRef.current = state.raceAccumulatedMs;
    setRaceElapsedMs(state.raceAccumulatedMs);

    setIsRunning(false);
    setIsRaceRunning(false);
    setHasSynced(false);
    setLastCompletedActivityId(null);
    setLastCompletedKind(null);
    setLastCompletedRef(null);
  }, []);

  const bumpActiveCounter = useCallback(
    (delta: number) => {
      if (activeTarget?.kind !== "activity") return;
      setActivities((prev) =>
        prev.map((a) => {
          if (a.id !== activeTarget.id) return a;
          if (!a.hasCounter) return a;
          const next = Math.max(0, (a.counter || 0) + delta);
          return { ...a, counter: next };
        })
      );
    },
    [activeTarget]
  );

  const handleComplete = activeTarget?.kind === "activity" ? completeActivity : activeTarget?.kind === "transition" ? completeTransition : undefined;

  const value: RaceState & RaceActions = {
    athleteName, athletePhone, athleteBib, athleteCategory, partnerName, partnerBib,
    activities, transitionTimes, activeTarget, isRunning, timerMs, raceElapsedMs, isRaceRunning,
    completedCount, totalTransitionMs, allComplete, activeActivity, lastCompletedActivityId, lastCompletedKind,
    hasSynced, eventConfig,
    setAthleteName, setAthletePhone, setAthleteBib, setAthleteCategory, setPartnerName, setPartnerBib,
    selectActivity, selectTransition, completeActivity, completeTransition,
    startTimer, pauseTimer, beginTimer, resetCurrentTimer,
    redoActivity, redoTransition, goBackOneStep, resetRace, restoreRace,
    bumpActiveCounter, handleComplete, setActivities,
  };

  return <RaceContext.Provider value={value}>{children}</RaceContext.Provider>;
}
