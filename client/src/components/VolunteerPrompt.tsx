import { useState } from "react";
import { getVolunteerName, setVolunteerName } from "@/lib/volunteer";

interface VolunteerPromptProps {
  onComplete: () => void;
}

export function VolunteerPrompt({ onComplete }: VolunteerPromptProps) {
  const [name, setName] = useState(getVolunteerName() || "");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      setVolunteerName(trimmed);
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center font-sans px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <p className="text-[#CCFF00] font-semibold tracking-wider text-xs uppercase mb-4">HYFIT GAMES</p>
          <h2 className="text-2xl font-bold tracking-tight mb-1">Welcome, volunteer!</h2>
          <p className="text-gray-500 text-sm">Your name will be attached to race results you record</p>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full bg-[#111] border border-[#333] focus:border-[#CCFF00] outline-none py-3 px-4 text-base text-center placeholder-gray-500 rounded-xl transition-colors"
          placeholder="Your name"
          autoFocus
        />
        <button
          onClick={handleSubmit}
          className="w-full bg-[#CCFF00] text-black font-bold py-4 rounded-2xl text-base tracking-tight active:scale-[0.98] transition-transform"
        >
          {name.trim() ? "Continue" : "Skip"}
        </button>
      </div>
    </div>
  );
}
