import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageFacilities } from "@/lib/auth-helpers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const facility = await prisma.facility.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!facility) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  const subFacilities = await prisma.subFacility.findMany({
    where: { facilityId: id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(subFacilities);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageFacilities(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const facility = await prisma.facility.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!facility) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, type, capacity } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const subFacility = await prisma.subFacility.create({
    data: {
      name: name.trim(),
      type: type?.trim() || null,
      capacity: capacity ? parseInt(capacity, 10) : null,
      facilityId: id,
    },
  });

  return NextResponse.json(subFacility, { status: 201 });
}
