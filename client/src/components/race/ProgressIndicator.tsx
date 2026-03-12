import { memo } from "react";
import { useRace } from "@/contexts/RaceContext";

export const ProgressIndicator = memo(function ProgressIndicator() {
  const { activities, activeTarget } = useRace();

  return (
    <div className="flex items-center justify-center gap-1.5 py-2 px-4 bg-black border-b border-[#1A1A1A]">
      {activities.map((act, i) => {
        const isCompleted = act.status === "completed";
        const isActive = activeTarget?.kind === "activity" && activeTarget.id === act.id;
        const isTransitioning = activeTarget?.kind === "transition" && activeTarget.afterActivityId === act.id;

        return (
          <div key={act.id} className="flex items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-[#CCFF00]"
                    : isActive
                      ? "bg-[#CCFF00] animate-pulse scale-125"
                      : "bg-[#333]"
                }`}
              />
              <span className="text-[9px] leading-none text-gray-500 font-mono tabular-nums">
                {i + 1}
              </span>
            </div>
            {i < activities.length - 1 && (
              <div
                className={`w-2 h-px mx-0.5 mt-2 ${
                  isTransitioning
                    ? "bg-[#CCFF00] animate-pulse"
                    : isCompleted
                      ? "bg-[#CCFF00]/50"
                      : "bg-[#333]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
