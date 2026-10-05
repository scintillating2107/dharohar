import path from "path";
import { mkdirSync } from "fs";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import * as schema from "./schema";
import { env } from "@/server/env";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Runs raw SQL and returns typed rows (both drivers expose `.rows`). */
export async function queryRows<T>(db: DB, query: SQL): Promise<T[]> {
  const result = (await db.execute(query)) as unknown as { rows: T[] };
  return result.rows;
}

interface DbState {
  db: DB;
  driver: "postgres" | "pglite";
  close: () => Promise<void>;
}

declare global {
  var __dharoharDb: Promise<DbState> | undefined;
}

function migrationsFolder(): string {
  return path.join(process.cwd(), "drizzle");
}

export function pgliteDataDir(): string {
  if (env.pgliteDir) return env.pgliteDir;
  if (env.isServerless) return path.join("/tmp", "dharohar-pgdata");
  return path.join(process.cwd(), "data", "pgdata");
}

async function connect(): Promise<DbState> {
  if (env.databaseUrl) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: env.databaseUrl, max: env.isServerless ? 3 : 10 });
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: migrationsFolder() });
    return { db: db as unknown as DB, driver: "postgres", close: () => pool.end() };
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = pgliteDataDir();
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: migrationsFolder() });
  return { db: db as unknown as DB, driver: "pglite", close: () => client.close() };
}

async function init(): Promise<DbState> {
  const state = await connect();
  const { seedDatabase } = await import("./seed");
  await seedDatabase(state.db);
  return state;
}

/** Returns the shared database handle, running migrations and seeding on first use. */
export async function getDb(): Promise<DB> {
  if (!global.__dharoharDb) {
    global.__dharoharDb = init().catch((err) => {
      global.__dharoharDb = undefined;
      throw err;
    });
  }
  return (await global.__dharoharDb).db;
}

export async function getDbDriver(): Promise<"postgres" | "pglite"> {
  await getDb();
  return (await global.__dharoharDb!).driver;
}

export async function closeDb(): Promise<void> {
  if (!global.__dharoharDb) return;
  const state = await global.__dharoharDb;
  global.__dharoharDb = undefined;
  await state.close();
}

export { schema };
