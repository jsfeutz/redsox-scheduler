import Link from "next/link";
import type { Metadata } from "next";
import { Building2, ExternalLink, Mail, MapPin, Phone, Shield } from "lucide-react";
import { publicOrgVerification } from "@/config/public-org-verification";

export const metadata: Metadata = {
  title: "Business & SMS program verification — Rubicon Redsox",
  description:
    "Public business information and SMS opt-in program details for carriers and regulators. No login required.",
};

function isConfigured(): boolean {
  const c = publicOrgVerification;
  return Boolean(
    c.mailingAddressLine1 &&
      c.mailingZip &&
      c.supportEmail &&
      c.supportPhoneE164 &&
      c.authorizedContactFirstName &&
      c.authorizedContactLastName
  );
}

export default function BusinessVerificationPage() {
  const c = publicOrgVerification;
  const ok = isConfigured();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-primary mb-6 inline-block"
        >
          &larr; Home
        </Link>

        <div className="flex items-start gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Business &amp; SMS program verification
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Public page for wireless carriers and AWS toll-free registration review.{" "}
              <strong className="text-foreground">No password or login</strong> is required
              to view this information.
            </p>
          </div>
        </div>

        {!ok && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100 mb-8">
            <strong>Club administrators:</strong> complete mailing address, support contact,
            and authorized contact in{" "}
            <code className="rounded bg-background/80 px-1 py-0.5 text-xs">
              src/config/public-org-verification.ts
            </code>{" "}
            so this page matches your AWS registration exactly.
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-8">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Organization
            </div>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Legal name</dt>
                <dd className="font-medium">{c.legalName}</dd>
              </div>
              {c.doingBusinessAs ? (
                <div>
                  <dt className="text-muted-foreground">Trade name / program (DBA)</dt>
                  <dd className="font-medium">{c.doingBusinessAs}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">Organization type</dt>
                <dd className="font-medium">
                  {c.businessTypeAws === "SOLE_PROPRIETOR"
                    ? "Sole proprietor (individual), Wisconsin — Rubicon Redsox Baseball Club youth baseball program (public schedule and volunteer signup on this website)."
                    : c.businessTypeAws === "NON_PROFIT"
                      ? "Non-profit — operating the Rubicon Redsox Baseball Club youth baseball program (Wisconsin)"
                      : c.businessTypeAws === "PRIVATE_PROFIT"
                        ? "Private for-profit (LLC) — operating the Rubicon Redsox Baseball Club youth baseball program (Wisconsin)"
                        : `${c.businessTypeAws.replace(/_/g, " ").toLowerCase()} — operating the Rubicon Redsox Baseball Club youth baseball program (Wisconsin)`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Public website</dt>
                <dd>
                  <a
                    href={c.websiteUrl}
                    className="text-primary font-medium inline-flex items-center gap-1 hover:underline"
                  >
                    {c.websiteUrl}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </dd>
              </div>
              {c.taxId ? (
                <div>
                  <dt className="text-muted-foreground">US EIN (IRS)</dt>
                  <dd className="font-medium">{c.taxId}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <hr className="border-border" />

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Mailing address
            </div>
            <address className="text-sm not-italic leading-relaxed">
              {c.mailingAddressLine1 ? (
                <>
                  {c.legalName}
                  <br />
                  {c.mailingAddressLine1}
                  {c.mailingAddressLine2 ? (
                    <>
                      <br />
                      {c.mailingAddressLine2}
                    </>
                  ) : null}
                  <br />
                  {c.mailingCity}, {c.mailingState} {c.mailingZip}
                  <br />
                  {c.isoCountryCode}
                </>
              ) : (
                <span className="text-muted-foreground">
                  Mailing address is published here once configured by the organization
                  (see notice above).
                </span>
              )}
            </address>
          </section>

          <hr className="border-border" />

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Mail className="h-4 w-4" />
              Authorized contact &amp; support
            </div>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Authorized contact</dt>
                <dd className="font-medium">
                  {c.authorizedContactFirstName && c.authorizedContactLastName
                    ? `${c.authorizedContactFirstName} ${c.authorizedContactLastName}`
                    : "— configure in public-org-verification.ts —"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">SMS / program support email</dt>
                <dd>
                  {c.supportEmail ? (
                    <a href={`mailto:${c.supportEmail}`} className="text-primary hover:underline font-medium">
                      {c.supportEmail}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">— configure —</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  Support phone
                </dt>
                <dd className="font-medium">
                  {c.supportPhoneE164 || (
                    <span className="text-muted-foreground font-normal">— configure —</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <hr className="border-border" />

          <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-base font-semibold text-foreground">SMS opt-in (public)</h2>
            <p>
              Volunteers may opt in on the{" "}
              <Link href="/help-wanted" className="text-primary font-medium hover:underline">
                Help Wanted
              </Link>{" "}
              page (<strong className="text-foreground">no account required</strong>). If they
              enter a mobile number, they must check an explicit consent checkbox before signup
              is submitted. The same site hosts the full{" "}
              <Link href="/sms-consent" className="text-primary font-medium hover:underline">
                SMS consent &amp; program description
              </Link>
              .
            </p>
            <p>
              The public home page lists the club name, location (Rubicon, WI), and links to the
              schedule, volunteer signup, and policies:{" "}
              <Link href="/" className="text-primary font-medium hover:underline">
                schedule.rubiconredsox.com
              </Link>
              .
            </p>
          </section>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-primary">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-primary">
            Privacy
          </Link>
          {" · "}
          <Link href="/sms-consent" className="hover:text-primary">
            SMS consent
          </Link>
        </p>
      </div>
    </div>
  );
}
