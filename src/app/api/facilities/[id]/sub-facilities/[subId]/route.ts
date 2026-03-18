import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageFacilities } from "@/lib/auth-helpers";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageFacilities(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, subId } = await params;

  const facility = await prisma.facility.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!facility) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  const existing = await prisma.subFacility.findFirst({
    where: { id: subId, facilityId: id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Sub-facility not found" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { name, type, capacity } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const subFacility = await prisma.subFacility.update({
    where: { id: subId },
    data: {
      name: name.trim(),
      type: type?.trim() || null,
      capacity: capacity != null ? parseInt(String(capacity), 10) : null,
    },
  });

  return NextResponse.json(subFacility);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageFacilities(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, subId } = await params;

  const facility = await prisma.facility.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!facility) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  const existing = await prisma.subFacility.findFirst({
    where: { id: subId, facilityId: id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Sub-facility not found" },
      { status: 404 }
    );
  }

  await prisma.subFacility.delete({ where: { id: subId } });

  return NextResponse.json({ success: true });
}
