import Link from "next/link";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: March 15, 2026
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">
              1. Information We Collect
            </h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Account information:</strong> Name, email address, and
                password when you create an account via invitation.
              </li>
              <li>
                <strong>Phone number:</strong> If you voluntarily provide your
                phone number to receive SMS text message notifications.
              </li>
              <li>
                <strong>Volunteer activity:</strong> Job signups, hours
                completed, and schedule participation.
              </li>
              <li>
                <strong>Roster information:</strong> Player names, jersey
                numbers, and parent/volunteer contact details as entered by
                coaches or administrators.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              2. How We Use Your Information
            </h2>
            <p>Your information is used to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Manage team schedules and facility reservations</li>
              <li>Coordinate volunteer job signups and track participation</li>
              <li>
                Send transactional notifications (email and SMS) about your
                signups, schedule changes, and reminders
              </li>
              <li>Authenticate your identity when you log in</li>
            </ul>
            <p className="mt-2">
              We do not use your information for marketing purposes. We do not
              sell, rent, or share your personal information with third parties
              except as necessary to operate the Service (e.g., AWS for SMS
              delivery).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              3. SMS Text Messages
            </h2>
            <p>
              If you provide your phone number and opt in to SMS notifications,
              we will send transactional text messages related to your volunteer
              signups, schedule changes, and reminders. We use Amazon Web
              Services (AWS) Simple Notification Service (SNS) to deliver these
              messages. Your phone number is transmitted to AWS solely for the
              purpose of delivering the SMS.
            </p>
            <p className="mt-2">
              You may opt out of SMS notifications at any time by:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Replying STOP to any message</li>
              <li>Disabling SMS in your profile notification preferences</li>
              <li>Removing your phone number from your profile</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              4. Data Storage and Security
            </h2>
            <p>
              Your data is stored in a PostgreSQL database hosted on
              infrastructure managed by the organization. We use password
              hashing (bcrypt) to protect your credentials. Access to the
              Service is protected by session-based authentication.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              5. Data Retention
            </h2>
            <p>
              Your account data is retained for as long as your account is
              active. Notification logs are retained for operational and
              auditing purposes. You may request deletion of your account and
              associated data by contacting the organization administrator.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              6. Third-Party Services
            </h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>AWS SNS:</strong> For delivering SMS text messages
              </li>
              <li>
                <strong>Resend (SMTP):</strong> For delivering email
                notifications
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              7. Children&apos;s Privacy
            </h2>
            <p>
              The Service is intended for use by adults (parents, coaches, and
              administrators). Player roster information is entered by
              authorized coaches and administrators, not by minors directly.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will
              be posted on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              9. Contact
            </h2>
            <p>
              For questions about this Privacy Policy or to request data
              deletion, contact the organization administrator through the
              Service.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground flex gap-4">
          <Link href="/terms" className="hover:text-primary">
            Terms and Conditions
          </Link>
          <Link href="/sms-consent" className="hover:text-primary">
            SMS Consent
          </Link>
        </div>
      </div>
    </div>
  );
}
