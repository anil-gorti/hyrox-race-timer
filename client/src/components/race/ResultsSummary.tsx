import { memo, useState } from "react";
import { useRace } from "@/contexts/RaceContext";
import { formatRaceTime, formatSplitTime } from "@/lib/formatTime";
import { shareResults } from "@/lib/sharing";
import { getVolunteerName } from "@/lib/volunteer";
import { Check, Share2, User, Award, Tag } from "lucide-react";

export const ResultsSummary = memo(function ResultsSummary() {
  const {
    activities, raceElapsedMs, totalTransitionMs,
    athleteName, athleteBib, athleteCategory, eventConfig, hasSynced,
  } = useRace();
  const volunteerName = getVolunteerName();
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    await shareResults({
      eventName: eventConfig.eventName || "Hyfit Games 2.1",
      athleteName: athleteName || "Unknown",
      category: athleteCategory,
      totalTimeMs: raceElapsedMs,
      transitionTotalMs: totalTransitionMs,
      activities,
    });
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="flex flex-col items-center w-full px-4 overflow-y-auto py-2">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-3">
          <img
            src="/branding/hyfit-logo.png"
            alt="Hyfit Games"
            className="h-8 w-auto object-contain"
          />
          <div className="flex flex-col items-center px-2">
            <h2 className="text-white text-sm font-semibold tracking-[0.18em] uppercase">
              {eventConfig.eventName || "Hyfit Games 2.1"}
            </h2>
            {(eventConfig.eventDate || eventConfig.location) && (
              <p className="text-gray-500 text-[10px] mt-0.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0">
                {eventConfig.eventDate && <span>{eventConfig.eventDate}</span>}
                {eventConfig.location && <span>{eventConfig.location}</span>}
              </p>
            )}
          </div>
          <img
            src="/branding/wone-logo.png"
            alt="Wone"
            className="h-7 w-auto object-contain"
          />
        </div>

        <div className="w-full bg-[#111] border border-[#252525] rounded-xl p-3 mb-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#CCFF00]/80 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Athlete</div>
              <div className="text-white text-sm font-semibold truncate">{athleteName || "—"}</div>
            </div>
          </div>
          {athleteBib ? (
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Bib</div>
                <div className="text-[#CCFF00]/90 text-sm font-mono">#{athleteBib}</div>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 shrink-0 flex items-center justify-center text-gray-500">
              <span className="text-[10px] font-bold uppercase">Cat</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Category</div>
              <div className="text-gray-300 text-sm font-medium">{athleteCategory || "—"}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full mb-3">
          <div className="bg-[#0d1f0d] rounded-lg p-2.5 border border-[#CCFF00]/30">
            <div className="text-[#CCFF00]/80 text-[10px] font-medium tracking-wider uppercase mb-0.5">Total time</div>
            <div className="text-white text-xl font-bold font-mono tabular-nums">{formatRaceTime(raceElapsedMs)}</div>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-2.5 border border-[#333]">
            <div className="text-gray-500 text-[10px] font-medium tracking-wider uppercase mb-0.5">Transition time</div>
            <div className="text-gray-400 text-sm font-mono tabular-nums">{formatRaceTime(totalTransitionMs)}</div>
          </div>
        </div>

        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[#EAB308] text-sm font-bold tracking-tight uppercase">Race splits</h3>
            <div className="flex items-center gap-2 text-[9px] text-gray-500">
              <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-sm bg-[#CCFF00]/50" /> Run</span>
              <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-sm bg-[#EAB308]/50" /> Station</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {activities.map((act) => {
              const isRun = act.type === "run";
              return (
                <div
                  key={act.id}
                  className={`rounded-lg p-2 border min-h-[56px] flex flex-col justify-between ${
                    isRun
                      ? "bg-[#0d1f0d] border-[#CCFF00]/25"
                      : "bg-[#1a1510] border-[#EAB308]/25"
                  }`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide leading-tight line-clamp-2">
                    <span className={isRun ? "text-[#CCFF00]/95" : "text-[#EAB308]/95"}>
                      {act.name === "Run" ? `Run ${Math.ceil(act.id / 2)}` : act.name}
                    </span>
                  </div>
                  {act.hasCounter && (act.counter || 0) > 0 && (
                    <div className="text-gray-500 text-[9px] font-medium uppercase mt-0.5">Count: {act.counter}</div>
                  )}
                  <div className="text-white text-sm font-bold font-mono tabular-nums mt-0.5">{formatSplitTime(act.elapsedMs)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Check className={`w-3.5 h-3.5 shrink-0 ${hasSynced ? "text-green-500" : "text-gray-500"}`} />
            {hasSynced ? "Synced to cloud" : "Saving…"}
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#333] text-gray-400 text-xs font-medium hover:text-white hover:border-[#555] transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            {shared ? "Copied!" : "Share"}
          </button>
        </div>
        {volunteerName ? (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-gray-500 text-[11px]">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="uppercase tracking-wider">Volunteer</span>
            <span className="text-gray-400">{volunteerName}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
});
