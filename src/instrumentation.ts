export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startQueue } = await import("@/lib/queue");
    const { registerHandlers } = await import("@/lib/queue-handlers");

    try {
      const boss = await startQueue();
      await registerHandlers(boss);
    } catch (err) {
      console.error("[pg-boss] Failed to start queue:", err);
    }
  }
}
