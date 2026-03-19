"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle2, Clock, Loader2 } from "lucide-react";
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
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  onSuccess: (name?: string) => void;
}

export function PublicJobSignup({
  jobId,
  jobName,
  eventTitle,
  eventDate,
  eventTime,
  onSuccess,
}: PublicJobSignupProps) {
  const { identity, setIdentity } = useVolunteerIdentity();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
        <span className="text-xs font-medium">Signed up!</span>
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="grid gap-3 px-1">
      <div className="grid gap-1.5">
        <Label htmlFor={`job-name-${jobId}`} className="text-sm font-medium">
          Your Name
        </Label>
        <Input
          id={`job-name-${jobId}`}
          placeholder="Jane Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-11 rounded-xl text-sm"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`job-email-${jobId}`} className="text-sm font-medium">
          Email
        </Label>
        <Input
          id={`job-email-${jobId}`}
          type="email"
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 rounded-xl text-sm"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`job-phone-${jobId}`} className="text-sm font-medium">
          Phone <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id={`job-phone-${jobId}`}
          type="tel"
          placeholder="(920) 555-1234"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-11 rounded-xl text-sm"
        />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          By providing your phone number, you consent to receive SMS notifications about your volunteer shift
          (confirmations, reminders, and changes). Msg frequency varies (2-5/wk during season). Msg &amp; data rates may apply.
          Reply STOP to cancel. <a href="/sms-consent" className="underline">SMS Consent</a> &middot; <a href="/privacy" className="underline">Privacy</a>
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`job-player-${jobId}`} className="text-sm font-medium">
          Player Name
        </Label>
        <Input
          id={`job-player-${jobId}`}
          placeholder="Who are you volunteering for?"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="h-11 rounded-xl text-sm"
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
      <p className="font-semibold text-sm">{jobName}</p>
      {eventTitle && <p className="text-xs text-muted-foreground">{eventTitle}</p>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {eventDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {eventDate}
          </span>
        )}
        {eventTime && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {eventTime}
          </span>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button
        className="shrink-0 rounded-xl shadow-md shadow-primary/15 active:scale-95 transition-transform h-9 md:h-10 px-4 md:px-5 text-xs md:text-sm"
        onClick={() => setOpen(true)}
      >
        Sign Up
      </Button>

      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto" showCloseButton>
            <SheetHeader>
              <SheetTitle>Volunteer Sign Up</SheetTitle>
              <SheetDescription className="sr-only">Sign up form</SheetDescription>
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
                Fill in your details to volunteer for this job.
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
