import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  date: varchar("date", { length: 20 }),
  location: text("location"),
  activitySequence: jsonb("activity_sequence"),
  categories: jsonb("categories"),
  adminPin: varchar("admin_pin", { length: 50 }).default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events);
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export const athletes = pgTable("athletes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bib: varchar("bib", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  gender: varchar("gender", { length: 20 }),
  category: varchar("category", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAthleteSchema = createInsertSchema(athletes);
export type Athlete = typeof athletes.$inferSelect;
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;

export const raceResults = pgTable("race_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id", { length: 255 }),
  athleteBib: varchar("athlete_bib", { length: 50 }).notNull(),
  athleteName: text("athlete_name").notNull(),
  category: varchar("category", { length: 50 }),
  volunteerName: text("volunteer_name"),
  partnerBib: varchar("partner_bib", { length: 50 }),
  partnerName: text("partner_name"),
  totalTimeMs: integer("total_time_ms").notNull(),
  splits: jsonb("splits").notNull(), // array of activity splits with transition times
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRaceResultSchema = createInsertSchema(raceResults);
export type RaceResult = typeof raceResults.$inferSelect;
export type InsertRaceResult = z.infer<typeof insertRaceResultSchema>;
