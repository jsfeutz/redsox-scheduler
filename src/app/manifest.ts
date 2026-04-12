import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let v = 0;
  let name = "Rubicon Redsox Scheduler";
  let shortName = "Redsox";

  try {
    const org = await prisma.organization.findFirst({
      select: { brandingIconVersion: true, name: true },
    });
    v = org?.brandingIconVersion ?? 0;
    if (org?.name) {
      name = `${org.name} Scheduler`;
      shortName =
        org.name.length > 12 ? `${org.name.slice(0, 11)}…` : org.name;
    }
  } catch {
    // No DB during some builds or local tooling
  }

  const iconSrc = (size: 192 | 512) =>
    v > 0
      ? `/api/branding/icons/${size}?v=${v}`
      : size === 192
        ? "/icon-192.png"
        : "/icon-512.png";

  return {
    name,
    short_name: shortName,
    description:
      "Baseball scheduling and volunteer management for youth baseball",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f1117",
    theme_color: "#dc2626",
    orientation: "portrait-primary",
    icons: [
      {
        src: iconSrc(192),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: iconSrc(512),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
