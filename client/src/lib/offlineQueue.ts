import { supabase } from "./supabase";

const QUEUE_KEY = "HYFIT_OFFLINE_QUEUE";

interface QueuedResult {
  event_id: string | null;
  athlete_bib: string;
  athlete_name: string;
  category: string;
  volunteer_name: string | null;
  partner_bib: string | null;
  partner_name: string | null;
  total_time_ms: number;
  splits: unknown;
}

export function getQueuedCount(): number {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return 0;
    return (JSON.parse(raw) as QueuedResult[]).length;
  } catch {
    return 0;
  }
}

export function enqueueResult(result: QueuedResult): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue: QueuedResult[] = raw ? JSON.parse(raw) : [];
    queue.push(result);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    console.error("Failed to enqueue offline result");
  }
}

export async function drainQueue(): Promise<number> {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return 0;

  let queue: QueuedResult[];
  try {
    queue = JSON.parse(raw);
  } catch {
    localStorage.removeItem(QUEUE_KEY);
    return 0;
  }

  if (queue.length === 0) return 0;

  const failed: QueuedResult[] = [];
  let synced = 0;

  for (const item of queue) {
    const { error } = await supabase.from("race_results").insert([item]);
    if (error) {
      failed.push(item);
    } else {
      synced++;
    }
  }

  if (failed.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  } else {
    localStorage.removeItem(QUEUE_KEY);
  }

  return synced;
}
