import { supabase } from "./supabase";
import type { Activity } from "./events";

const CONFIG_CACHE_KEY = "HYFIT_EVENT_CONFIG";
const ACTIVE_EVENT_KEY = "HYFIT_ACTIVE_EVENT_ID";

export interface EventConfig {
  id?: string;
  eventName: string;
  eventDate: string;
  location: string;
  activitySequence?: Activity[];
  categories?: string[];
  adminPin?: string;
}

const DEFAULT: EventConfig = {
  eventName: "Hyfit Games 2.1",
  eventDate: "",
  location: "",
};

/** Get the active event ID (stored locally) */
export function getActiveEventId(): string | null {
  return localStorage.getItem(ACTIVE_EVENT_KEY);
}

export function setActiveEventId(id: string): void {
  localStorage.setItem(ACTIVE_EVENT_KEY, id);
}

/** Get cached config synchronously (for immediate render) */
export function getEventConfigSync(): EventConfig {
  try {
    const raw = localStorage.getItem(CONFIG_CACHE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<EventConfig>;
    return { ...DEFAULT, ...parsed };
  } catch {
    return { ...DEFAULT };
  }
}

/** Cache config to localStorage */
function cacheConfig(config: EventConfig): void {
  localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
}

/** Fetch event config from Supabase, falling back to cache */
export async function fetchEventConfig(eventId?: string): Promise<EventConfig> {
  const id = eventId || getActiveEventId();
  if (!id) return getEventConfigSync();

  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return getEventConfigSync();

    const config: EventConfig = {
      id: data.id,
      eventName: data.name || DEFAULT.eventName,
      eventDate: data.date || "",
      location: data.location || "",
      activitySequence: data.activity_sequence as Activity[] | undefined,
      categories: data.categories as string[] | undefined,
      adminPin: data.admin_pin || undefined,
    };
    cacheConfig(config);
    return config;
  } catch {
    return getEventConfigSync();
  }
}

/** Create or update event in Supabase */
export async function saveEventConfig(config: EventConfig): Promise<EventConfig> {
  const payload = {
    name: config.eventName,
    date: config.eventDate || null,
    location: config.location || null,
    activity_sequence: config.activitySequence || null,
    categories: config.categories || null,
    admin_pin: config.adminPin || "admin",
  };

  if (config.id) {
    const { data, error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", config.id)
      .select()
      .single();

    if (error) throw error;
    const updated = { ...config, id: data.id };
    cacheConfig(updated);
    setActiveEventId(data.id);
    return updated;
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    const created: EventConfig = {
      ...config,
      id: data.id,
    };
    cacheConfig(created);
    setActiveEventId(data.id);
    return created;
  }
}

/** Fetch admin PIN for the active event */
export async function fetchAdminPin(): Promise<string> {
  const id = getActiveEventId();
  if (!id) return "admin";

  try {
    const { data, error } = await supabase
      .from("events")
      .select("admin_pin")
      .eq("id", id)
      .single();

    if (error || !data) return "admin";
    return data.admin_pin || "admin";
  } catch {
    return "admin";
  }
}
