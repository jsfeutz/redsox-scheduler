import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/session-provider";
import { VolunteerIdentityProvider } from "@/components/providers/volunteer-identity";
import { OrgThemeProvider } from "@/components/providers/org-theme-provider";
import { ServiceWorkerRegister } from "@/components/providers/sw-register";
import { Toaster } from "@/components/ui/sonner";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Rubicon Redsox - Baseball Scheduling",
  description:
    "Schedule fields, games, practices, and volunteers for the Rubicon Redsox",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Redsox",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialTheme = { primaryColor: "#dc2626", themeMode: "light" };
  try {
    const org = await prisma.organization.findFirst({
      select: { primaryColor: true, themeMode: true },
    });
    if (org) initialTheme = org;
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
          <AuthSessionProvider>
            <VolunteerIdentityProvider>
              {children}
              <Toaster richColors closeButton position="top-center" />
              <ServiceWorkerRegister />
            </VolunteerIdentityProvider>
          </AuthSessionProvider>
        </OrgThemeProvider>
      </body>
    </html>
  );
}
