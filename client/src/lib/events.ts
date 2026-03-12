export type ActivityType = "run" | "exercise";
export type ActivityStatus = "pending" | "active" | "completed";

export interface Activity {
    id: number;
    name: string;
    type: ActivityType;
    metric: string;
    value: string;
    hasCounter?: boolean;
    counter?: number;
    elapsedMs: number;
    status: ActivityStatus;
}

export interface TransitionTime {
    afterActivityId: number;
    elapsedMs: number;
    status: ActivityStatus;
}

export const DEFAULT_ACTIVITIES: Activity[] = [
    { id: 1, name: "Run", type: "run", metric: "Distance", value: "200m", hasCounter: false, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 2, name: "SkiErg", type: "exercise", metric: "Distance", value: "500m", hasCounter: false, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 3, name: "Run", type: "run", metric: "Distance", value: "200m", hasCounter: false, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 4, name: "OH Plate Lunges", type: "exercise", metric: "Reps", value: "30", hasCounter: true, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 5, name: "Run", type: "run", metric: "Distance", value: "200m", hasCounter: false, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 6, name: "Surprise Station", type: "exercise", metric: "Reps", value: "—", hasCounter: false, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 7, name: "Run", type: "run", metric: "Distance", value: "200m", hasCounter: false, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 8, name: "RowErg", type: "exercise", metric: "Distance", value: "500m", hasCounter: false, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 9, name: "Run", type: "run", metric: "Distance", value: "200m", hasCounter: false, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 10, name: "Burpee Plate Touch", type: "exercise", metric: "Reps", value: "30", hasCounter: true, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 11, name: "Run", type: "run", metric: "Distance", value: "200m", hasCounter: false, counter: 0, elapsedMs: 0, status: "pending" },
    { id: 12, name: "DB Thrusters", type: "exercise", metric: "Reps", value: "30", hasCounter: true, counter: 0, elapsedMs: 0, status: "pending" },
];

export function buildDefaultTransitionTimes(activityCount: number): TransitionTime[] {
    return Array.from({ length: activityCount }, (_, i) => ({
        afterActivityId: i + 1,
        elapsedMs: 0,
        status: "pending" as ActivityStatus,
    }));
}

export function getStoredActivities(): Activity[] {
    const stored = localStorage.getItem("HYFIT_EVENTS");
    if (stored) {
        try {
            const parsed = JSON.parse(stored) as Activity[];
            return parsed.map((a) => ({
                ...a,
                hasCounter: a.hasCounter ?? false,
                counter: a.counter ?? 0,
            }));
        } catch {
            return DEFAULT_ACTIVITIES;
        }
    }
    return DEFAULT_ACTIVITIES;
}
