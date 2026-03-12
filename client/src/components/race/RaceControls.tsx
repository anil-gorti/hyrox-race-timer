import { memo, useState, useRef, useCallback } from "react";
import { useRace } from "@/contexts/RaceContext";
import { RotateCcw, ChevronRight } from "lucide-react";
import { ActivityList } from "./ActivityList";
import { hapticStart, hapticStop, hapticButtonPress } from "@/lib/haptics";
import { playStartBeep, playStopBeep } from "@/lib/audio";

const LONG_PRESS_MS = 500;

export const RaceControls = memo(function RaceControls() {
  const {
    activeTarget, activities, isRunning, timerMs, completedCount,
    lastCompletedKind,
    selectActivity, resetCurrentTimer, redoActivity, redoTransition,
    goBackOneStep, handleComplete, beginTimer, allComplete,
  } = useRace();

  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartRef = useRef(0);
  const holdAnimRef = useRef<number>(0);

  const isLastActivity = activeTarget?.kind === "activity" && activeTarget.id === (activities.length > 0 ? Math.max(...activities.map((a) => a.id)) : 0);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    cancelAnimationFrame(holdAnimRef.current);
    setHoldProgress(0);
  }, []);

  const startHold = useCallback(() => {
    holdStartRef.current = Date.now();
    const animate = () => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / LONG_PRESS_MS, 1);
      setHoldProgress(progress);
      if (progress < 1) {
        holdAnimRef.current = requestAnimationFrame(animate);
      }
    };
    holdAnimRef.current = requestAnimationFrame(animate);

    holdTimerRef.current = setTimeout(() => {
      hapticStop();
      playStopBeep();
      handleComplete && handleComplete();
      clearHold();
    }, LONG_PRESS_MS);
  }, [handleComplete, clearHold]);

  if (allComplete) return null;

  return (
    <div className="h-[42vh] min-h-[240px] w-full shrink-0 relative bg-[#0a0a0a] rounded-t-3xl px-4 sm:px-6 pt-4 pb-8 flex flex-col border-t border-[#1a1a1a]">
      {activeTarget === null ? (
        completedCount === 0 ? (
          <button
            onClick={() => {
              hapticStart();
              playStartBeep();
              selectActivity(1);
            }}
            className="w-full h-full bg-[#CCFF00] rounded-2xl text-black text-2xl font-bold tracking-tight active:scale-[0.98] active:bg-[#aacc00] transition-transform flex items-center justify-center flex-col gap-1"
          >
            Start race
            <span className="text-black/60 text-xs font-medium">Tap to begin</span>
          </button>
        ) : (
          <ActivityList />
        )
      ) : (
        <div className="flex gap-2 w-full h-full min-h-0">
          <button
            onClick={() => {
              hapticButtonPress();
              resetCurrentTimer();
              if (activeTarget.kind === "activity") {
                redoActivity(activeTarget.id);
              } else {
                redoTransition(activeTarget.afterActivityId);
              }
            }}
            className="w-16 shrink-0 h-full bg-[#111] rounded-2xl text-gray-500 flex flex-col items-center justify-center gap-1 active:bg-[#1a1a1a] transition-colors min-w-[48px]"
            title="Reset this segment"
          >
            <RotateCcw className="w-6 h-6" />
            <span className="text-[10px] font-semibold tracking-wider uppercase">Undo</span>
          </button>

          {lastCompletedKind != null && (
            <button
              onClick={() => {
                hapticButtonPress();
                goBackOneStep();
              }}
              className="w-16 shrink-0 h-full bg-[#1a1a1a] rounded-2xl text-amber-400/90 flex flex-col items-center justify-center gap-1 active:bg-[#222] border border-amber-500/20 transition-colors min-w-[48px]"
              title="Re-open last segment"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
              <span className="text-[10px] font-semibold tracking-wider uppercase">Back</span>
            </button>
          )}

          {isRunning ? (
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                startHold();
              }}
              onPointerUp={clearHold}
              onPointerLeave={clearHold}
              onPointerCancel={clearHold}
              className="flex-1 min-w-0 h-full bg-[#CCFF00] rounded-2xl text-black text-xl sm:text-2xl font-bold tracking-tight flex flex-col items-center justify-center gap-0.5 relative overflow-hidden select-none"
            >
              {/* Long-press fill indicator */}
              <div
                className="absolute inset-0 bg-[#aacc00] origin-left transition-none"
                style={{ transform: `scaleX(${holdProgress})` }}
              />
              <span className="relative z-10">{isLastActivity ? "Finish race" : "Done"}</span>
              <span className="relative z-10 text-black/55 text-[11px] font-medium">
                {holdProgress > 0 ? "Keep holding..." : isLastActivity ? "Hold to finish" : "Hold to complete"}
              </span>
            </button>
          ) : (
            <button
              onClick={() => {
                hapticStart();
                playStartBeep();
                beginTimer(timerMs);
              }}
              className="flex-1 min-w-0 h-full bg-[#CCFF00] rounded-2xl text-black text-xl sm:text-2xl font-bold tracking-tight active:scale-[0.98] active:bg-[#aacc00] transition-transform flex flex-col items-center justify-center gap-0.5"
            >
              Start
              <span className="text-black/55 text-[11px] font-medium">Tap to record</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});
