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
    include: {
      subFacilities: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!facility) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  return NextResponse.json(facility);
}

export async function PUT(
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

  const existing = await prisma.facility.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  const body = await req.json();
  const { name, address, googleMapsUrl, notes, color } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const facility = await prisma.facility.update({
    where: { id },
    data: {
      name: name.trim(),
      ...(typeof color === "string" && color.trim() ? { color: color.trim() } : {}),
      address: address?.trim() || null,
      googleMapsUrl: googleMapsUrl?.trim() || null,
      notes: notes?.trim() || null,
    },
    include: { subFacilities: true },
  });

  return NextResponse.json(facility);
}

export async function DELETE(
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

  const existing = await prisma.facility.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Facility not found" }, { status: 404 });
  }

  await prisma.facility.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
