"use client";

import { orgInitials } from "@/lib/org-branding";
import { cn } from "@/lib/utils";
import { useBranding } from "./branding-context";

type BrandingMarkVariant =
  | "mobile"
  | "sidebar"
  | "auth"
  | "hero"
  | "schedule"
  | "invite";

/** Custom uploaded icon: plain image only (no ring / primary shadow). */
const customImgClass: Record<BrandingMarkVariant, string> = {
  mobile: "h-10 w-10 rounded-lg object-contain",
  sidebar: "h-14 w-14 rounded-xl object-contain",
  auth: "h-20 w-20 rounded-2xl object-contain",
  hero: "h-24 w-24 rounded-2xl object-contain",
  schedule: "h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-contain",
  invite: "h-16 w-16 rounded-2xl object-contain",
};

/** Fallback initials badge (keeps filled tile + shadow). */
const initialsStyles: Record<
  BrandingMarkVariant,
  { box: string; text: string }
> = {
  mobile: {
    box: "h-10 w-10 rounded-lg shadow-md shadow-primary/20",
    text: "text-[10px] font-black",
  },
  sidebar: {
    box: "h-14 w-14 rounded-xl shadow-lg shadow-primary/25",
    text: "text-sm font-black",
  },
  auth: {
    box: "h-20 w-20 rounded-2xl shadow-lg shadow-primary/30",
    text: "text-2xl font-black",
  },
  hero: {
    box: "h-24 w-24 rounded-2xl shadow-lg shadow-primary/30",
    text: "text-3xl font-black",
  },
  schedule: {
    box: "h-11 w-11 sm:h-12 sm:w-12 rounded-xl shadow-lg shadow-primary/25",
    text: "text-[11px] sm:text-xs font-black",
  },
  invite: {
    box: "h-16 w-16 rounded-2xl shadow-lg shadow-primary/25",
    text: "text-xl font-black",
  },
};

export function BrandingMark({
  variant,
  className,
}: {
  variant: BrandingMarkVariant;
  className?: string;
}) {
  const { iconVersion, organizationName } = useBranding();
  const q = iconVersion > 0 ? `?v=${iconVersion}` : "";
  const src = `/api/branding/icons/192${q}`;
  const initials = initialsStyles[variant];

  if (iconVersion > 0) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={192}
        height={192}
        className={cn("shrink-0", customImgClass[variant], className)}
        decoding="async"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg",
        initials.box,
        className
      )}
    >
      <span className={initials.text}>{orgInitials(organizationName)}</span>
    </div>
  );
}
