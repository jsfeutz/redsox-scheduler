import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageTeam } from "@/lib/auth-helpers";
import {
  canManageOrgWideDocuments,
  documentsVisibleWhere,
  normalizeTagsInput,
  publicDocumentsWhere,
  searchWhere,
} from "@/lib/documents-access";
import { writeDocumentFile } from "@/lib/document-storage";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) {
    return NextResponse.json([]);
  }

  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const teamId = searchParams.get("teamId");
  const q = searchParams.get("q") || "";
  const publicOnly =
    searchParams.get("public") === "1" || searchParams.get("public") === "true";

  const base = publicOnly
    ? publicDocumentsWhere(org.id)
    : await documentsVisibleWhere(org.id, user);
  const filters: Prisma.DocumentWhereInput[] = [base];
  if (category) filters.push({ category });
  if (tag?.trim()) {
    filters.push({
      tags: { contains: tag.trim(), mode: "insensitive" },
    });
  }
  if (teamId) filters.push({ teamId });
  if (q.trim()) filters.push(searchWhere(q));

  const where: Prisma.DocumentWhereInput =
    filters.length === 1 ? filters[0]! : { AND: filters };

  const orderBy = [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }];
  const include = {
    team: { select: { id: true, name: true } },
    uploadedBy: { select: { id: true, name: true } },
  };

  const paginated =
    searchParams.has("page") || searchParams.has("pageSize");
  if (paginated) {
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSizeRaw = parseInt(searchParams.get("pageSize") || "20", 10) || 20;
    const pageSize = Math.min(50, Math.max(1, pageSizeRaw));
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include,
      }),
      prisma.document.count({ where }),
    ]);
    return NextResponse.json({ items, total, page, pageSize });
  }

  const docs = await prisma.document.findMany({
    where,
    orderBy,
    include,
  });

  return NextResponse.json(docs);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org || org.id !== user.organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const ct = req.headers.get("content-type") || "";
  let title: string;
  let description: string | null = null;
  let category: string | null = null;
  let tags = "";
  let visibility: "PUBLIC" | "MEMBERS_ONLY";
  let scope: "ORG_WIDE" | "TEAM";
  let teamId: string | null = null;
  let type: "FILE" | "LINK";
  let externalUrl: string | null = null;
  let file: File | null = null;

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    title = String(form.get("title") || "").trim();
    description = String(form.get("description") || "").trim() || null;
    category = String(form.get("category") || "").trim() || null;
    tags = normalizeTagsInput(String(form.get("tags") || ""));
    visibility =
      form.get("visibility") === "MEMBERS_ONLY" ? "MEMBERS_ONLY" : "PUBLIC";
    scope = form.get("scope") === "TEAM" ? "TEAM" : "ORG_WIDE";
    teamId = String(form.get("teamId") || "").trim() || null;
    type = form.get("type") === "LINK" ? "LINK" : "FILE";
    externalUrl = String(form.get("externalUrl") || "").trim() || null;
    const f = form.get("file");
    file = f instanceof File && f.size > 0 ? f : null;
  } else {
    const body = (await req.json()) as Record<string, unknown>;
    title = String(body.title || "").trim();
    description = body.description ? String(body.description).trim() : null;
    category = body.category ? String(body.category).trim() : null;
    tags = normalizeTagsInput(
      body.tags != null ? String(body.tags) : undefined
    );
    visibility =
      body.visibility === "MEMBERS_ONLY" ? "MEMBERS_ONLY" : "PUBLIC";
    scope = body.scope === "TEAM" ? "TEAM" : "ORG_WIDE";
    teamId = body.teamId ? String(body.teamId).trim() : null;
    type = body.type === "LINK" ? "LINK" : "FILE";
    externalUrl = body.externalUrl ? String(body.externalUrl).trim() : null;
  }

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (scope === "TEAM") {
    if (!teamId) {
      return NextResponse.json(
        { error: "teamId is required for team documents" },
        { status: 400 }
      );
    }
    const ok =
      canManageOrgWideDocuments(user.role as UserRole) ||
      (await canManageTeam(user, teamId));
    if (!ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const team = await prisma.team.findFirst({
      where: { id: teamId, organizationId: org.id },
      select: { id: true },
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
  } else {
    if (!canManageOrgWideDocuments(user.role as UserRole)) {
      return NextResponse.json(
        { error: "Only admins and schedule managers can add organization-wide documents" },
        { status: 403 }
      );
    }
    teamId = null;
  }

  if (type === "LINK") {
    if (!externalUrl || !isValidHttpUrl(externalUrl)) {
      return NextResponse.json(
        { error: "Valid https URL is required for link documents" },
        { status: 400 }
      );
    }
    const doc = await prisma.document.create({
      data: {
        title,
        description,
        category,
        tags,
        type: "LINK",
        externalUrl,
        visibility,
        scope,
        teamId,
        organizationId: org.id,
        uploadedById: user.id,
      },
      include: {
        team: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(doc, { status: 201 });
  }

  if (!file) {
    return NextResponse.json(
      { error: "File is required for file documents" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";

  const draft = await prisma.document.create({
    data: {
      title,
      description,
      category,
      tags,
      type: "FILE",
      visibility,
      scope,
      teamId,
      organizationId: org.id,
      uploadedById: user.id,
      fileName: file.name,
      mimeType,
      fileSizeBytes: buf.length,
    },
  });

  try {
    const { storageKey, fileName, fileSizeBytes } = await writeDocumentFile(
      org.id,
      draft.id,
      file.name,
      buf,
      mimeType
    );
    const doc = await prisma.document.update({
      where: { id: draft.id },
      data: { storageKey, fileName, fileSizeBytes, mimeType },
      include: {
        team: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    await prisma.document.delete({ where: { id: draft.id } }).catch(() => {});
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
