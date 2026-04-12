"use client";

import { CardTitle } from "@/components/ui/card";
import { BrandingMark } from "./branding-mark";
import { useBranding } from "./branding-context";

/** Centered logo for login / password / invite cards (auth variant). */
export function AuthBrandingMark() {
  return (
    <div className="mx-auto mb-5 flex justify-center">
      <BrandingMark variant="auth" />
    </div>
  );
}

export function AuthOrgTitle({ className }: { className?: string }) {
  const { organizationName } = useBranding();
  return <CardTitle className={className}>{organizationName}</CardTitle>;
}
