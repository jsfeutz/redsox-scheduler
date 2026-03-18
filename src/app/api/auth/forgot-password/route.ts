import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { addHours } from "date-fns";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Always return success to prevent email enumeration
  if (!user || !user.active) {
    return NextResponse.json({ ok: true });
  }

  // Rate limit: max 1 token per 2 minutes per email
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: {
      email: normalizedEmail,
      createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
    },
  });

  if (recentToken) {
    return NextResponse.json({ ok: true });
  }

  // Invalidate older unused tokens
  await prisma.passwordResetToken.updateMany({
    where: { email: normalizedEmail, usedAt: null },
    data: { usedAt: new Date() },
  });

  const resetToken = await prisma.passwordResetToken.create({
    data: {
      email: normalizedEmail,
      expiresAt: addHours(new Date(), 1),
    },
  });

  await sendPasswordResetEmail({ to: normalizedEmail, token: resetToken.token });

  return NextResponse.json({ ok: true });
}
