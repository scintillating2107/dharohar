import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { queryRows, type DB } from "./client";
import { users, masterLocations } from "./schema";
import { baselineMasterData } from "./master-data";
import { env } from "@/server/env";

/** Training accounts, created only when SEED_DEMO_USERS is enabled (default outside production). */
export const DEMO_ACCOUNTS = [
  { id: "U001", email: "admin@dharohar.gov", password: "admin123", name: "System Administrator", role: "ADMIN" },
  { id: "U002", email: "verification@dharohar.gov", password: "verify123", name: "Rajesh Kumar", role: "VERIFICATION_OFFICER" },
  { id: "U003", email: "data@dharohar.gov", password: "data123", name: "Priya Sharma", role: "DATA_OFFICER" },
  { id: "U004", email: "survey@dharohar.gov", password: "survey123", name: "Amit Verma", role: "SURVEY_OFFICER" },
  { id: "U005", email: "citizen@dharohar.gov", password: "citizen123", name: "Ramesh Singh", role: "CITIZEN" },
] as const;

export async function seedDatabase(db: DB): Promise<void> {
  const [{ count: userCount }] = await queryRows<{ count: number }>(db, sql`select count(*)::int as count from users`);

  if (userCount === 0 && env.bootstrapAdmin.email && env.bootstrapAdmin.password) {
    await db
      .insert(users)
      .values({
        id: "U-ADMIN",
        email: env.bootstrapAdmin.email.toLowerCase(),
        name: env.bootstrapAdmin.name,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(env.bootstrapAdmin.password, 10),
        notificationPrefs: { email: true, sms: false, inApp: true },
      })
      .onConflictDoNothing();
  }

  if (userCount === 0 && env.seedDemoUsers) {
    for (const account of DEMO_ACCOUNTS) {
      await db
        .insert(users)
        .values({
          id: account.id,
          email: account.email,
          name: account.name,
          role: account.role,
          district: "Lucknow",
          passwordHash: await bcrypt.hash(account.password, 10),
          notificationPrefs: { email: true, sms: false, inApp: true },
        })
        .onConflictDoNothing();
    }
  }

  const [{ count: masterCount }] = await queryRows<{ count: number }>(
    db,
    sql`select count(*)::int as count from master_locations`
  );

  if (masterCount === 0) {
    const rows = baselineMasterData();
    for (let i = 0; i < rows.length; i += 100) {
      await db.insert(masterLocations).values(
        rows.slice(i, i + 100).map((r) => ({
          level: r.level,
          state: r.state,
          district: r.district,
          tehsil: r.tehsil ?? null,
          village: r.village ?? null,
          nameHi: r.nameHi ?? null,
          lat: r.lat ?? null,
          lng: r.lng ?? null,
        }))
      );
    }
  }
}
