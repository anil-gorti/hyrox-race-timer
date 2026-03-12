import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getActiveEventId } from "@/lib/eventService";
import { formatRaceTime } from "@/lib/formatTime";

type DisplayMode = "leaderboard" | "live" | "feed";

interface LeaderboardEntry {
  id: string;
  athlete_name: string;
  athlete_bib: string;
  category: string;
  partner_name: string | null;
  total_time_ms: number;
}

interface LiveTimerPayload {
  athleteName: string;
  partnerName?: string;
  category: string;
  currentActivity: string;
  elapsedMs: number;
  raceElapsedMs: number;
}

interface FeedEntry {
  id: string;
  athlete_name: string;
  category: string;
  total_time_ms: number;
  partner_name: string | null;
  created_at: string;
}

// --- Leaderboard Mode ---
function LeaderboardView({ eventId }: { eventId: string | null }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  useEffect(() => {
    const loadLeaderboard = async () => {
      let query = supabase
        .from("race_results")
        .select("id, athlete_name, athlete_bib, category, partner_name, total_time_ms")
        .order("total_time_ms", { ascending: true });

      if (eventId) query = query.eq("event_id", eventId);

      const { data } = await query;
      if (data) setEntries(data as LeaderboardEntry[]);
    };

    loadLeaderboard();

    // Real-time subscription for new results
    const channel = supabase
      .channel("leaderboard-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "race_results" },
        (payload) => {
          const newEntry = payload.new as LeaderboardEntry;
          if (eventId && (newEntry as unknown as Record<string, unknown>).event_id !== eventId) return;
          setEntries((prev) => {
            const updated = [...prev, newEntry];
            updated.sort((a, b) => a.total_time_ms - b.total_time_ms);
            return updated;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const categories = ["All", ...Array.from(new Set(entries.map((e) => e.category).filter(Boolean)))];
  const filtered = categoryFilter === "All" ? entries : entries.filter((e) => e.category === categoryFilter);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-8 py-4 overflow-x-auto shrink-0">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              categoryFilter === cat
                ? "bg-[#CCFF00] text-black"
                : "bg-[#1a1a1a] text-gray-400 hover:bg-[#222]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <table className="w-full">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-[#333]">
              <th className="text-left py-3 px-2 w-16">#</th>
              <th className="text-left py-3 px-2">Athlete</th>
              <th className="text-left py-3 px-2 hidden sm:table-cell">Category</th>
              <th className="text-right py-3 px-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, i) => (
              <tr
                key={entry.id}
                className={`border-b border-[#1a1a1a] ${i < 3 ? "text-[#CCFF00]" : "text-white"}`}
              >
                <td className="py-4 px-2 font-bold text-2xl tabular-nums">{i + 1}</td>
                <td className="py-4 px-2">
                  <div className="font-bold text-lg">{entry.athlete_name}</div>
                  {entry.partner_name && (
                    <div className="text-gray-500 text-sm">& {entry.partner_name}</div>
                  )}
                  <div className="text-gray-600 text-xs font-mono">#{entry.athlete_bib}</div>
                </td>
                <td className="py-4 px-2 text-gray-400 text-sm hidden sm:table-cell">{entry.category}</td>
                <td className="py-4 px-2 text-right font-mono font-bold text-xl tabular-nums">
                  {formatRaceTime(entry.total_time_ms)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-16 text-center text-gray-600 text-lg">
                  No results yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Live Timer Mode ---
function LiveTimerView({ eventId }: { eventId: string | null }) {
  const [payload, setPayload] = useState<LiveTimerPayload | null>(null);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [displayMs, setDisplayMs] = useState(0);
  const animRef = useRef<number>(0);
  const baseTimeRef = useRef(0);
  const baseTimestampRef = useRef(0);

  useEffect(() => {
    const channelName = `live-timer-${eventId || "default"}`;
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "timer-update" }, ({ payload: p }) => {
        const data = p as LiveTimerPayload;
        setPayload(data);
        setLastUpdate(Date.now());
        baseTimeRef.current = data.raceElapsedMs;
        baseTimestampRef.current = Date.now();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  // Smooth local interpolation between broadcasts
  useEffect(() => {
    if (!payload) return;
    const tick = () => {
      const elapsed = Date.now() - baseTimestampRef.current;
      setDisplayMs(baseTimeRef.current + elapsed);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [payload]);

  const stale = lastUpdate > 0 && Date.now() - lastUpdate > 5000;

  if (!payload) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-600">
        <div className="text-6xl mb-6 opacity-30">&#9202;</div>
        <p className="text-2xl font-medium">Waiting for live timer...</p>
        <p className="text-lg mt-2">A volunteer needs to start timing an athlete</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center relative">
      {stale && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-amber-900/50 text-amber-400 px-4 py-2 rounded-full text-sm font-medium animate-pulse">
          Reconnecting...
        </div>
      )}
      <p className="text-[#CCFF00] text-2xl font-bold uppercase tracking-widest mb-2">
        {payload.currentActivity}
      </p>
      <div className="text-white font-mono font-bold tabular-nums leading-none" style={{ fontSize: "clamp(4rem, 15vw, 12rem)" }}>
        {formatRaceTime(displayMs)}
      </div>
      <div className="mt-6 text-center">
        <p className="text-white text-3xl font-bold">{payload.athleteName}</p>
        {payload.partnerName && (
          <p className="text-gray-400 text-xl mt-1">& {payload.partnerName}</p>
        )}
        <p className="text-gray-500 text-lg mt-2">{payload.category}</p>
      </div>
    </div>
  );
}

// --- Results Feed Mode ---
function ResultsFeedView({ eventId }: { eventId: string | null }) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);

  useEffect(() => {
    const loadRecent = async () => {
      let query = supabase
        .from("race_results")
        .select("id, athlete_name, category, total_time_ms, partner_name, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (eventId) query = query.eq("event_id", eventId);

      const { data } = await query;
      if (data) setEntries(data as FeedEntry[]);
    };

    loadRecent();

    const channel = supabase
      .channel("feed-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "race_results" },
        (payload) => {
          const newEntry = payload.new as FeedEntry;
          if (eventId && (newEntry as unknown as Record<string, unknown>).event_id !== eventId) return;
          setEntries((prev) => [newEntry, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <div className="space-y-4 max-w-2xl mx-auto">
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            className={`bg-[#111] border border-[#222] rounded-2xl p-6 flex items-center justify-between transition-all ${
              i === 0 ? "border-[#CCFF00]/40 shadow-[0_0_20px_rgba(204,255,0,0.1)]" : ""
            }`}
          >
            <div>
              <div className="text-white text-xl font-bold">{entry.athlete_name}</div>
              {entry.partner_name && (
                <div className="text-gray-500 text-sm">& {entry.partner_name}</div>
              )}
              <div className="text-gray-500 text-sm mt-1">{entry.category}</div>
            </div>
            <div className="text-right">
              <div className="text-[#CCFF00] text-2xl font-mono font-bold tabular-nums">
                {formatRaceTime(entry.total_time_ms)}
              </div>
              {i === 0 && (
                <div className="text-[#CCFF00]/60 text-xs font-semibold uppercase tracking-wider mt-1">
                  Just finished
                </div>
              )}
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-center py-16 text-gray-600 text-lg">
            Waiting for athletes to finish...
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main Display Page ---
export default function Display() {
  const [mode, setMode] = useState<DisplayMode>("leaderboard");
  const eventId = getActiveEventId();

  // Auto-cycle mode from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") as DisplayMode | null;
    if (m && ["leaderboard", "live", "feed"].includes(m)) {
      setMode(m);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col font-sans">
      {/* Mode tabs */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#1a1a1a] shrink-0">
        <h1 className="text-[#CCFF00] font-bold text-lg tracking-wider uppercase">HYFIT Games</h1>
        <div className="flex gap-1">
          {(["leaderboard", "live", "feed"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                mode === m ? "bg-[#CCFF00] text-black" : "text-gray-500 hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              {m === "feed" ? "Feed" : m === "live" ? "Live" : "Leaderboard"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {mode === "leaderboard" && <LeaderboardView eventId={eventId} />}
        {mode === "live" && <LiveTimerView eventId={eventId} />}
        {mode === "feed" && <ResultsFeedView eventId={eventId} />}
      </div>
    </div>
  );
}
