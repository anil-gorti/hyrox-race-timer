# Hyfit Games 2.1 Timer

## Overview
A volunteer timekeeper app for Hyfit Games 2.1 style race events. Allows timing individual athletes through 12 alternating activities (6 runs + 6 functional exercises), including Rox Time (transition time) between activities.

## Architecture
- **Frontend-only app** - No database needed, all state managed in React
- **Stack**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Routing**: wouter (single page at `/`)
- **Build**: Vite + Express (dev server)

## Key Features
- 12 customizable activities (alternating 200m runs and exercises)
- Per-activity stopwatch timer (start/pause/resume/complete)
- **Rox Time** - Transition timer between each pair of activities (11 total)
  - Auto-activates after completing an activity
  - Same start/stop/done controls as activity timers
  - Tracked separately in results summary
- Overall race clock (auto-starts with first activity)
- Edit any activity (name, type, metric, value)
- Progress tracking with completion percentage
- Results summary on race completion (total race time, activity time, rox time breakdown)
- Reset individual activities/rox times or entire race

## File Structure
- `client/src/pages/home.tsx` - Main race timer page (all timer logic and UI)
- `client/src/App.tsx` - Router setup
- `server/routes.ts` - Express routes (minimal, no custom API needed)
- `shared/schema.ts` - Base schema (users table, not actively used)

## Timer Flow
1. Select an activity → Start timer → Done
2. Rox Time auto-activates → Start rox timer → Done
3. Next activity auto-activates → repeat
4. After activity 12, race is complete

## Default Activities
1. Run (200m) → 2. SkiErg (1000m) → 3. Run (200m) → 4. Burpee Broad Jumps (80m)
→ 5. Run (200m) → 6. Rowing (1000m) → 7. Run (200m) → 8. Farmers Carry (200m)
→ 9. Run (200m) → 10. Sandbag Lunges (100m) → 11. Run (200m) → 12. Wall Balls (75 reps)

## Measurement Options
Distance, Reps, Time, Weight, Calories
