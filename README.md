# Hyrox Race Timer

A volunteer timekeeper app for Hyrox race events. Allows timing individual athletes through 12 alternating activities (6 runs + 6 functional exercises), including Rox Time (transition time) between activities.

## Features

- **12 customizable activities** — alternating 200m runs and functional exercises
- **Per-activity stopwatch** — start, pause, resume, and complete each activity
- **Rox Time tracking** — transition timer auto-activates between each pair of activities (11 total), tracked separately in results
- **Overall race clock** — auto-starts with the first activity
- **Editable activities** — customize name, type, metric, and value for any activity
- **Progress tracking** — completion percentage displayed throughout the race
- **Results summary** — on race completion, shows total race time, activity time, and Rox Time breakdown
- **Reset controls** — reset individual activities/Rox times or the entire race

## Default Activity Sequence

1. Run (200m)
2. SkiErg (1000m)
3. Run (200m)
4. Burpee Broad Jumps (80m)
5. Run (200m)
6. Rowing (1000m)
7. Run (200m)
8. Farmers Carry (200m)
9. Run (200m)
10. Sandbag Lunges (100m)
11. Run (200m)
12. Wall Balls (75 reps)

## Timer Flow

1. Select an activity → Start timer → Mark Done
2. Rox Time auto-activates → Start Rox timer → Mark Done
3. Next activity auto-activates → repeat
4. After activity 12, race is complete and results are shown

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Routing**: wouter (single page at `/`)
- **Build**: Vite + Express (dev server)
- **No database required** — all state managed client-side in React

## Project Structure

```
client/src/pages/home.tsx   # Main race timer page (all timer logic and UI)
client/src/App.tsx          # Router setup
server/routes.ts            # Express routes (minimal, no custom API needed)
shared/schema.ts            # Base schema (not actively used)
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

## Measurement Types

Activities support the following measurement options: **Distance**, **Reps**, **Time**, **Weight**, **Calories**

## License

MIT
