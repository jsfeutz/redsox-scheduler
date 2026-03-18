import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMagicLink } from "@/lib/email";
import { getSeasonTokenExpiry } from "@/lib/token-expiry";

export async function POST(req: Request) {
  const body = await req.json();
  const { email } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const emailTrimmed = email.trim().toLowerCase();

  const hasSignups = await prisma.jobAssignment.findFirst({
    where: { email: emailTrimmed },
  });

  if (!hasSignups) {
    // Don't reveal whether the email exists — always say "sent"
    return NextResponse.json({ success: true });
  }

  // Clean up old tokens for this email
  await prisma.emailVerification.deleteMany({
    where: { email: emailTrimmed },
  });

  const verification = await prisma.emailVerification.create({
    data: {
      email: emailTrimmed,
      expiresAt: await getSeasonTokenExpiry(),
    },
  });

  try {
    await sendMagicLink({ to: emailTrimmed, token: verification.token });
  } catch (err) {
    console.error("[EMAIL] Failed to send magic link:", err);
  }

  return NextResponse.json({ success: true });
}
