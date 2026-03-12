import { memo } from "react";
import { useRace } from "@/contexts/RaceContext";
import { Play } from "lucide-react";

export const ActivityList = memo(function ActivityList() {
  const { activities, transitionTimes, selectActivity, selectTransition } = useRace();

  return (
    <div className="flex-1 overflow-y-auto space-y-2 pb-4" style={{ scrollbarWidth: "none" }}>
      {activities.map(act => {
        const isCompleted = act.status === "completed";
        const tt = transitionTimes.find(r => r.afterActivityId === act.id);
        const isTtCompleted = tt?.status === "completed";
        if (isCompleted && tt && isTtCompleted) return null;

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
            {isCompleted && tt && !isTtCompleted && (
              <div
                onClick={() => selectTransition(act.id)}
                className="w-full bg-[#111] border border-[#CCFF00]/30 rounded-xl p-3 flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer mt-2"
              >
                <div>
                  <div className="text-[#CCFF00] font-semibold text-base">Transition</div>
                  <div className="text-gray-500 text-xs">To next station</div>
                </div>
                <Play className="text-[#CCFF00] w-6 h-6 opacity-60 shrink-0" />
              </div>
            )}
          </div>
        );
      })}
      <div className="h-4" />
    </div>
  );
});
