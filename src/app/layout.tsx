import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/session-provider";
import { VolunteerIdentityProvider } from "@/components/providers/volunteer-identity";
import { OrgThemeProvider } from "@/components/providers/org-theme-provider";
import { ServiceWorkerRegister } from "@/components/providers/sw-register";
import { PwaInstallProvider } from "@/components/providers/pwa-install-provider";
import { BrandingProvider } from "@/components/branding/branding-context";
import { Toaster } from "@/components/ui/sonner";
import { prisma } from "@/lib/prisma";

export async function generateMetadata(): Promise<Metadata> {
  let brandingIconVersion = 0;
  let orgName = "Rubicon Redsox";
  try {
    const org = await prisma.organization.findFirst({
      select: { brandingIconVersion: true, name: true },
    });
    brandingIconVersion = org?.brandingIconVersion ?? 0;
    if (org?.name) orgName = org.name;
  } catch {
    // DB unavailable during build
  }

  const q =
    brandingIconVersion > 0 ? `?v=${brandingIconVersion}` : "";
  const icon192 =
    brandingIconVersion > 0
      ? `/api/branding/icons/192${q}`
      : "/icon-192.png";
  const icon512 =
    brandingIconVersion > 0
      ? `/api/branding/icons/512${q}`
      : "/icon-512.png";
  const apple =
    brandingIconVersion > 0
      ? `/api/branding/icons/180${q}`
      : "/apple-touch-icon.png";
  const fav32 =
    brandingIconVersion > 0
      ? `/api/branding/icons/32${q}`
      : "/icon-192.png";

  return {
    title: `${orgName} — Baseball Scheduling`,
    description: `Schedule fields, games, practices, and volunteers for ${orgName}`,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: orgName.split(/\s+/)[0] || "Scheduler",
    },
    icons: {
      icon: [
        { url: fav32, sizes: "32x32", type: "image/png" },
        { url: icon192, sizes: "192x192", type: "image/png" },
        { url: icon512, sizes: "512x512", type: "image/png" },
      ],
      apple,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialTheme = { primaryColor: "#dc2626", themeMode: "light" };
  let brandingIconVersion = 0;
  let organizationName = "Rubicon Redsox";
  try {
    const org = await prisma.organization.findFirst({
      select: {
        primaryColor: true,
        themeMode: true,
        brandingIconVersion: true,
        name: true,
      },
    });
    if (org) {
      initialTheme = { primaryColor: org.primaryColor, themeMode: org.themeMode };
      brandingIconVersion = org.brandingIconVersion;
      if (org.name) organizationName = org.name;
    }
  } catch {
    // DB unavailable during build — use defaults
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="antialiased">
        <OrgThemeProvider initialTheme={initialTheme}>
          <BrandingProvider
            iconVersion={brandingIconVersion}
            organizationName={organizationName}
          >
            <AuthSessionProvider>
              <VolunteerIdentityProvider>
                <PwaInstallProvider>
                  {children}
                  <Toaster richColors closeButton position="top-center" />
                  <ServiceWorkerRegister />
                </PwaInstallProvider>
              </VolunteerIdentityProvider>
            </AuthSessionProvider>
          </BrandingProvider>
        </OrgThemeProvider>
      </body>
    </html>
  );
}
