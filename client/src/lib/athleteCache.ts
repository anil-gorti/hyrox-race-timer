import { supabase } from "./supabase";

const CACHE_KEY = "HYFIT_ATHLETES_CACHE";

interface CachedAthlete {
  id: string;
  bib: string;
  name: string;
  phone: string | null;
}

export function getCachedAthletes(): CachedAthlete[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function refreshAthleteCache(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("athletes")
      .select("id, bib, name, phone")
      .limit(1000);
    if (!error && data) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }
  } catch {
    // Silently fail — keep existing cache
  }
}

export function searchCachedAthletes(query: string): CachedAthlete[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const athletes = getCachedAthletes();
  return athletes.filter(
    (a) => a.name.toLowerCase().includes(q) || (a.phone && a.phone.includes(q))
  ).slice(0, 20);
}
