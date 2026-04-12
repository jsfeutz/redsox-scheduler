import { PgBoss } from "pg-boss";
import type { SendOptions } from "pg-boss";

let boss: PgBoss | null = null;

export function getQueue(): PgBoss {
  if (!boss) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for pg-boss");
    }
    boss = new PgBoss(connectionString);
  }
  return boss;
}

export async function startQueue(): Promise<PgBoss> {
  const q = getQueue();
  await q.start();
  console.log("[pg-boss] Queue started");
  return q;
}

export async function enqueue<T extends object>(
  name: string,
  data: T,
  options?: SendOptions
): Promise<string | null> {
  const q = getQueue();
  return q.send(name, data, options ?? {});
}
