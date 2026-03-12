import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { athletes, raceResults, events } from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";
import pkg from "express";
const { json } = pkg;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(json());

  // Check-in helper: Fetch a pre-registered athlete via their Bib Number
  app.get("/api/athletes/:bib", async (req, res) => {
    try {
      const results = await db.select().from(athletes).where(eq(athletes.bib, req.params.bib)).limit(1);
      if (results.length > 0) {
        res.json(results[0]);
      } else {
        res.status(404).json({ error: "Athlete not found" });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Finish Line: Submit completed race result
  app.post("/api/race-results", async (req, res) => {
    try {
      const { athleteBib, athleteName, totalTimeMs, splits, category, volunteerName, partnerBib, partnerName, eventId } = req.body;
      const result = await db.insert(raceResults).values({
        athleteBib,
        athleteName,
        totalTimeMs,
        splits,
        category: category || null,
        volunteerName: volunteerName || null,
        partnerBib: partnerBib || null,
        partnerName: partnerName || null,
        eventId: eventId || null,
      }).returning();
      res.json(result[0]);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Time correction: Update splits for a race result (admin)
  app.patch("/api/race-results/:id", async (req, res) => {
    try {
      const { splits, totalTimeMs } = req.body;
      const result = await db.update(raceResults)
        .set({ splits, totalTimeMs })
        .where(eq(raceResults.id, req.params.id))
        .returning();
      if (result.length > 0) {
        res.json(result[0]);
      } else {
        res.status(404).json({ error: "Race result not found" });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Leaderboard: Get race results ordered by time
  app.get("/api/race-results", async (req, res) => {
    try {
      const results = await db.select().from(raceResults).orderBy(asc(raceResults.totalTimeMs)).limit(200);
      res.json(results);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Events: Get event by ID
  app.get("/api/events/:id", async (req, res) => {
    try {
      const results = await db.select().from(events).where(eq(events.id, req.params.id)).limit(1);
      if (results.length > 0) {
        res.json(results[0]);
      } else {
        res.status(404).json({ error: "Event not found" });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Events: Create or update
  app.put("/api/events/:id", async (req, res) => {
    try {
      const { name, date, location, activitySequence, categories, adminPin } = req.body;
      const result = await db.update(events)
        .set({
          name,
          date: date || null,
          location: location || null,
          activitySequence: activitySequence || null,
          categories: categories || null,
          adminPin: adminPin || "admin",
        })
        .where(eq(events.id, req.params.id))
        .returning();
      if (result.length > 0) {
        res.json(result[0]);
      } else {
        res.status(404).json({ error: "Event not found" });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  return httpServer;
}
