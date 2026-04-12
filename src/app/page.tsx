import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { BrandingMark } from "@/components/branding/branding-mark";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  let orgName = "Rubicon Redsox";
  try {
    const org = await prisma.organization.findFirst({ select: { name: true } });
    if (org?.name) orgName = org.name;
  } catch {
    /* use default */
  }
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-lg text-center space-y-8">
          <div className="mx-auto">
            <BrandingMark variant="hero" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              {orgName}
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Baseball scheduling &amp; volunteer management for the{" "}
              {orgName} Baseball Club
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 sm:p-8 text-left space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">About Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Rubicon Redsox Baseball Club is a youth baseball organization based in Rubicon, Wisconsin.
              We provide scheduling, game management, and volunteer coordination for our teams and families.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-medium">Organization</p>
                <p className="text-muted-foreground">Rubicon Redsox Baseball Club</p>
              </div>
              <div>
                <p className="font-medium">Location</p>
                <p className="text-muted-foreground">Rubicon, WI</p>
              </div>
              <div>
                <p className="font-medium">Website</p>
                <p className="text-muted-foreground">schedule.rubiconredsox.com</p>
              </div>
              <div>
                <p className="font-medium">Contact</p>
                <p className="text-muted-foreground">noreply@rubiconredsox.com</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
            >
              Sign In
            </Link>
            <Link
              href="/help-wanted"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl border border-border bg-card font-medium text-base hover:bg-accent transition-all active:scale-[0.98]"
            >
              Volunteer Sign Up
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/schedule" className="hover:text-primary transition-colors">Facility schedule</Link>
            <span className="text-border">·</span>
            <Link href="/help-wanted" className="hover:text-primary transition-colors">Help Wanted</Link>
            <span className="text-border">·</span>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <span className="text-border">·</span>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <span className="text-border">·</span>
            <Link href="/sms-consent" className="hover:text-primary transition-colors">SMS Consent</Link>
            <span className="text-border">·</span>
            <Link href="/business-verification" className="hover:text-primary transition-colors">Business verification</Link>
          </div>
        </div>
      </div>
      <div className="relative z-10 py-6">
        <PublicFooter />
      </div>
    </div>
  );
}
