import { memo, useState } from "react";
import { useRace } from "@/contexts/RaceContext";
import { supabase } from "@/lib/supabase";
import { searchCachedAthletes } from "@/lib/athleteCache";

const CATEGORY_OPTIONS = [
  "Singles Open Male", "Singles Open Female",
  "Singles Pro Male", "Singles Pro Female",
  "Doubles Male", "Doubles Female", "Doubles Mixed"
] as const;

interface AthleteCheckinProps {
  onReady: () => void;
}

export const AthleteCheckin = memo(function AthleteCheckin({ onReady }: AthleteCheckinProps) {
  const {
    athleteName, athletePhone, athleteBib, athleteCategory,
    partnerName, partnerBib,
    setAthleteName, setAthletePhone, setAthleteBib, setAthleteCategory,
    setPartnerName, setPartnerBib,
  } = useRace();

  const [athleteSearch, setAthleteSearch] = useState("");
  const [athleteSearchResults, setAthleteSearchResults] = useState<Array<{ id: string; bib: string; name: string; phone: string | null }>>([]);
  const [athleteSearching, setAthleteSearching] = useState(false);

  const lookupAthlete = async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setAthleteSearchResults([]);
      return;
    }
    setAthleteSearching(true);
    try {
      if (!navigator.onLine) {
        // Offline: use cached athletes
        setAthleteSearchResults(searchCachedAthletes(q));
        return;
      }
      const { data, error } = await supabase
        .from("athletes")
        .select("id, bib, name, phone")
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(20);
      if (!error && data) {
        setAthleteSearchResults(data as Array<{ id: string; bib: string; name: string; phone: string | null }>);
      } else {
        // Supabase failed — fall back to cache
        setAthleteSearchResults(searchCachedAthletes(q));
      }
    } catch {
      setAthleteSearchResults(searchCachedAthletes(q));
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
    onReady();
  };

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden flex flex-col font-sans px-6 pt-10 pb-6">
      <div className="flex-1 min-h-0 overflow-y-auto">
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
          <div>
            <label className="text-gray-500 text-[11px] font-medium tracking-wider uppercase block mb-1">Category</label>
            <select
              value={athleteCategory}
              onChange={(e) => setAthleteCategory(e.target.value)}
              className="w-full bg-[#1a1a1a] border-2 border-[#333] focus:border-[#CCFF00] focus:ring-1 focus:ring-[#CCFF00]/30 outline-none py-3 px-3 text-base text-white rounded-xl font-medium transition-colors"
            >
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c} className="bg-[#1a1a1a] text-white">{c}</option>)}
            </select>
          </div>
          {athleteCategory.startsWith("Doubles") && (
            <div className="border border-[#CCFF00]/20 rounded-xl p-4 space-y-3 bg-[#0d1f0d]/30">
              <p className="text-[#CCFF00]/80 text-[11px] font-semibold tracking-wider uppercase">Partner details</p>
              <div>
                <label className="text-gray-500 text-[11px] font-medium tracking-wider uppercase block mb-1">Partner name</label>
                <input type="text" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className="w-full bg-[#111] border-b border-[#333] focus:border-[#CCFF00] outline-none py-2.5 text-base placeholder-gray-600 transition-colors rounded-none" placeholder="e.g. Jane Doe" />
              </div>
              <div>
                <label className="text-gray-500 text-[11px] font-medium tracking-wider uppercase block mb-1">Partner bib (optional)</label>
                <input type="text" value={partnerBib} onChange={(e) => setPartnerBib(e.target.value)} className="w-full bg-[#111] border-b border-[#333] focus:border-[#CCFF00] outline-none py-2.5 text-base placeholder-gray-600 transition-colors rounded-none" placeholder="e.g. 403" />
              </div>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onReady}
        disabled={!athleteName}
        className="w-full bg-[#CCFF00] text-black font-bold py-4 rounded-2xl text-base tracking-tight active:scale-[0.98] disabled:opacity-50 disabled:bg-[#333] disabled:text-gray-500 transition-all mt-5 shrink-0"
      >
        Ready to race
      </button>
    </div>
  );
});
