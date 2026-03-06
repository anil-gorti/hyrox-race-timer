import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found. Running with an empty Mock Database interface if needed.");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:mock@localhost:5432/mock",
});

export const db = drizzle(pool, { schema });
