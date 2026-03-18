import Link from "next/link";

export const metadata = { title: "Terms and Conditions" };

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-primary mb-8 inline-block"
        >
          &larr; Back
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Terms and Conditions
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: March 15, 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the Rubicon Redsox Scheduler application
              (&quot;Service&quot;), you agree to be bound by these Terms and
              Conditions. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. Description of Service
            </h2>
            <p>
              The Service is a scheduling and volunteer coordination platform
              operated by Rubicon Redsox Baseball Club for managing team
              schedules, facility reservations, volunteer job signups, and
              related communications including SMS text message notifications.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. User Accounts
            </h2>
            <p>
              Accounts are created by invitation from an organization
              administrator. You are responsible for maintaining the
              confidentiality of your login credentials. You agree to provide
              accurate and current information, including your email address and
              phone number if you opt in to SMS notifications.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. SMS Text Messaging
            </h2>
            <p>
              By providing your phone number and opting in, you consent to
              receive transactional SMS text messages related to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Volunteer job signup confirmations</li>
              <li>Job reminders (e.g., 24 hours and 2 hours before your shift)</li>
              <li>Schedule changes affecting events you are involved with</li>
              <li>Signup cancellation notices</li>
            </ul>
            <p className="mt-2">
              Message frequency varies based on your activity. Message and data
              rates may apply. You can opt out at any time by updating your
              notification preferences in your profile or by replying STOP to
              any message. For help, reply HELP or contact the organization
              administrator.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Acceptable Use
            </h2>
            <p>
              You agree not to misuse the Service, including but not limited to:
              signing up for jobs you do not intend to fulfill, providing false
              information, or attempting to disrupt the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Limitation of Liability
            </h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of
              any kind. Rubicon Redsox Baseball Club shall not be liable for any
              indirect, incidental, or consequential damages arising from your
              use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Modifications
            </h2>
            <p>
              We reserve the right to modify these terms at any time. Continued
              use of the Service after changes constitutes acceptance of the
              updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Contact
            </h2>
            <p>
              For questions about these terms, contact the organization
              administrator through the Service.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground flex gap-4">
          <Link href="/privacy" className="hover:text-primary">
            Privacy Policy
          </Link>
          <Link href="/sms-consent" className="hover:text-primary">
            SMS Consent
          </Link>
        </div>
      </div>
    </div>
  );
}
