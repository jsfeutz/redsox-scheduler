"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { COMFORT_LEVEL_OPTIONS } from "@/lib/comfort-level";
import { useVolunteerIdentity } from "@/components/providers/volunteer-identity";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface PublicJobSignupProps {
  jobId: string;
  jobName: string;
  jobDescription?: string | null;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  autoOpen?: boolean;
  /** When true (from job template), show comfort level on the signup form */
  askComfortLevel?: boolean;
  onSuccess: (name?: string) => void;
}

export function PublicJobSignup({
  jobId,
  jobName,
  jobDescription = null,
  eventTitle,
  eventDate,
  eventTime,
  autoOpen = false,
  askComfortLevel = false,
  onSuccess,
}: PublicJobSignupProps) {
  const { identity, setIdentity } = useVolunteerIdentity();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [didAutoOpen, setDidAutoOpen] = useState(false);

  useEffect(() => {
    if (autoOpen && !didAutoOpen) {
      setOpen(true);
      setDidAutoOpen(true);
    }
  }, [autoOpen, didAutoOpen]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  /** Required when phone is provided (AWS / carrier opt-in alignment). */
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [comfortLevel, setComfortLevel] = useState("");
  const [reminderHours, setReminderHours] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneProvided = phoneDigits.length >= 10;

  useEffect(() => {
    if (identity) {
      if (!name) setName(identity.name);
      if (!email) setEmail(identity.email);
    }
  }, [identity]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (askComfortLevel && !comfortLevel) {
      toast.error("Please select your comfort level");
      return;
    }
    if (phoneProvided && !smsOptIn) {
      toast.error("Check the SMS consent box to sign up with a phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/jobs/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameJobId: jobId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          playerName: playerName.trim() || undefined,
          ...(askComfortLevel && comfortLevel ? { comfortLevel } : {}),
          ...(reminderHours ? { reminderHoursBefore: parseInt(reminderHours, 10) } : {}),
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign up");
      }

      if (data.verificationToken) {
        setIdentity({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          token: data.verificationToken,
        });
      }

      setSuccess(true);
      setOpen(false);
      toast.success("You're signed up! Thank you for helping out.");
      onSuccess(name.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-500">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Signed up!</span>
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="grid gap-3 px-1">
      <div className="grid gap-1.5">
        <Label htmlFor={`job-name-${jobId}`} className="text-base font-medium">
          Your Name
        </Label>
        <Input
          id={`job-name-${jobId}`}
          placeholder="Jane Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-11 rounded-xl text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`job-email-${jobId}`} className="text-base font-medium">
          Email
        </Label>
        <Input
          id={`job-email-${jobId}`}
          type="email"
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 rounded-xl text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`job-phone-${jobId}`} className="text-base font-medium">
          Phone <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={`job-phone-${jobId}`}
          type="tel"
          placeholder="(920) 555-1234"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (e.target.value.replace(/\D/g, "").length < 10) setSmsOptIn(false);
          }}
          className="h-11 rounded-xl text-base"
        />
        {phoneProvided && (
          <label className="flex items-start gap-2.5 cursor-pointer text-sm leading-relaxed rounded-xl border border-border/80 bg-muted/30 p-3">
            <input
              type="checkbox"
              checked={smsOptIn}
              onChange={(e) => setSmsOptIn(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-primary"
            />
            <span>
              <strong className="text-foreground">I agree to receive SMS text messages</strong> from
              Rubicon Redsox at this mobile number for <strong className="text-foreground">volunteer
              notifications only</strong> (signup confirmations, shift reminders, schedule changes, and
              cancellations). Message frequency is typically <strong className="text-foreground">2–5
              messages per week</strong> during the baseball season. <strong className="text-foreground">Message
              and data rates may apply.</strong> Reply <strong className="text-foreground">STOP</strong> to
              opt out at any time. See{" "}
              <a href="/sms-consent" className="text-primary underline font-medium">
                SMS consent
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary underline font-medium">
                Privacy
              </a>
              .
            </span>
          </label>
        )}
        {!phoneProvided && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Phone is optional. If you add a number, you&apos;ll confirm SMS consent before signing up.
            {" "}
            <a href="/sms-consent" className="underline">SMS consent</a>
            {" · "}
            <a href="/business-verification" className="underline">Program info</a>
          </p>
        )}
      </div>
      {askComfortLevel && (
        <div className="grid gap-1.5">
          <Label className="text-base font-medium">
            Comfort level for this role
          </Label>
          <div className="grid gap-2 rounded-xl border border-border/60 p-3 bg-muted/20">
            {COMFORT_LEVEL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-start gap-2.5 cursor-pointer text-base"
              >
                <input
                  type="radio"
                  name={`comfort-${jobId}`}
                  value={opt.value}
                  checked={comfortLevel === opt.value}
                  onChange={() => setComfortLevel(opt.value)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      {eventDate && (
        <div className="grid gap-1.5">
          <Label className="text-base font-medium">
            Remind me before event
          </Label>
          <select
            value={reminderHours}
            onChange={(e) => setReminderHours(e.target.value)}
            className="h-11 rounded-xl text-base border border-input bg-background px-3"
          >
            <option value="">No reminder</option>
            <option value="2">2 hours before</option>
            <option value="24">24 hours before</option>
            <option value="48">48 hours before</option>
          </select>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor={`job-player-${jobId}`} className="text-base font-medium">
          Player Name
        </Label>
        <Input
          id={`job-player-${jobId}`}
          placeholder="Who are you volunteering for?"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="h-11 rounded-xl text-base"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl flex-1"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="h-11 rounded-xl flex-1 font-semibold shadow-md shadow-primary/15 active:scale-[0.98] transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Signing up...
            </>
          ) : (
            "Sign Up"
          )}
        </Button>
      </div>
    </form>
  );

  const jobInfoBanner = (eventDate || eventTime) ? (
    <div className="rounded-xl bg-muted/50 border border-border/50 p-3 space-y-1">
      <p className="font-semibold text-base">{jobName}</p>
      {eventTitle && <p className="text-sm text-muted-foreground">{eventTitle}</p>}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {eventDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {eventDate}
          </span>
        )}
        {eventTime && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {eventTime}
          </span>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button
        className="shrink-0 rounded-xl shadow-md shadow-primary/15 active:scale-95 transition-transform min-h-11 h-11 md:h-12 px-4 md:px-5 text-sm md:text-base"
        onClick={() => setOpen(true)}
      >
        Sign Up
      </Button>

      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto" showCloseButton>
            <SheetHeader>
              <SheetTitle>Volunteer Sign Up</SheetTitle>
              <SheetDescription>
                {jobDescription && jobDescription.trim()
                  ? jobDescription.trim()
                  : "Fill in your details to volunteer for this job."}
              </SheetDescription>
            </SheetHeader>
            <div className="pb-6 pt-2 space-y-3 px-1">
              {jobInfoBanner}
              {formContent}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Volunteer Sign Up</DialogTitle>
              <DialogDescription>
                {jobDescription && jobDescription.trim()
                  ? jobDescription.trim()
                  : "Fill in your details to volunteer for this job."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {jobInfoBanner}
              {formContent}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
