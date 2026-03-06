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

export const athletes = pgTable("athletes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bib: varchar("bib", { length: 50 }).notNull().unique(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const raceResults = pgTable("race_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  athleteBib: varchar("athlete_bib", { length: 50 }).notNull(),
  athleteName: text("athlete_name").notNull(),
  totalTimeMs: integer("total_time_ms").notNull(),
  splits: jsonb("splits").notNull(), // an array of the 12 activities + rox
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAthleteSchema = createInsertSchema(athletes);
export type Athlete = typeof athletes.$inferSelect;
export type InsertAthlete = z.infer<typeof insertAthleteSchema>;

export const insertRaceResultSchema = createInsertSchema(raceResults);
export type RaceResult = typeof raceResults.$inferSelect;
export type InsertRaceResult = z.infer<typeof insertRaceResultSchema>;
