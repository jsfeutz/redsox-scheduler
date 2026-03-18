"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicFooter } from "@/components/public-footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-destructive/10 text-destructive text-sm p-3.5 font-medium border border-destructive/20">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="coach@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-12 rounded-xl text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-12 rounded-xl text-base"
        />
      </div>
      <Button
        type="submit"
        className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-200 active:scale-[0.98]"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-background" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl" />

      <Card className="w-full max-w-sm relative z-10 shadow-2xl shadow-black/20 border-border/50 rounded-2xl">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white text-xl font-black shadow-lg shadow-primary/30">
            RR
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Rubicon Redsox
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Baseball scheduling &amp; volunteer management
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8 px-7">
          <Suspense fallback={<div className="h-48" />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
      <div className="relative z-10 mt-6">
        <PublicFooter />
      </div>
    </div>
  );
}
