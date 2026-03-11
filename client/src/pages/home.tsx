import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import splashImg from "@/splash.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Play,
  Pause,
  RotateCcw,
  Pencil,
  Check,
  Dumbbell,
  Trophy,
  Flag,
  ChevronRight,
  PersonStanding,
  ArrowDownUp,
} from "lucide-react";

import {
  Activity, ActivityType, ActivityStatus, RoxTime,
  getStoredActivities, buildDefaultRoxTimes
} from "@/lib/events";
import { isAdmin, setAdminWithPin } from "@/lib/role";
import { WoneMark } from "@/components/WoneMark";

const METRIC_OPTIONS = ["Distance", "Reps", "Time", "Weight", "Calories"];



function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function formatRaceTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatSplitTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type TimerTarget = { kind: "activity"; id: number } | { kind: "rox"; afterActivityId: number } | null;

export default function Home() {
  const [athleteName, setAthleteName] = useState("");
  const [athletePhone, setAthletePhone] = useState("");
  const [athleteBib, setAthleteBib] = useState("");
  const [isLanded, setIsLanded] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState("");
  const [athleteSearchResults, setAthleteSearchResults] = useState<Array<{ id: string; bib: string; name: string; phone: string | null }>>([]);
  const [athleteSearching, setAthleteSearching] = useState(false);
  const [activities, setActivities] = useState<Activity[]>(getStoredActivities());
  const [roxTimes, setRoxTimes] = useState<RoxTime[]>([]);

  useEffect(() => {
    setRoxTimes(buildDefaultRoxTimes(activities.length));
  }, [activities.length]);
  const [hasSynced, setHasSynced] = useState(false);

  const [activeTarget, setActiveTarget] = useState<TimerTarget>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(0);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", type: "run" as ActivityType, metric: "Distance", value: "" });
  const [editId, setEditId] = useState<number | null>(null);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [adminPinDialogOpen, setAdminPinDialogOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [lastCompletedActivityId, setLastCompletedActivityId] = useState<number | null>(null);
  const [lastCompletedKind, setLastCompletedKind] = useState<"activity" | "rox" | null>(null);
  const [lastCompletedRef, setLastCompletedRef] = useState<number | null>(null);

  const [raceElapsedMs, setRaceElapsedMs] = useState(0);
  const [isRaceRunning, setIsRaceRunning] = useState(false);

  const startTimeRef = useRef(0);
  const accumulatedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const raceStartRef = useRef(0);
  const raceAccumulatedRef = useRef(0);
  const raceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeTarget]);

  const completedCount = activities.filter((a) => a.status === "completed").length;
  const totalActivityMs = activities.reduce((sum, a) => sum + a.elapsedMs, 0);
  const totalRoxMs = roxTimes.reduce((sum, r) => sum + r.elapsedMs, 0);
  const allComplete = activities.length > 0 && completedCount === activities.length;
  const activeActivity = activeTarget?.kind === "activity" ? activities.find((a) => a.id === activeTarget.id) : null;

  useEffect(() => {
    if (allComplete && !hasSynced) {
      const splits = activities.map(a => ({
        id: a.id,
        name: a.name,
        timeMs: a.elapsedMs,
        roxMs: roxTimes.find(r => r.afterActivityId === a.id)?.elapsedMs || 0,
        count: a.hasCounter ? (a.counter || 0) : undefined
      }));

      supabase.from('race_results').insert([
        {
          athlete_bib: athleteBib || "UNKNOWN",
          athlete_name: athleteName || "UNKNOWN",
          total_time_ms: raceElapsedMs,
          splits
        }
      ]).then(({ error }) => {
        if (!error) setHasSynced(true);
        else console.error("Sync Failed", error);
      });
    }
  }, [allComplete, hasSynced, activities, roxTimes, athleteBib, athleteName, raceElapsedMs]);

  const isActivityActive = (id: number) => activeTarget?.kind === "activity" && activeTarget.id === id;
  const isRoxActive = (afterId: number) => activeTarget?.kind === "rox" && activeTarget.afterActivityId === afterId;

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
    } else if (activeTarget?.kind === "rox") {
      setRoxTimes((prev) =>
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
      }
    },
    [activeTarget, activities, saveCurrentTimerValue, beginTimer]
  );

  const selectRox = useCallback(
    (afterActivityId: number) => {
      if (activeTarget?.kind === "rox" && activeTarget.afterActivityId === afterActivityId) return;
      saveCurrentTimerValue();
      setLastCompletedActivityId(null);

      const rox = roxTimes.find((r) => r.afterActivityId === afterActivityId);
      if (rox) {
        setActiveTarget({ kind: "rox", afterActivityId });
        setActivities((prev) => prev.map((a) => (a.status === "active" ? { ...a, status: "pending" as ActivityStatus } : a)));
        setRoxTimes((prev) =>
          prev.map((r) => {
            if (r.afterActivityId === afterActivityId) return { ...r, status: "active" as ActivityStatus };
            if (r.status === "active") return { ...r, status: "pending" as ActivityStatus };
            return r;
          })
        );
        beginTimer(rox.elapsedMs);
      }
    },
    [activeTarget, roxTimes, saveCurrentTimerValue, beginTimer]
  );

  const completeActivity = useCallback(() => {
    if (activeTarget?.kind !== "activity") return;
    const activityId = activeTarget.id;

    if (isRunning) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      clearActivityInterval();
    }

    const finalTime = accumulatedRef.current;

    setActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, elapsedMs: finalTime, status: "completed" as ActivityStatus } : a))
    );
    setLastCompletedActivityId(activityId);
    setLastCompletedKind("activity");
    setLastCompletedRef(activityId);

    const lastActivityId = activities.length > 0 ? Math.max(...activities.map((a) => a.id)) : 0;
    if (activityId < lastActivityId) {
      const rox = roxTimes.find((r) => r.afterActivityId === activityId);
      if (rox && rox.status !== "completed") {
        setActiveTarget({ kind: "rox", afterActivityId: activityId });
        setRoxTimes((prev) =>
          prev.map((r) =>
            r.afterActivityId === activityId ? { ...r, status: "active" as ActivityStatus } : r
          )
        );
        beginTimer(rox.elapsedMs);
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
      if (willAllBeComplete) stopRaceTimer();
    }
  }, [activeTarget, isRunning, activities, roxTimes, clearActivityInterval, stopRaceTimer, beginTimer]);

  const completeRox = useCallback(() => {
    if (activeTarget?.kind !== "rox") return;
    const afterId = activeTarget.afterActivityId;

    if (isRunning) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      clearActivityInterval();
    }

    const finalTime = accumulatedRef.current;

    setRoxTimes((prev) =>
      prev.map((r) => (r.afterActivityId === afterId ? { ...r, elapsedMs: finalTime, status: "completed" as ActivityStatus } : r))
    );
    setLastCompletedKind("rox");
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
    } else if (activeTarget?.kind === "rox") {
      setRoxTimes((prev) =>
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

  const redoRox = useCallback(
    (afterId: number) => {
      setRoxTimes((prev) =>
        prev.map((r) => (r.afterActivityId === afterId ? { ...r, elapsedMs: 0, status: "pending" as ActivityStatus } : r))
      );
      if (activeTarget?.kind === "rox" && activeTarget.afterActivityId === afterId) {
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
    if (lastCompletedKind === "activity") {
      redoActivity(lastCompletedRef);
      setActiveTarget({ kind: "activity", id: lastCompletedRef });
      setActivities((prev) =>
        prev.map((a) =>
          a.id === lastCompletedRef ? { ...a, status: "active" as ActivityStatus } : a.status === "active" ? { ...a, status: "pending" as ActivityStatus } : a
        )
      );
      setRoxTimes((prev) => prev.map((r) => (r.status === "active" ? { ...r, status: "pending" as ActivityStatus } : r)));
      setLastCompletedActivityId(null);
    } else {
      redoRox(lastCompletedRef);
      setActiveTarget({ kind: "rox", afterActivityId: lastCompletedRef });
      setActivities((prev) => prev.map((a) => (a.status === "active" ? { ...a, status: "pending" as ActivityStatus } : a)));
      setRoxTimes((prev) =>
        prev.map((r) =>
          r.afterActivityId === lastCompletedRef ? { ...r, status: "active" as ActivityStatus } : r.status === "active" ? { ...r, status: "pending" as ActivityStatus } : r
        )
      );
      setLastCompletedActivityId(lastCompletedRef);
    }
    setLastCompletedKind(null);
    setLastCompletedRef(null);
    accumulatedRef.current = 0;
    setTimerMs(0);
    beginTimer(0);
  }, [lastCompletedKind, lastCompletedRef, isRunning, redoActivity, redoRox, activities, clearActivityInterval, beginTimer]);

  const openEditDialog = useCallback(
    (id: number) => {
      const activity = activities.find((a) => a.id === id);
      if (activity) {
        setEditId(id);
        setEditForm({ name: activity.name, type: activity.type, metric: activity.metric, value: activity.value });
        setEditDialogOpen(true);
      }
    },
    [activities]
  );

  const saveEdit = useCallback(() => {
    if (editId === null) return;
    setActivities((prev) =>
      prev.map((a) =>
        a.id === editId ? { ...a, name: editForm.name, type: editForm.type, metric: editForm.metric, value: editForm.value } : a
      )
    );
    setEditDialogOpen(false);
    setEditId(null);
  }, [editId, editForm]);

  const resetRace = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    intervalRef.current = null;
    raceIntervalRef.current = null;
    setActivities(getStoredActivities().map((a) => ({ ...a, elapsedMs: 0, counter: 0, status: "pending" })));
    setRoxTimes(buildDefaultRoxTimes(activities.length));
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
    setResetDialogOpen(false);
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

  const handleComplete = activeTarget?.kind === "activity" ? completeActivity : activeTarget?.kind === "rox" ? completeRox : undefined;

  const lookupAthlete = async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setAthleteSearchResults([]);
      return;
    }
    setAthleteSearching(true);
    try {
      const { data, error } = await supabase
        .from("athletes")
        .select("id, bib, name, phone")
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(20);
      if (!error && data) {
        setAthleteSearchResults(data as Array<{ id: string; bib: string; name: string; phone: string | null }>);
      } else {
        setAthleteSearchResults([]);
      }
    } catch (e) {
      console.error(e);
      setAthleteSearchResults([]);
    } finally {
      setAthleteSearching(false);
    }
  };

  const selectAthlete = (athlete: { bib: string; name: string; phone: string | null }) => {
    setAthleteBib(athlete.bib);
    setAthleteName(athlete.name);
    setAthletePhone(athlete.phone || "");
    setAthleteSearchResults([]);
    setAthleteSearch("");
    setIsRegistered(true);
  };

  if (!isLanded) {
    return (
      <div className="fixed inset-0 bg-[#6b353a] flex flex-col items-center justify-between font-sans overflow-hidden">
        <div className="absolute top-4 left-4 z-20">
          <WoneMark />
        </div>
        {/* Uncropped Splash Image containing 'Powered by Wone' */}
        <div className="flex-1 w-full flex items-center justify-center overflow-hidden pt-4">
          <img
            src={splashImg}
            alt="HyFit Landing Splash"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Dedicated Button Dock below the image */}
        <div className="w-full shrink-0 flex items-center justify-center py-6 px-4 bg-[#6b353a]">
          <button
            onClick={() => setIsLanded(true)}
            className="bg-[#CCFF00] text-black font-bold py-4 px-8 w-full sm:max-w-sm rounded-2xl text-lg tracking-tight active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)]"
          >
            Open Timing App
          </button>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-sans px-6 pt-10 pb-6">
        <div className="absolute top-4 left-4">
          <WoneMark />
        </div>
        <div className="flex-1 min-h-0">
          <p className="text-[#CCFF00] font-semibold tracking-wider text-xs uppercase mb-6">HYFIT GAMES</p>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Look up athlete</h1>
          <p className="text-gray-500 text-sm mb-5">Search by name or phone number</p>

          <div className="space-y-3 mb-6">
            <input
              type="text"
              value={athleteSearch}
              onChange={(e) => {
                setAthleteSearch(e.target.value);
                lookupAthlete(e.target.value);
              }}
              onFocus={() => athleteSearch.length >= 2 && lookupAthlete(athleteSearch)}
              className="w-full bg-[#111] border border-[#333] focus:border-[#CCFF00] outline-none py-3 px-4 text-base placeholder-gray-500 rounded-xl transition-colors"
              placeholder="Name or phone number"
              autoComplete="off"
            />
            {athleteSearching && <p className="text-gray-500 text-xs">Searching…</p>}
            {!athleteSearching && athleteSearchResults.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-xl border border-[#333] bg-[#0a0a0a] p-2">
                {athleteSearchResults.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectAthlete(a)}
                    className="w-full text-left py-2.5 px-3 rounded-lg bg-[#111] hover:bg-[#1a1a1a] border border-transparent hover:border-[#333] transition-colors"
                  >
                    <div className="font-medium text-white text-sm">{a.name}</div>
                    <div className="text-gray-500 text-xs">#{a.bib}{a.phone ? ` · ${a.phone}` : ""}</div>
                  </button>
                ))}
              </div>
            )}
            {!athleteSearching && athleteSearch.trim().length >= 2 && athleteSearchResults.length === 0 && (
              <p className="text-gray-500 text-xs">No athletes found. Enter details below.</p>
            )}
          </div>

          <div className="border-t border-[#333] pt-5 space-y-3">
            <p className="text-gray-500 text-xs font-semibold tracking-wider uppercase">Or enter manually</p>
            <div>
              <label className="text-gray-500 text-[11px] font-medium tracking-wider uppercase block mb-1">Full name</label>
              <input type="text" value={athleteName} onChange={(e) => setAthleteName(e.target.value)} className="w-full bg-[#111] border-b border-[#333] focus:border-[#CCFF00] outline-none py-2.5 text-base placeholder-gray-600 transition-colors rounded-none" placeholder="e.g. Hunter McIntyre" />
            </div>
            <div>
              <label className="text-gray-500 text-[11px] font-medium tracking-wider uppercase block mb-1">Phone (optional)</label>
              <input type="tel" value={athletePhone} onChange={(e) => setAthletePhone(e.target.value)} className="w-full bg-[#111] border-b border-[#333] focus:border-[#CCFF00] outline-none py-2.5 text-base placeholder-gray-600 transition-colors rounded-none" placeholder="e.g. +1 234 567 890" />
            </div>
            <div>
              <label className="text-gray-500 text-[11px] font-medium tracking-wider uppercase block mb-1">Bib (optional)</label>
              <input type="text" value={athleteBib} onChange={(e) => setAthleteBib(e.target.value)} className="w-full bg-[#111] border-b border-[#333] focus:border-[#CCFF00] outline-none py-2.5 text-base placeholder-gray-600 transition-colors rounded-none" placeholder="e.g. 402" />
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsRegistered(true)}
          disabled={!athleteName}
          className="w-full bg-[#CCFF00] text-black font-bold py-4 rounded-2xl text-base tracking-tight active:scale-[0.98] disabled:opacity-50 disabled:bg-[#333] disabled:text-gray-500 transition-all mt-5"
        >
          Ready to race
        </button>
      </div>
    );
  }

  // The giant OLED mobile rendering layout
  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-sans select-none" style={{ WebkitTapHighlightColor: 'transparent' }}>
      <div className="absolute top-3 left-4 z-30">
        <WoneMark />
      </div>

      {/* Top Status Bar */}
      <div className="h-16 w-full flex items-center justify-between px-4 sm:px-6 bg-black z-20 shrink-0 border-b border-[#1A1A1A]">
        <div>
          <div className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-0.5">Race time</div>
          <div className="text-base font-mono text-[#CCFF00] font-semibold tabular-nums">{formatRaceTime(raceElapsedMs)}</div>
        </div>

        <div className="flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => {
              if (isAdmin()) {
                window.location.href = "/admin";
              } else {
                setAdminPinDialogOpen(true);
              }
            }}
            className="text-white font-semibold text-sm sm:text-base tracking-wide uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px] sm:max-w-[220px]"
          >
            {athleteName || "Athlete"}
          </button>
          <div className="text-[#CCFF00]/90 text-xs font-mono mt-0.5 tabular-nums">#{athleteBib || "—"}</div>
        </div>

        <div className="text-right z-10 w-20">
          <div className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-0.5">Activities</div>
          <div className="text-base font-mono text-white font-semibold tabular-nums">{completedCount}/{activities.length}</div>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-5 bg-black relative min-h-0">
        <div className="text-center w-full max-w-md">
          {activeTarget === null && !allComplete ? (
            <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
              <Flag className="w-12 h-12 opacity-50" />
              <p className="text-sm font-medium">{completedCount === 0 ? "Ready to start?" : "Select an activity below"}</p>
            </div>
          ) : allComplete ? (
            <div className="flex flex-col items-center w-full px-4 overflow-y-auto">
              <div className="text-center mb-5">
                <h2 className="text-white text-lg font-bold tracking-wide mb-0.5">Hyfit Games 2.1</h2>
                <p className="text-gray-400 text-xs tracking-wider uppercase">Mini Challenge</p>
              </div>
              <div className="text-[#EAB308] text-2xl font-bold tracking-tight uppercase mb-6">
                {athleteName || "Unknown"}
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-6">
                <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                  <div className="text-gray-400 text-[11px] font-medium tracking-wider uppercase mb-0.5">Total time</div>
                  <div className="text-white text-xl font-semibold font-mono tabular-nums">{formatRaceTime(raceElapsedMs)}</div>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                  <div className="text-gray-400 text-[11px] font-medium tracking-wider uppercase mb-0.5">Transition time</div>
                  <div className="text-white text-xl font-semibold font-mono tabular-nums">{formatRaceTime(totalRoxMs)}</div>
                </div>
              </div>

              <div className="w-full max-w-2xl">
                <h3 className="text-[#EAB308] text-base font-bold tracking-tight uppercase mb-3">Race splits</h3>
                <div className="grid grid-cols-2 gap-2">
                  {activities.map((act) => (
                    <div key={act.id} className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                      <div className="text-gray-300 text-sm font-semibold uppercase tracking-wide mb-0.5">
                        {act.name === "Run" ? `Run ${Math.ceil(act.id / 2)}` : act.name}
                      </div>
                      {act.hasCounter && (act.counter || 0) > 0 && (
                        <div className="text-gray-500 text-[11px] font-medium uppercase mb-0.5">Count: {act.counter}</div>
                      )}
                      <div className="text-white text-sm font-semibold font-mono tabular-nums">{formatSplitTime(act.elapsedMs)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 text-gray-500 text-xs">
                <Check className={`w-3.5 h-3.5 shrink-0 ${hasSynced ? "text-green-500" : "text-gray-500"}`} />
                {hasSynced ? "Synced to cloud" : "Saving…"}
              </div>
            </div>
          ) : (
            <>
              {lastCompletedActivityId != null && (() => {
                const last = activities.find(a => a.id === lastCompletedActivityId);
                const lastLabel = last ? (last.name === "Run" ? `Run ${Math.ceil(last.id / 2)}` : last.name) : "";
                return lastLabel ? (
                  <p className="text-[#CCFF00]/90 text-xs font-medium uppercase tracking-wider mb-1.5">Just completed: {lastLabel}</p>
                ) : null;
              })()}
              <p className="text-[#CCFF00] text-xl sm:text-2xl uppercase tracking-widest font-bold mb-1.5">
                {activeTarget?.kind === "activity"
                  ? (() => {
                    const a = activities.find(act => act.id === activeTarget.id);
                    if (!a) return "";
                    return a.name === "Run" ? `Run ${Math.ceil(a.id / 2)}` : a.name;
                  })()
                  : "Transition"}
              </p>
              <div
                className={`text-3xl sm:text-4xl leading-none font-mono tracking-tight transition-opacity duration-200 tabular-nums ${isRunning ? "text-white" : "text-gray-500"}`}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatTime(timerMs)}
              </div>

              {activeTarget?.kind === "activity" && activeActivity?.hasCounter && (
                <div className="mt-5 w-full max-w-md flex items-center justify-center gap-3">
                  <button
                    onClick={() => bumpActiveCounter(-1)}
                    className="w-14 h-14 rounded-xl bg-[#111] border border-[#333] text-white text-2xl font-semibold active:scale-[0.97] transition-transform leading-none"
                    aria-label="Decrease count"
                  >
                    −
                  </button>
                  <div className="px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-[#222] min-w-[120px] text-center">
                    <div className="text-gray-500 text-[11px] font-medium tracking-wider uppercase mb-0.5">Count</div>
                    <div className="text-white text-2xl font-semibold font-mono tabular-nums">{activeActivity.counter || 0}</div>
                  </div>
                  <button
                    onClick={() => bumpActiveCounter(1)}
                    className="w-14 h-14 rounded-xl bg-[#CCFF00] text-black text-2xl font-bold active:scale-[0.97] transition-transform leading-none"
                    aria-label="Increase count"
                  >
                    +
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* The Bottom Half Action Zone */}
      {!allComplete && (
        <div className="h-[42vh] min-h-[240px] w-full shrink-0 relative bg-[#0a0a0a] rounded-t-3xl px-4 sm:px-6 pt-4 pb-8 flex flex-col border-t border-[#1a1a1a]">
          {activeTarget === null ? (
            completedCount === 0 ? (
              <button
                onClick={(e) => {
                  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                  selectActivity(1);
                }}
                className="w-full h-full bg-[#CCFF00] rounded-2xl text-black text-2xl font-bold tracking-tight active:scale-[0.98] active:bg-[#aacc00] transition-transform flex items-center justify-center flex-col gap-1"
              >
                Start race
                <span className="text-black/60 text-xs font-medium">Tap to begin</span>
              </button>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pb-4" style={{ scrollbarWidth: "none" }}>
                {activities.map(act => {
                  const isCompleted = act.status === "completed";
                  const rox = roxTimes.find(r => r.afterActivityId === act.id);
                  const isRoxCompleted = rox?.status === "completed";
                  if (isCompleted && rox && isRoxCompleted) return null;

                  return (
                    <div key={act.id}>
                      {!isCompleted && (
                        <div
                          onClick={() => selectActivity(act.id)}
                          className="w-full bg-[#111] border border-[#222] rounded-xl p-3 flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer"
                        >
                          <div>
                            <div className="text-white font-semibold text-base">{act.id}. {act.name === "Run" ? `Run ${Math.ceil(act.id / 2)}` : act.name}</div>
                            <div className="text-gray-500 text-xs">{act.value}</div>
                          </div>
                          <Play className="text-[#CCFF00] w-6 h-6 opacity-60 shrink-0" />
                        </div>
                      )}
                      {isCompleted && rox && !isRoxCompleted && (
                        <div
                          onClick={() => selectRox(act.id)}
                          className="w-full bg-[#111] border border-[#CCFF00]/30 rounded-xl p-3 flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer mt-2"
                        >
                          <div>
                            <div className="text-[#CCFF00] font-semibold text-base">Rox time</div>
                            <div className="text-gray-500 text-xs">To next station</div>
                          </div>
                          <Play className="text-[#CCFF00] w-6 h-6 opacity-60 shrink-0" />
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="h-4" />
              </div>
            )
          ) : (
            <div className="flex gap-2 w-full h-full min-h-0">
              <button
                onClick={(e) => {
                  if (navigator.vibrate) navigator.vibrate([20]);
                  resetCurrentTimer();
                  if (activeTarget.kind === "activity") {
                    redoActivity(activeTarget.id);
                  } else {
                    redoRox(activeTarget.afterActivityId);
                  }
                }}
                className="w-14 shrink-0 h-full bg-[#111] rounded-2xl text-gray-500 flex flex-col items-center justify-center gap-1 active:bg-[#1a1a1a] transition-colors"
                title="Reset this segment"
              >
                <RotateCcw className="w-6 h-6" />
                <span className="text-[10px] font-semibold tracking-wider uppercase">Undo</span>
              </button>

              {lastCompletedKind != null && (
                <button
                  onClick={(e) => {
                    if (navigator.vibrate) navigator.vibrate([20]);
                    goBackOneStep();
                  }}
                  className="w-14 shrink-0 h-full bg-[#1a1a1a] rounded-2xl text-amber-400/90 flex flex-col items-center justify-center gap-1 active:bg-[#222] border border-amber-500/20 transition-colors"
                  title="Re-open last segment"
                >
                  <ChevronRight className="w-6 h-6 rotate-180" />
                  <span className="text-[10px] font-semibold tracking-wider uppercase">Back</span>
                </button>
              )}

              <button
                onClick={(e) => {
                  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                  if (isRunning) {
                    handleComplete && handleComplete();
                  } else {
                    beginTimer(timerMs);
                  }
                }}
                className="flex-1 min-w-0 h-full bg-[#CCFF00] rounded-2xl text-black text-xl sm:text-2xl font-bold tracking-tight active:scale-[0.98] active:bg-[#aacc00] transition-transform flex flex-col items-center justify-center gap-0.5"
              >
                {isRunning ? (activeTarget?.kind === "activity" && activeTarget.id === (activities.length > 0 ? Math.max(...activities.map((a) => a.id)) : 0) ? "Finish race" : "Done") : "Start"}
                <span className="text-black/55 text-[11px] font-medium">{activeTarget?.kind === "activity" && activeTarget.id === (activities.length > 0 ? Math.max(...activities.map((a) => a.id)) : 0) ? "Final station" : "Tap to record"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      <Dialog open={adminPinDialogOpen} onOpenChange={setAdminPinDialogOpen}>
        <DialogContent className="bg-[#111] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Admin access</DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Enter PIN to open the Admin panel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              type="password"
              placeholder="PIN"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="bg-[#222] border-[#444] text-white text-base"
              onKeyDown={(e) => e.key === "Enter" && (setAdminWithPin(adminPin) ? (setAdminPinDialogOpen(false), setAdminPin(""), (window.location.href = "/admin")) : null)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setAdminPinDialogOpen(false); setAdminPin(""); }} className="border-[#444] text-gray-400 text-sm">Cancel</Button>
            <Button size="sm" className="bg-[#CCFF00] text-black hover:bg-[#aacc00] text-sm font-semibold" onClick={() => { if (setAdminWithPin(adminPin)) { setAdminPinDialogOpen(false); setAdminPin(""); window.location.href = "/admin"; } }}>
              Open Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
