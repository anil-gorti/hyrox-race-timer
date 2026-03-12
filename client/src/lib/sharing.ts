import { formatRaceTime, formatSplitTime } from "./formatTime";
import type { Activity } from "./events";

interface ShareData {
  eventName: string;
  athleteName: string;
  category: string;
  totalTimeMs: number;
  transitionTotalMs: number;
  activities: Activity[];
}

export async function shareResults(data: ShareData): Promise<void> {
  const lines = [
    `${data.eventName}`,
    `${data.athleteName} — ${data.category}`,
    ``,
    `Total: ${formatRaceTime(data.totalTimeMs)}`,
    `Transitions: ${formatRaceTime(data.transitionTotalMs)}`,
    ``,
    `Splits:`,
    ...data.activities.map((a) => {
      const label = a.name === "Run" ? `Run ${Math.ceil(a.id / 2)}` : a.name;
      return `  ${label}: ${formatSplitTime(a.elapsedMs)}`;
    }),
  ];

  const text = lines.join("\n");

  if (navigator.share) {
    try {
      await navigator.share({ title: `${data.eventName} — ${data.athleteName}`, text });
      return;
    } catch {
      // User cancelled or share failed — fall through to clipboard
    }
  }

  await navigator.clipboard.writeText(text);
}
