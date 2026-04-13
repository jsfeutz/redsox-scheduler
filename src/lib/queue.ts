import { PgBoss } from "pg-boss";
import type { SendOptions } from "pg-boss";

let boss: PgBoss | null = null;
let started = false;

function createBoss(): PgBoss {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for pg-boss");
  }
  const needsSsl =
    process.env.NODE_ENV === "production" ||
    connectionString.includes("amazonaws.com");
  return new PgBoss({
    connectionString,
    ...(needsSsl && { ssl: { rejectUnauthorized: false } }),
  });
}

export function getQueue(): PgBoss {
  if (!boss) {
    boss = createBoss();
  }
  return boss;
}

export async function startQueue(): Promise<PgBoss> {
  const q = getQueue();
  if (!started) {
    await q.start();
    started = true;
    console.log("[pg-boss] Queue started");
  }
  return q;
}

const ensuredQueues = new Set<string>();

async function ensureStarted(): Promise<PgBoss> {
  const q = getQueue();
  if (!started) {
    await q.start();
    started = true;
    console.log("[pg-boss] Queue started (on-demand)");
  }
  return q;
}

export async function enqueue<T extends object>(
  name: string,
  data: T,
  options?: SendOptions
): Promise<string | null> {
  const q = await ensureStarted();
  if (!ensuredQueues.has(name)) {
    await q.createQueue(name);
    ensuredQueues.add(name);
  }
  return q.send(name, data, options ?? {});
}
