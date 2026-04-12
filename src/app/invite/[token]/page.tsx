export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PublicFooter } from "@/components/public-footer";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { AcceptInviteForm } from "@/components/settings/accept-invite-form";
import { BrandingMark } from "@/components/branding/branding-mark";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <Card className="w-full max-w-sm rounded-2xl border-border/50 shadow-2xl shadow-black/20">
          <CardContent className="flex flex-col items-center py-14">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 mb-4">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-lg">Invalid Invitation</CardTitle>
            <CardDescription className="mt-2 text-center text-sm">
              This invitation link is invalid or does not exist.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date() > invitation.expiresAt;
  const isAccepted = invitation.status === "ACCEPTED";

  if (isExpired || invitation.status === "EXPIRED") {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <Card className="w-full max-w-sm rounded-2xl border-border/50 shadow-2xl shadow-black/20">
          <CardContent className="flex flex-col items-center py-14">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
              <Clock className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Invitation Expired</CardTitle>
            <CardDescription className="mt-2 text-center text-sm">
              This invitation has expired. Please ask your administrator to send
              a new one.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <Card className="w-full max-w-sm rounded-2xl border-border/50 shadow-2xl shadow-black/20">
          <CardContent className="flex flex-col items-center py-14">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <CardTitle className="text-lg">Already Accepted</CardTitle>
            <CardDescription className="mt-2 text-center text-sm">
              This invitation has already been accepted. You can sign in to your
              account.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel = invitation.role.replace(/_/g, " ");

  return (
    <div className="flex flex-col min-h-dvh items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      <Card className="w-full max-w-sm relative z-10 rounded-2xl border-border/50 shadow-2xl shadow-black/20">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto mb-4 flex justify-center">
            <BrandingMark variant="invite" />
          </div>
          <CardTitle className="text-xl font-bold">
            Join {invitation.organization.name}
          </CardTitle>
          <CardDescription className="mt-1">
            You&apos;ve been invited as{" "}
            <Badge variant="secondary" className="ml-1 rounded-lg">
              {roleLabel}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8 px-7">
          <AcceptInviteForm
            token={token}
            email={invitation.email}
            organizationName={invitation.organization.name}
            role={roleLabel}
          />
        </CardContent>
      </Card>
      <div className="relative z-10 mt-6">
        <PublicFooter />
      </div>
    </div>
  );
}
