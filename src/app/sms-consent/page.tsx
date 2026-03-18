import Link from "next/link";
import { MessageSquare, CheckCircle, XCircle, HelpCircle } from "lucide-react";

export const metadata = { title: "SMS Consent & Opt-In" };

export default function SmsConsentPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-primary mb-8 inline-block"
        >
          &larr; Back
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              SMS Text Message Consent
            </h1>
            <p className="text-sm text-muted-foreground">
              Rubicon Redsox Baseball Club
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 mb-8">
          <section>
            <h2 className="text-lg font-semibold mb-3">How You Opt In</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You may opt in to receive SMS text messages from Rubicon Redsox
              Scheduler by voluntarily providing your phone number in one of the
              following locations within the application:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Your Profile page</strong>{" "}
                  — after logging in, you can add your phone number and enable
                  SMS notifications in your account settings.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">
                    Volunteer job signup form
                  </strong>{" "}
                  — when signing up for a volunteer job on the public Help
                  Wanted board, you may optionally provide your phone number to
                  receive reminders.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">
                    Invite acceptance form
                  </strong>{" "}
                  — when creating your account from an invitation, you may
                  optionally provide your phone number.
                </span>
              </li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Providing your phone number is entirely voluntary. SMS
              notifications are not required to use the Service.
            </p>
          </section>

          <hr className="border-border" />

          <section>
            <h2 className="text-lg font-semibold mb-3">
              What Messages You Will Receive
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you opt in, you will receive transactional SMS messages
              including:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
              <li>Confirmation when you sign up for a volunteer job</li>
              <li>
                Reminders before your scheduled shift (e.g., 24 hours and 2
                hours before)
              </li>
              <li>
                Notifications if a schedule event you&apos;re involved with is
                changed or cancelled
              </li>
              <li>
                Cancellation notices if your signup is removed by an
                administrator
              </li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Message frequency varies based on your signup activity. Typical
              users receive 2-5 messages per week during the season. Message and
              data rates may apply depending on your mobile carrier plan.
            </p>
          </section>

          <hr className="border-border" />

          <section>
            <h2 className="text-lg font-semibold mb-3">How to Opt Out</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Reply STOP</strong> to any
                  SMS message you receive from us.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">
                    Disable SMS in your profile
                  </strong>{" "}
                  — log in, go to your Profile page, and toggle off SMS
                  notifications.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">
                    Remove your phone number
                  </strong>{" "}
                  — delete your phone number from your profile to stop all SMS.
                </span>
              </p>
            </div>
          </section>

          <hr className="border-border" />

          <section>
            <h2 className="text-lg font-semibold mb-3">Need Help?</h2>
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>
                Reply <strong className="text-foreground">HELP</strong> to any
                SMS message, or contact your organization administrator through
                the app for assistance.
              </span>
            </p>
          </section>
        </div>

        <div className="rounded-xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Program Name:</strong> Rubicon
            Redsox Scheduler Notifications
          </p>
          <p>
            <strong className="text-foreground">Message Types:</strong>{" "}
            Transactional (signup confirmations, reminders, schedule changes)
          </p>
          <p>
            <strong className="text-foreground">Frequency:</strong> Varies;
            typically 2-5 messages per week during season
          </p>
          <p>
            <strong className="text-foreground">Opt-out:</strong> Reply STOP at
            any time
          </p>
          <p>
            <strong className="text-foreground">Help:</strong> Reply HELP or
            contact administrator
          </p>
          <p>
            Message and data rates may apply. Carriers are not liable for
            delayed or undelivered messages.
          </p>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground flex gap-4">
          <Link href="/terms" className="hover:text-primary">
            Terms and Conditions
          </Link>
          <Link href="/privacy" className="hover:text-primary">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
