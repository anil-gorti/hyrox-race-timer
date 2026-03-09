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

type TimerTarget = { kind: "activity"; id: number } | { kind: "rox"; afterActivityId: number } | null;

export default function Home() {
  const [athleteName, setAthleteName] = useState("");
  const [athletePhone, setAthletePhone] = useState("");
  const [athleteBib, setAthleteBib] = useState("");
  const [isLanded, setIsLanded] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
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

  useEffect(() => {
    if (allComplete && !hasSynced) {
      const splits = activities.map(a => ({
        id: a.id,
        name: a.name,
        timeMs: a.elapsedMs,
        roxMs: roxTimes.find(r => r.afterActivityId === a.id)?.elapsedMs || 0
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

    if (activityId < 12) {
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
    setActivities(getStoredActivities().map((a) => ({ ...a, elapsedMs: 0, status: "pending" })));
    setRoxTimes(buildDefaultRoxTimes(activities.length));
    setActiveTarget(null);
    setIsRunning(false);
    setTimerMs(0);
    accumulatedRef.current = 0;
    setRaceElapsedMs(0);
    setIsRaceRunning(false);
    raceAccumulatedRef.current = 0;
    setResetDialogOpen(false);
  }, []);

  const handleComplete = activeTarget?.kind === "activity" ? completeActivity : activeTarget?.kind === "rox" ? completeRox : undefined;

  const checkBib = async (bib: string) => {
    if (!bib) return;
    try {
      const { data, error } = await supabase.from('athletes').select('*').eq('bib', bib).limit(1).single();
      if (data && !error) {
        setAthleteName(data.name);
        if (data.phone) setAthletePhone(data.phone);
      } else {
        console.log("No exact match found in Supabase.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isLanded) {
    return (
      <div className="fixed inset-0 bg-[#6b353a] flex flex-col items-center justify-between font-sans overflow-hidden">
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
            className="bg-[#CCFF00] text-black font-extrabold py-5 px-10 w-full sm:max-w-sm rounded-[32px] tracking-tighter text-2xl active:scale-95 transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)]"
          >
            Open Timing App
          </button>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-sans px-6 pt-12 pb-6">
        <div className="flex-1">
          <div className="text-[#CCFF00] font-bold tracking-widest text-sm mb-8">HYFIT GAMES</div>
          <h1 className="text-4xl font-extrabold mb-8">Athlete<br />Check-in</h1>

          <div className="space-y-6">
            <div>
              <label className="text-gray-500 text-sm font-bold tracking-widest block mb-2">BIB NUMBER</label>
              <input type="text" value={athleteBib} onChange={e => { setAthleteBib(e.target.value); if (e.target.value.length >= 2) checkBib(e.target.value); }} className="w-full bg-[#111] border-b-2 border-[#333] focus:border-[#CCFF00] outline-none py-3 text-xl placeholder-gray-700 transition-colors" placeholder="e.g. 402" />
            </div>
            <div>
              <label className="text-gray-500 text-sm font-bold tracking-widest block mb-2">FULL NAME</label>
              <input type="text" value={athleteName} onChange={e => setAthleteName(e.target.value)} className="w-full bg-[#111] border-b-2 border-[#333] focus:border-[#CCFF00] outline-none py-3 text-xl placeholder-gray-700 transition-colors" placeholder="e.g. Hunter McIntyre" />
            </div>
            <div>
              <label className="text-gray-500 text-sm font-bold tracking-widest block mb-2">PHONE NUMBER</label>
              <input type="tel" value={athletePhone} onChange={e => setAthletePhone(e.target.value)} className="w-full bg-[#111] border-b-2 border-[#333] focus:border-[#CCFF00] outline-none py-3 text-xl placeholder-gray-700 transition-colors" placeholder="e.g. +1 234 567 890" />
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsRegistered(true)}
          disabled={!athleteName || !athleteBib}
          className="w-full bg-[#CCFF00] text-black font-extrabold py-5 rounded-[24px] tracking-tighter text-2xl active:bg-[#aacc00] disabled:opacity-50 disabled:bg-[#333] disabled:text-gray-500 transition-all font-sans"
        >
          READY TO RACE
        </button>
      </div>
    );
  }

  // The giant OLED mobile rendering layout
  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-sans select-none" style={{ WebkitTapHighlightColor: 'transparent' }}>

      {/* Top Status Bar */}
      <div className="h-20 w-full flex items-center justify-between px-6 bg-black z-20 shrink-0 border-b border-[#1A1A1A]">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">RACE TIME</div>
          <div className="text-xl font-mono text-[#CCFF00] font-medium">{formatRaceTime(raceElapsedMs)}</div>
        </div>

        <div className="flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => { if (confirm("Are you sure you want to go to Admin panel?")) window.location.href = "/admin" }}
            className="text-white font-bold text-lg sm:text-xl tracking-widest uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] sm:max-w-[250px]">{athleteName || "ATHLETE"}</button>
          <div className="text-[#CCFF00] opacity-80 text-sm font-mono mt-0.5">#{athleteBib || "---"}</div>
        </div>

        <div className="text-right z-10 w-24">
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">PROGRESS</div>
          <div className="text-xl font-mono text-white font-medium">{completedCount}/{activities.length}</div>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black relative">
        <div className="text-center w-full max-w-md">
          {activeTarget === null && !allComplete ? (
            <div className="flex flex-col items-center justify-center text-gray-600 gap-4">
              <Flag className="w-16 h-16 opacity-50" />
              <div className="text-lg">{completedCount === 0 ? "Ready to dominate?" : "Select activity below"}</div>
            </div>
          ) : allComplete ? (
            <div className="flex flex-col items-center justify-center text-[#CCFF00] gap-4 w-full px-4 mt-8">
              <Trophy className="w-20 h-20 drop-shadow-[0_0_15px_rgba(204,255,0,0.5)]" />
              <div className="text-3xl font-bold tracking-tighter text-white">OFFICIAL RESULT</div>

              <div className="bg-[#111] border border-[#333] rounded-[24px] w-full p-6 mt-4 text-left">
                <div className="text-gray-500 text-xs font-bold tracking-widest mb-1">ATHLETE</div>
                <div className="text-white text-2xl font-bold mb-6">{athleteName || "Unknown"} <span className="text-gray-500">#{athleteBib || "---"}</span></div>

                <div className="text-gray-500 text-xs font-bold tracking-widest mb-1">TOTAL RACE TIME</div>
                <div className="text-[#CCFF00] text-5xl font-mono mb-6">{formatRaceTime(raceElapsedMs)}</div>

                <div className="text-gray-500 text-xs font-bold tracking-widest mb-1">SYNC STATUS</div>
                <div className="text-white text-base flex items-center gap-2">
                  <Check className={`w-5 h-5 ${hasSynced ? "text-green-500" : "text-gray-500"}`} /> {hasSynced ? "Synced to Cloud" : "Saving Locally..."}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-[#CCFF00] text-base sm:text-lg uppercase tracking-[0.3em] font-extrabold mb-4 ml-1">
                {activeTarget?.kind === "activity"
                  ? (() => {
                    const a = activities.find(act => act.id === activeTarget.id);
                    if (!a) return "";
                    return a.name === "Run" ? `Run ${Math.ceil(a.id / 2)}` : a.name;
                  })()
                  : "Transition"}
              </div>
              <div
                className={`text-[5.5rem] sm:text-[9.5rem] leading-none font-mono tracking-tighter transition-opacity duration-200 tabular-nums ${isRunning ? "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "text-gray-500"
                  }`}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatTime(timerMs)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* The Bottom Half Action Zone */}
      {!allComplete && (
        <div className="h-[45vh] w-full shrink-0 relative bg-[#0a0a0a] rounded-t-[40px] px-6 pt-6 pb-12 flex flex-col border-t border-[#1a1a1a]">
          {activeTarget === null ? (
            completedCount === 0 ? (
              <button
                onClick={(e) => {
                  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                  selectActivity(1);
                }}
                className="w-full h-full bg-[#CCFF00] rounded-[32px] text-black text-4xl sm:text-5xl font-extrabold tracking-tighter active:scale-[0.96] active:bg-[#aacc00] transition-transform duration-100 flex items-center justify-center flex-col shadow-[0_0_50px_rgba(204,255,0,0.15)]"
              >
                START RACE
                <span className="text-black/50 text-xs sm:text-base font-bold tracking-widest mt-2">TAP TO BEGIN RUN 1</span>
              </button>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pb-8" style={{ scrollbarWidth: "none" }}>
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
                          className="w-full bg-[#111] border border-[#222] rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <div>
                            <div className="text-white font-bold text-xl">{act.id}. {act.name === "Run" ? `Run ${Math.ceil(act.id / 2)}` : act.name}</div>
                            <div className="text-gray-500 text-sm">{act.value}</div>
                          </div>
                          <Play className="text-[#CCFF00] w-8 h-8 opacity-50" />
                        </div>
                      )}
                      {isCompleted && rox && !isRoxCompleted && (
                        <div
                          onClick={() => selectRox(act.id)}
                          className="w-full bg-[#111] border border-[#CCFF00]/30 rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer mt-3"
                        >
                          <div>
                            <div className="text-[#CCFF00] font-bold text-xl">Rox Time</div>
                            <div className="text-gray-500 text-sm">To next station</div>
                          </div>
                          <Play className="text-[#CCFF00] w-8 h-8 opacity-50" />
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="h-10"></div>
              </div>
            )
          ) : (
            <div className="flex gap-2 w-full h-full">
              {/* 5-Second Ghost State Reset Button mapped to a swipe visually but click mechanically for now */}
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
                className="w-20 shrink-0 h-full bg-[#111] rounded-[32px] text-gray-500 flex items-center justify-center flex-col active:bg-[#222]"
              >
                <RotateCcw className="w-8 h-8 mb-2" />
                <span className="text-[10px] font-bold tracking-widest">UNDO</span>
              </button>

              <button
                onClick={(e) => {
                  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                  if (isRunning) {
                    handleComplete && handleComplete();
                  } else {
                    beginTimer(timerMs);
                  }
                }}
                className="flex-1 h-full bg-[#CCFF00] rounded-[32px] text-black text-4xl sm:text-5xl font-extrabold tracking-tighter active:scale-[0.96] active:bg-[#aacc00] transition-transform duration-100 flex items-center justify-center flex-col shadow-[0_0_50px_rgba(204,255,0,0.15)]"
              >
                {isRunning ? (activeTarget?.kind === "activity" && activeTarget.id === 12 ? "FINISH RACE" : "DONE") : "START"}
                <span className="text-black/50 text-xs sm:text-base font-bold tracking-widest mt-2">{activeTarget?.kind === "activity" && activeTarget.id === 12 ? "FINAL STATION" : "TAP ANYWHERE"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
