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

  const { id: facilityId } = await params;

  const facility = await prisma.facility.findFirst({
    where: { id: facilityId, organizationId: user.organizationId },
  });
  if (!facility) {
    return NextResponse.json(
      { error: "Facility not found" },
      { status: 404 }
    );
  }

  const configs = await prisma.facilityJobConfig.findMany({
    where: { facilityId },
    include: {
      jobTemplate: { select: { id: true, name: true, description: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(configs);
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

  const { id: facilityId } = await params;

  const facility = await prisma.facility.findFirst({
    where: { id: facilityId, organizationId: user.organizationId },
  });
  if (!facility) {
    return NextResponse.json(
      { error: "Facility not found" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const { jobTemplateId, slotsNeeded } = body;

  if (!jobTemplateId) {
    return NextResponse.json(
      { error: "jobTemplateId is required" },
      { status: 400 }
    );
  }

  const jobTemplate = await prisma.jobTemplate.findFirst({
    where: { id: jobTemplateId, organizationId: user.organizationId },
  });
  if (!jobTemplate) {
    return NextResponse.json(
      { error: "Job template not found" },
      { status: 404 }
    );
  }

  const existing = await prisma.facilityJobConfig.findUnique({
    where: {
      facilityId_jobTemplateId: { facilityId, jobTemplateId },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Config already exists for this facility and template" },
      { status: 409 }
    );
  }

  const config = await prisma.facilityJobConfig.create({
    data: {
      facilityId,
      jobTemplateId,
      slotsNeeded: slotsNeeded ?? 1,
    },
    include: {
      jobTemplate: { select: { id: true, name: true, description: true } },
    },
  });

  return NextResponse.json(config, { status: 201 });
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

  const { id: facilityId } = await params;

  const body = await req.json();
  const { configId } = body;

  if (!configId) {
    return NextResponse.json(
      { error: "configId is required" },
      { status: 400 }
    );
  }

  const config = await prisma.facilityJobConfig.findFirst({
    where: {
      id: configId,
      facilityId,
      facility: { organizationId: user.organizationId },
    },
  });
  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  await prisma.facilityJobConfig.delete({ where: { id: configId } });

  return NextResponse.json({ success: true });
}
