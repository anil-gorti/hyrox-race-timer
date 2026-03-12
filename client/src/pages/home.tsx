import { useState, useEffect } from "react";
import { RaceProvider, useRace } from "@/contexts/RaceContext";
import { SplashScreen } from "@/components/race/SplashScreen";
import { AthleteCheckin } from "@/components/race/AthleteCheckin";
import { StatusBar } from "@/components/race/StatusBar";
import { RaceTimer } from "@/components/race/RaceTimer";
import { RaceControls } from "@/components/race/RaceControls";
import { loadRaceState, clearRaceState, type PersistedRaceState } from "@/lib/raceState";
import { formatRaceTime, formatTime } from "@/lib/formatTime";
import { VolunteerPrompt } from "@/components/VolunteerPrompt";
import { getVolunteerName } from "@/lib/volunteer";
import { RoleSelect } from "@/components/RoleSelect";
import { AdminLoginScreen } from "@/components/AdminLoginScreen";
import { setRole } from "@/lib/role";

function SpectatorView({ onExit }: { onExit: () => void }) {
  const { raceElapsedMs, timerMs, activeTarget, activities, athleteName, isRunning } = useRace();

  const currentActivity = activeTarget?.kind === "activity"
    ? (() => {
        const a = activities.find(act => act.id === activeTarget.id);
        if (!a) return "";
        return a.name === "Run" ? `Run ${Math.ceil(a.id / 2)}` : a.name;
      })()
    : activeTarget?.kind === "transition" ? "Transition" : "";

  return (
    <div
      className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center font-sans cursor-pointer select-none"
      onClick={onExit}
    >
      {currentActivity && (
        <p className="text-[#CCFF00] text-2xl font-bold uppercase tracking-widest mb-4">{currentActivity}</p>
      )}
      <div
        className={`font-mono font-bold tabular-nums leading-none ${isRunning ? "text-white" : "text-gray-500"}`}
        style={{ fontSize: "clamp(4rem, 20vw, 10rem)" }}
      >
        {formatTime(timerMs)}
      </div>
      <div className="mt-6 text-center">
        <div className="text-gray-500 text-sm font-mono tabular-nums">{formatRaceTime(raceElapsedMs)}</div>
        <p className="text-gray-600 text-sm mt-4">{athleteName}</p>
      </div>
      <p className="absolute bottom-6 text-gray-700 text-xs">Tap anywhere to exit</p>
    </div>
  );
}

function RaceScreen() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [resumeState, setResumeState] = useState<PersistedRaceState | null>(null);
  const [spectatorMode, setSpectatorMode] = useState(false);
  const {
    resetRace, restoreRace,
    setAthleteName, setAthletePhone, setAthleteBib,
    setPartnerName, setPartnerBib,
  } = useRace();

  useEffect(() => {
    const saved = loadRaceState();
    if (saved) setResumeState(saved);
  }, []);

  const handleResume = () => {
    if (!resumeState) return;
    restoreRace(resumeState);
    setResumeState(null);
    setIsRegistered(true);
  };

  const handleDismissResume = () => {
    clearRaceState();
    setResumeState(null);
  };

  const handleNewAthlete = () => {
    resetRace();
    setAthleteName("");
    setAthletePhone("");
    setAthleteBib("");
    setPartnerName("");
    setPartnerBib("");
    setIsRegistered(false);
  };

  // Resume prompt
  if (resumeState) {
    const completedCount = resumeState.activities.filter(a => a.status === "completed").length;
    return (
      <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center font-sans px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#CCFF00]/10 flex items-center justify-center mx-auto">
            <span className="text-[#CCFF00] text-2xl">&#9654;</span>
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-1">Resume race?</h2>
            <p className="text-gray-500 text-sm">A race in progress was found</p>
          </div>
          <div className="bg-[#111] border border-[#333] rounded-xl p-4 space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Athlete</span>
              <span className="text-white text-sm font-medium">{resumeState.athleteName || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Bib</span>
              <span className="text-white text-sm font-mono">#{resumeState.athleteBib || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Progress</span>
              <span className="text-[#CCFF00] text-sm font-medium">{completedCount}/{resumeState.activities.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Race time</span>
              <span className="text-white text-sm font-mono tabular-nums">{formatRaceTime(resumeState.raceAccumulatedMs)}</span>
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={handleResume}
              className="w-full bg-[#CCFF00] text-black font-bold py-4 rounded-2xl text-base tracking-tight active:scale-[0.98] transition-transform"
            >
              Resume race
            </button>
            <button
              onClick={handleDismissResume}
              className="w-full bg-[#111] border border-[#333] text-gray-400 font-medium py-3 rounded-2xl text-sm active:bg-[#1a1a1a] transition-colors"
            >
              Start fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return <AthleteCheckin onReady={() => setIsRegistered(true)} />;
  }

  if (spectatorMode) {
    return <SpectatorView onExit={() => setSpectatorMode(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-sans">
      <StatusBar onNewAthlete={handleNewAthlete} onSpectatorMode={() => setSpectatorMode(true)} />
      <RaceTimer />
      <RaceControls />
    </div>
  );
}

export default function Home() {
  const [isLanded, setIsLanded] = useState(false);
  const [volunteerDone, setVolunteerDone] = useState(() => !!getVolunteerName());
  const [roleChoice, setRoleChoice] = useState<"volunteer" | "admin" | null>(null);

  if (!isLanded) {
    return <SplashScreen onContinue={() => setIsLanded(true)} />;
  }

  if (roleChoice === null) {
    return (
      <RoleSelect
        onVolunteer={() => {
          setRole("user");
          setRoleChoice("volunteer");
        }}
        onAdmin={() => {
          setRoleChoice("admin");
        }}
      />
    );
  }

  if (roleChoice === "admin") {
    return (
      <AdminLoginScreen
        onBack={() => setRoleChoice(null)}
        onSuccess={() => {
          setRoleChoice(null);
          window.location.href = "/admin";
        }}
      />
    );
  }

  if (!volunteerDone) {
    return <VolunteerPrompt onComplete={() => setVolunteerDone(true)} />;
  }

  return (
    <RaceProvider>
      <RaceScreen />
    </RaceProvider>
  );
}
