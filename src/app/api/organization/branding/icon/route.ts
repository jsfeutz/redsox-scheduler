import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isOrgAdmin } from "@/lib/auth-helpers";
import {
  processAndWriteBrandingIcons,
  removeBrandingIconFiles,
} from "@/lib/branding-storage";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/jpg",
  "image/pjpeg",
  "image/x-png",
]);

function looksLikeAllowedImage(file: Blob, fileName: string): boolean {
  const mime = (file.type || "").toLowerCase().trim();
  if (mime && ALLOWED_TYPES.has(mime)) return true;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp";
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { id: true, brandingIconVersion: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 5 MB)" },
      { status: 400 }
    );
  }
  const name = file instanceof File ? file.name : "upload";
  if (!looksLikeAllowedImage(file, name)) {
    return NextResponse.json(
      {
        error:
          "Use a PNG, JPEG, or WebP file. If the type looks correct, rename the file to end in .png, .jpg, or .webp.",
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await processAndWriteBrandingIcons(org.id, buffer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Processing failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    const updated = await prisma.organization.update({
      where: { id: org.id },
      data: { brandingIconVersion: org.brandingIconVersion + 1 },
      select: { brandingIconVersion: true },
    });
    return NextResponse.json({
      brandingIconVersion: updated.brandingIconVersion,
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P2022" || e.message.includes("brandingIconVersion"))
    ) {
      return NextResponse.json(
        {
          error:
            "Database is missing the branding column. Run: npx prisma migrate deploy",
        },
        { status: 503 }
      );
    }
    throw e;
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOrgAdmin(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await removeBrandingIconFiles(user.organizationId);
  try {
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { brandingIconVersion: 0 },
      select: { brandingIconVersion: true },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P2022" || e.message.includes("brandingIconVersion"))
    ) {
      return NextResponse.json(
        {
          error:
            "Database is missing the branding column. Run: npx prisma migrate deploy",
        },
        { status: 503 }
      );
    }
    throw e;
  }

  return NextResponse.json({ brandingIconVersion: 0 });
}
