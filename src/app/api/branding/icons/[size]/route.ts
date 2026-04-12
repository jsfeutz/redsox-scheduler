import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import {
  BRANDING_ICON_SIZES,
  type BrandingIconSize,
  readBrandingIcon,
} from "@/lib/branding-storage";

const DEFAULT_BY_SIZE: Record<BrandingIconSize, string> = {
  32: "/icon-192.png",
  180: "/apple-touch-icon.png",
  192: "/icon-192.png",
  512: "/icon-512.png",
};

function parseSize(raw: string): BrandingIconSize | null {
  const n = Number.parseInt(raw, 10);
  return BRANDING_ICON_SIZES.includes(n as BrandingIconSize)
    ? (n as BrandingIconSize)
    : null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ size: string }> }
) {
  const { size: raw } = await ctx.params;
  const size = parseSize(raw);
  if (!size) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }

  const url = new URL(req.url);
  const org = await prisma.organization.findFirst({
    select: { id: true, brandingIconVersion: true },
  });

  if (!org || org.brandingIconVersion <= 0) {
    return NextResponse.redirect(new URL(DEFAULT_BY_SIZE[size], url.origin));
  }

  const buf = await readBrandingIcon(org.id, size);
  if (!buf) {
    return NextResponse.redirect(new URL(DEFAULT_BY_SIZE[size], url.origin));
  }

  const v = url.searchParams.get("v") || String(org.brandingIconVersion);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${v}-${size}"`,
    },
  });
}
