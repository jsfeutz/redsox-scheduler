import Link from "next/link";
import { MessageSquare, CheckCircle, XCircle, HelpCircle } from "lucide-react";

export const metadata = { title: "SMS Consent & Opt-In — Rubicon Redsox" };

export default function SmsConsentPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="text-base text-muted-foreground hover:text-primary mb-8 inline-block"
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
            <p className="text-base text-muted-foreground">
              Rubicon Redsox Baseball Club
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 mb-8">
          <section>
            <h2 className="text-lg font-semibold mb-3">How You Opt In</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              You may opt in to receive SMS text messages from Rubicon Redsox
              Baseball Club by voluntarily providing your mobile phone number
              in one of the following locations on our website
              (schedule.rubiconredsox.com):
            </p>
            <ul className="mt-3 space-y-2 text-base text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Volunteer Sign-Up Form</strong>{" "}
                  — when you sign up for a volunteer job on our public Help
                  Wanted board at schedule.rubiconredsox.com/help-wanted, you may
                  optionally enter your phone number. By entering your phone number,
                  you expressly consent to receive SMS text messages from us.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Account Profile</strong>{" "}
                  — registered users can add a phone number and enable SMS
                  notifications in their account profile settings. Toggling on
                  &quot;Enable SMS Notifications&quot; constitutes your express consent.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Invitation Acceptance</strong>{" "}
                  — when creating your account via an invitation link, you may
                  optionally enter a phone number. By providing it, you consent
                  to receive SMS notifications.
                </span>
              </li>
            </ul>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              Providing your phone number is entirely voluntary. SMS
              notifications are not required to use the Rubicon Redsox Scheduler.
              By entering your phone number in any of the above forms, you
              expressly agree to receive transactional SMS text messages at
              the number provided.
            </p>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              On the public Help Wanted volunteer form, if you enter a mobile number you must also
              check a separate consent checkbox that restates message types, typical frequency
              (2–5 SMS per week during season), that message and data rates may apply, and that you
              can reply STOP to opt out—before the signup can be submitted.
            </p>
            <p className="mt-3 text-base">
              <Link href="/business-verification" className="text-primary font-medium hover:underline">
                Business &amp; SMS program verification page
              </Link>
              {" "}
              (public, no login) lists organization details for carriers and regulators.
            </p>
          </section>

          <hr className="border-border" />

          <section>
            <h2 className="text-lg font-semibold mb-3">
              What Messages You Will Receive
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              If you opt in, you will receive <strong className="text-foreground">transactional SMS text messages</strong>{" "}
              related to your volunteer activity and schedule, including:
            </p>
            <ul className="mt-3 space-y-1.5 text-base text-muted-foreground list-disc pl-5">
              <li><strong className="text-foreground">Signup confirmations</strong> — confirmation when you sign up for a volunteer job</li>
              <li><strong className="text-foreground">Shift reminders</strong> — reminders before your scheduled shift (e.g., 24 hours and 2 hours before)</li>
              <li><strong className="text-foreground">Schedule changes</strong> — notifications if an event you&apos;re involved with is changed or cancelled</li>
              <li><strong className="text-foreground">Cancellation notices</strong> — if your signup is removed by an administrator</li>
            </ul>
            <p className="mt-3 text-base text-muted-foreground font-medium">
              Message frequency varies based on your signup activity. Typical
              users receive <strong className="text-foreground">2-5 messages per week</strong> during the baseball season.
              Message and data rates may apply depending on your mobile carrier plan.
            </p>
          </section>

          <hr className="border-border" />

          <section>
            <h2 className="text-lg font-semibold mb-3">How to Opt Out</h2>
            <p className="text-base text-muted-foreground mb-3 leading-relaxed">
              You can stop receiving SMS messages at any time using any of
              these methods:
            </p>
            <div className="space-y-2 text-base text-muted-foreground">
              <p className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">Reply STOP</strong> — text
                  STOP to any SMS message you receive from us. You will receive
                  a confirmation that you have been unsubscribed.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">
                    Disable in your profile
                  </strong>{" "}
                  — log in to schedule.rubiconredsox.com, go to your Profile
                  page, and toggle off &quot;Enable SMS Notifications.&quot;
                </span>
              </p>
              <p className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span>
                  <strong className="text-foreground">
                    Remove your phone number
                  </strong>{" "}
                  — delete your phone number from your profile settings.
                </span>
              </p>
            </div>
          </section>

          <hr className="border-border" />

          <section>
            <h2 className="text-lg font-semibold mb-3">Need Help?</h2>
            <p className="text-base text-muted-foreground flex items-start gap-2">
              <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>
                Text <strong className="text-foreground">HELP</strong> in reply to
                any SMS message for assistance, or contact the organization
                administrator through the app.
              </span>
            </p>
          </section>
        </div>

        <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Program Name:</strong> Rubicon
            Redsox Notification
          </p>
          <p>
            <strong className="text-foreground">Organization:</strong> Rubicon
            Redsox Baseball Club, Rubicon, WI
          </p>
          <p>
            <strong className="text-foreground">Message Types:</strong>{" "}
            Transactional — signup confirmations, shift reminders, schedule
            changes, cancellation notices
          </p>
          <p>
            <strong className="text-foreground">Frequency:</strong> Varies;
            typically 2-5 messages per week during baseball season
          </p>
          <p>
            <strong className="text-foreground">Opt-in:</strong> By providing
            your phone number on our volunteer sign-up form, account profile, or
            invitation acceptance form
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
            delayed or undelivered messages. Consent is not a condition of
            purchase or use of the Service.
          </p>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-sm text-muted-foreground flex gap-4">
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
