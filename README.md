# Hyfit Games 2.1 Timer

A volunteer timekeeper app for Hyfit Games 2.1 style race events. Allows timing individual athletes through 12 alternating activities (6 runs + 6 functional exercises), including Rox Time (transition time) between activities.

## Features

- **12 customizable activities** — alternating 200m runs and functional exercises
- **Per-activity stopwatch** — start, pause, resume, and complete each activity
- **Rox Time tracking** — transition timer auto-activates between each pair of activities (11 total), tracked separately in results
- **Overall race clock** — auto-starts with the first activity
- **Athlete check-in** — look up athletes by name or bib; capture name, phone, bib, gender, and age category
- **Event configuration** — set event name, date, and location (persisted in localStorage)
- **Admin panel** — PIN-protected admin role with event setup, dynamic activity sequence editor, and CSV export
- **Progress tracking** — completion percentage displayed throughout the race
- **Results summary** — on race completion, shows total race time, activity splits, and Rox Time breakdown
- **Reset controls** — reset individual activities/Rox times or the entire race
- **Android support** — packaged as a native Android app via Capacitor

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

1. Athlete checks in (name, phone, bib, gender, age category)
2. Select an activity → Start timer → Mark Done
3. Rox Time auto-activates → Start Rox timer → Mark Done
4. Next activity auto-activates → repeat
5. After activity 12, race is complete and results are shown

## Admin Panel

Access via the hamburger menu on the timer screen (admin PIN required).

- **Event setup** — set event name, date, and location
- **Activity sequence** — reorder, add, remove, or edit any activity (name, type, metric, value)
- **Restore defaults** — reset activities to the default Hyfit Games sequence
- **CSV export** — download activity configuration as a CSV file
- **Supabase sync** — optionally sync athlete roster from a Google Sheet via Supabase

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Routing**: wouter (single page at `/`)
- **Build**: Vite + Express (dev server)
- **Mobile**: Capacitor (Android)
- **Backend/DB**: Supabase (athlete lookup; optional)
- **State**: All timer state managed client-side in React; event config persisted in localStorage

## Project Structure

```
client/src/pages/home.tsx      # Main race timer + athlete check-in (all timer logic and UI)
client/src/pages/admin.tsx     # Admin panel (event setup, activity config, CSV export)
client/src/lib/eventConfig.ts  # Event name/date/location config (localStorage)
client/src/lib/events.ts       # Activity definitions and stored activities
client/src/lib/role.ts         # Admin role and PIN management
client/src/lib/supabase.ts     # Supabase client (athlete lookup)
client/src/App.tsx             # Router setup
server/routes.ts               # Express routes (minimal)
shared/schema.ts               # Base schema
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

## Measurement Types

Activities support the following measurement options: **Distance**, **Reps**, **Time**, **Weight**, **Calories**

## Gender & Age Categories

**Gender options:** Men, Women, Men Pro, Women Pro

**Age categories:** 16-24, 25-29, 30-34, 35-39, 40-44, 45-49, 50-54, 55-59, 60-64, 65-69, 70+

## License

MIT
