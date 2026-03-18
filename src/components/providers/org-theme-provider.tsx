"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";

function hexToOklchParts(hex: string): { L: number; C: number; H: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bVal * bVal);
  let H = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { L, C, H };
}

const ok = (l: number, c: number, h: number) =>
  `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;

function generateAllVars(hex: string, isDark: boolean): Record<string, string> {
  const { C, H } = hexToOklchParts(hex);

  if (isDark) {
    return {
      "--primary": ok(0.6, Math.min(C, 0.22), H),
      "--primary-foreground": ok(0.98, 0.005, 0),
      "--ring": ok(0.6, Math.min(C, 0.22), H),
      "--accent": ok(0.22, C * 0.05, H),
      "--accent-foreground": ok(0.8, C * 0.6, H),
      "--destructive": ok(0.65, 0.22, 25),
      "--chart-1": ok(0.65, Math.min(C, 0.22), H),
      "--chart-2": ok(0.7, 0.16, (H + 135) % 360),
      "--chart-3": ok(0.6, 0.18, (H + 225) % 360),
      "--chart-4": ok(0.75, 0.14, (H + 45) % 360),
      "--chart-5": ok(0.65, 0.2, (H + 285) % 360),
      "--sidebar-primary": ok(0.6, Math.min(C, 0.22), H),
      "--sidebar-primary-foreground": ok(0.98, 0.005, 0),
      "--sidebar-accent": ok(0.2, C * 0.04, H),
      "--sidebar-accent-foreground": ok(0.75, C * 0.5, H),
      "--sidebar-ring": ok(0.6, Math.min(C, 0.22), H),
    };
  }

  return {
    "--primary": ok(0.52, Math.min(C, 0.21), H),
    "--primary-foreground": ok(0.98, 0.005, 0),
    "--ring": ok(0.52, Math.min(C, 0.21), H),
    "--accent": ok(0.96, C * 0.07, H),
    "--accent-foreground": ok(0.45, C * 0.85, H),
    "--destructive": ok(0.577, 0.245, 27.325),
    "--chart-1": ok(0.52, Math.min(C, 0.21), H),
    "--chart-2": ok(0.65, 0.16, (H + 135) % 360),
    "--chart-3": ok(0.55, 0.18, (H + 225) % 360),
    "--chart-4": ok(0.7, 0.14, (H + 45) % 360),
    "--chart-5": ok(0.6, 0.2, (H + 285) % 360),
    "--sidebar-primary": ok(0.52, Math.min(C, 0.21), H),
    "--sidebar-primary-foreground": ok(0.98, 0.005, 0),
    "--sidebar-accent": ok(0.96, C * 0.07, H),
    "--sidebar-accent-foreground": ok(0.45, C * 0.85, H),
    "--sidebar-ring": ok(0.52, Math.min(C, 0.21), H),
  };
}

function applyVars(hex: string) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  const vars = generateAllVars(hex, isDark);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

interface OrgTheme {
  primaryColor: string;
  themeMode: string;
}

function ThemeEnforcer({ orgMode, primaryColor }: { orgMode: string; primaryColor: string }) {
  const { setTheme, resolvedTheme } = useTheme();

  const applyColors = useCallback(() => applyVars(primaryColor), [primaryColor]);

  useEffect(() => {
    if (orgMode !== "system") {
      localStorage.removeItem("theme");
      setTheme(orgMode);
    }
  }, [orgMode, setTheme]);

  useEffect(() => {
    applyColors();

    const observer = new MutationObserver(() => applyColors());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [applyColors, resolvedTheme]);

  return null;
}

export function OrgThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme?: OrgTheme;
}) {
  const [theme, setTheme] = useState<OrgTheme>(
    initialTheme ?? { primaryColor: "#dc2626", themeMode: "light" }
  );

  useEffect(() => {
    if (!initialTheme) {
      fetch("/api/organization/theme")
        .then((r) => r.json())
        .then((data) => setTheme(data))
        .catch(() => {});
    }
  }, [initialTheme]);

  const isSystem = theme.themeMode === "system";

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={theme.themeMode}
      forcedTheme={isSystem ? undefined : theme.themeMode}
      enableSystem={isSystem}
      disableTransitionOnChange
      storageKey="theme"
    >
      <ThemeEnforcer orgMode={theme.themeMode} primaryColor={theme.primaryColor} />
      {children}
    </ThemeProvider>
  );
}
