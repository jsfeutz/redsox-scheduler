"use client";

import { createContext, useContext, type ReactNode } from "react";

export type BrandingContextValue = {
  iconVersion: number;
  organizationName: string;
};

const BrandingContext = createContext<BrandingContextValue>({
  iconVersion: 0,
  organizationName: "Organization",
});

export function BrandingProvider({
  children,
  iconVersion,
  organizationName,
}: BrandingContextValue & { children: ReactNode }) {
  return (
    <BrandingContext.Provider value={{ iconVersion, organizationName }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
