import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { athletes, raceResults } from "@shared/schema";
import { eq } from "drizzle-orm";
import pkg from "express";
const { json } = pkg;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(json());

  // Check-in helper: Fetch a pre-registered athlete via Supabase using their Bib Number
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

  // Finish Line helper: Submit the complete race JSON into Supabase
  app.post("/api/race-results", async (req, res) => {
    try {
      const { athleteBib, athleteName, totalTimeMs, splits } = req.body;
      const result = await db.insert(raceResults).values({
        athleteBib,
        athleteName,
        totalTimeMs,
        splits
      }).returning();
      res.json(result[0]);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  return httpServer;
}
