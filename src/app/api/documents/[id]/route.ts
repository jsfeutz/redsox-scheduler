import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageTeam } from "@/lib/auth-helpers";
import {
  canManageOrgWideDocuments,
  findDocumentVisible,
  normalizeTagsInput,
} from "@/lib/documents-access";
import { readDocumentFile, removeDocumentFile } from "@/lib/document-storage";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function canMutateDoc(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  doc: { scope: string; teamId: string | null }
): Promise<boolean> {
  if (canManageOrgWideDocuments(user.role as UserRole)) return true;
  if (doc.scope === "TEAM" && doc.teamId) {
    return canManageTeam(user, doc.teamId);
  }
  return false;
}

export async function GET(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const download = searchParams.get("download") === "1";

  const doc = await findDocumentVisible(id, user);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!download) {
    return NextResponse.json(doc);
  }

  if (doc.type === "LINK") {
    return NextResponse.redirect(doc.externalUrl!, 302);
  }

  if (!doc.storageKey) {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  const data = await readDocumentFile(doc.storageKey);
  if (!data) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const name = doc.fileName || "download";
  return new NextResponse(new Uint8Array(data.buffer), {
    headers: {
      "Content-Type": doc.mimeType || data.mimeType,
      "Content-Disposition": `attachment; filename="${name.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function PUT(req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.document.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await canMutateDoc(user, existing))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const title =
    body.title != null ? String(body.title).trim() : existing.title;
  const description =
    body.description !== undefined
      ? String(body.description || "").trim() || null
      : existing.description;
  const category =
    body.category !== undefined
      ? String(body.category || "").trim() || null
      : existing.category;
  const tags =
    body.tags !== undefined
      ? normalizeTagsInput(String(body.tags))
      : existing.tags;
  const visibility =
    body.visibility === "PUBLIC" || body.visibility === "MEMBERS_ONLY"
      ? body.visibility
      : existing.visibility;
  const sortOrder =
    typeof body.sortOrder === "number"
      ? Math.floor(body.sortOrder)
      : existing.sortOrder;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      title,
      description,
      category,
      tags,
      visibility,
      sortOrder,
    },
    include: {
      team: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.document.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await canMutateDoc(user, existing))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.storageKey) {
    await removeDocumentFile(existing.storageKey);
  }
  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
