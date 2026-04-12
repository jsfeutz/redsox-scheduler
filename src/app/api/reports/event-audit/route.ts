import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canViewEventAudit } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canViewEventAudit(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const format = searchParams.get("format");
  const rawLimit = parseInt(searchParams.get("limit") || "500", 10);
  const limit = Math.min(Number.isFinite(rawLimit) ? rawLimit : 500, 2000);

  const where: Prisma.ScheduleEventAuditLogWhereInput = {
    organizationId: user.organizationId,
  };

  const createdAt: Prisma.DateTimeFilter = {};
  if (startDate) createdAt.gte = new Date(startDate);
  if (endDate) createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
  if (Object.keys(createdAt).length > 0) {
    where.createdAt = createdAt;
  }

  const entries = await prisma.scheduleEventAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (format === "csv") {
    const header =
      "createdAt,action,scheduleEventId,recurrenceGroupId,actorUserId,actorLabel,summary\n";
    const body = entries
      .map((r) =>
        [
          csvCell(r.createdAt.toISOString()),
          csvCell(r.action),
          csvCell(r.scheduleEventId),
          csvCell(r.recurrenceGroupId),
          csvCell(r.actorUserId),
          csvCell(r.actorLabel),
          csvCell(r.summary),
        ].join(",")
      )
      .join("\n");
    return new NextResponse(header + body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="schedule-event-audit.csv"',
      },
    });
  }

  return NextResponse.json({ entries, count: entries.length });
}
