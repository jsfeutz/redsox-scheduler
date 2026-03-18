"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { useVolunteerIdentity } from "@/components/providers/volunteer-identity";

interface PublicJobSignupProps {
  jobId: string;
  jobName: string;
  onSuccess: (name?: string) => void;
}

export function PublicJobSignup({
  jobId,
  jobName,
  onSuccess,
}: PublicJobSignupProps) {
  const { identity, setIdentity } = useVolunteerIdentity();
  const [showForm, setShowForm] = useState(false);
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
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span>Signed up! Check your email for confirmation.</span>
      </div>
    );
  }

  if (!showForm) {
    return (
      <Button
        className="shrink-0 rounded-xl shadow-md shadow-primary/15 active:scale-95 transition-transform h-11 px-5 text-sm"
        onClick={() => setShowForm(true)}
      >
        Sign Up
        <ChevronDown className="ml-1 h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <div className="border-t border-border/50 pt-4 mt-4">
      <form onSubmit={handleSubmit} className="grid gap-3">
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
            className="h-12 rounded-xl text-base"
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
            className="h-12 rounded-xl text-base"
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
            className="h-12 rounded-xl text-base"
          />
          <p className="text-xs text-muted-foreground">
            Get SMS reminders about your shift. <a href="/sms-consent" className="underline">SMS Consent</a>
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
            className="h-12 rounded-xl text-base"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl flex-1"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl flex-1 text-base font-semibold shadow-md shadow-primary/15 active:scale-[0.98] transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Signing up...
              </>
            ) : (
              "Confirm Sign Up"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
