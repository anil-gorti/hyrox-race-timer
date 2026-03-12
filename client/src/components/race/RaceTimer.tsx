import { memo } from "react";
import { useRace } from "@/contexts/RaceContext";
import { formatTime } from "@/lib/formatTime";
import { Flag } from "lucide-react";
import { ResultsSummary } from "./ResultsSummary";

export const RaceTimer = memo(function RaceTimer() {
  const {
    activeTarget, activities, isRunning, timerMs,
    allComplete, completedCount, lastCompletedActivityId,
    activeActivity, bumpActiveCounter,
  } = useRace();

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-5 bg-black relative min-h-0">
      <div className="text-center w-full max-w-md">
        {activeTarget === null && !allComplete ? (
          <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
            <Flag className="w-12 h-12 opacity-50" />
            <p className="text-sm font-medium">{completedCount === 0 ? "Ready to start?" : "Select an activity below"}</p>
          </div>
        ) : allComplete ? (
          <ResultsSummary />
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
  );
});
