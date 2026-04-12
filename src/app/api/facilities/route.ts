import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageFacilities } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const facilities = await prisma.facility.findMany({
    where: { organizationId: user.organizationId },
    include: {
      subFacilities: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(facilities);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageFacilities(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, address, googleMapsUrl, notes, color } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const facility = await prisma.facility.create({
    data: {
      name: name.trim(),
      color: typeof color === "string" && color.trim() ? color.trim() : "#64748b",
      address: address?.trim() || null,
      googleMapsUrl: googleMapsUrl?.trim() || null,
      notes: notes?.trim() || null,
      organizationId: user.organizationId,
    },
    include: { subFacilities: true },
  });

  return NextResponse.json(facility, { status: 201 });
}
