"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

interface PublicSignupFormProps {
  slotId: string;
  slotName: string;
  smsEnabled?: boolean;
  onSuccess?: () => void;
}

export function PublicSignupForm({
  slotId,
  slotName,
  smsEnabled = true,
  onSuccess,
}: PublicSignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/volunteers/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteerSlotId: slotId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sign up");
      }

      setSuccess(true);
      toast.success("You're signed up! Thank you for volunteering.");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-base text-emerald-400">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <span>
          Signed up for <strong>{slotName}</strong>. Thank you!
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`name-${slotId}`} className="text-base font-medium">
          Your Name
        </Label>
        <Input
          id={`name-${slotId}`}
          placeholder="Jane Smith"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-12 rounded-xl text-base"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`email-${slotId}`} className="text-base font-medium">
          Email
        </Label>
        <Input
          id={`email-${slotId}`}
          type="email"
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-12 rounded-xl text-base"
        />
      </div>
      {smsEnabled && (
        <div className="grid gap-1.5">
          <Label htmlFor={`phone-${slotId}`} className="text-base font-medium">
            Phone <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id={`phone-${slotId}`}
            type="tel"
            placeholder="(920) 555-1234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 rounded-xl text-base"
          />
          <p className="text-sm text-muted-foreground leading-relaxed">
            By providing your phone number, you consent to receive SMS notifications about your volunteer shift
            (confirmations, reminders, and changes). Msg frequency varies (2-5/wk during season). Msg &amp; data rates may apply.
            Reply STOP to cancel. <a href="/sms-consent" className="underline">SMS Consent</a> &middot; <a href="/privacy" className="underline">Privacy</a>
          </p>
        </div>
      )}
      <Button
        type="submit"
        disabled={loading}
        className="h-12 rounded-xl text-base font-semibold shadow-md shadow-primary/15 active:scale-[0.98] transition-all"
      >
        {loading ? "Signing up..." : "Confirm Sign Up"}
      </Button>
    </form>
  );
}
