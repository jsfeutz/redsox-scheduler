"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AcceptInviteFormProps {
  token: string;
  email: string;
  organizationName: string;
  role: string;
}

export function AcceptInviteForm({
  token,
  email,
  organizationName,
  role,
}: AcceptInviteFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), phone: phone.trim() || undefined, password }),
      });

      if (!res.ok) {
        let msg = "Failed to accept invitation";
        try {
          const data = await res.json();
          if (data.error) msg = data.error;
        } catch {
          // non-JSON response
        }
        throw new Error(msg);
      }

      toast.success("Account created! You can now sign in.");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="accept-name">Name *</Label>
        <Input
          id="accept-name"
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="accept-email">Email</Label>
        <Input id="accept-email" type="email" value={email} disabled />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="accept-phone">Phone Number</Label>
        <Input
          id="accept-phone"
          type="tel"
          placeholder="(920) 555-1234"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Optional. By providing your phone number, you consent to receive SMS notifications
          (shift reminders, schedule changes). Msg frequency varies (2-5/wk during season). Msg &amp; data rates may apply.
          Reply STOP to cancel. <a href="/sms-consent" className="underline">SMS Consent</a> &middot; <a href="/privacy" className="underline">Privacy</a>
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="accept-password">Password *</Label>
        <Input
          id="accept-password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="accept-confirm-password">Confirm Password *</Label>
        <Input
          id="accept-confirm-password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            Creating Account...
          </>
        ) : (
          "Create Account & Join"
        )}
      </Button>
    </form>
  );
}
