import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendReplacementNotification } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json();
  const { token, name, phone, password } = body;

  if (!token || !name || !password) {
    return NextResponse.json(
      { error: "Token, name, and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      team: {
        include: {
          headCoach: { select: { id: true, name: true, email: true } },
          members: {
            select: {
              id: true,
              role: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json(
      { error: "This invitation has already been used" },
      { status: 400 }
    );
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json(
      { error: "This invitation has expired" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [newUser] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invitation.email,
        name: name.trim(),
        phone: phone?.trim() || null,
        passwordHash,
        role: invitation.role,
        organizationId: invitation.organizationId,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  if (invitation.teamId && invitation.teamRole) {
    const team = invitation.team;
    let replacedPerson: { name: string; email: string } | null = null;

    if (team) {
      if (invitation.teamRole === "HEAD_COACH") {
        if (team.headCoach) {
          replacedPerson = team.headCoach;
          const existingMembership = team.members.find(
            (m) => m.user.id === team.headCoach!.id && m.role === "HEAD_COACH"
          );
          if (existingMembership) {
            await prisma.teamMember.delete({
              where: { id: existingMembership.id },
            });
          }
          await prisma.team.update({
            where: { id: team.id },
            data: { headCoachId: newUser.id },
          });
        } else {
          await prisma.team.update({
            where: { id: team.id },
            data: { headCoachId: newUser.id },
          });
        }
      } else {
        const existingMember = team.members.find(
          (m) => m.role === invitation.teamRole
        );
        if (existingMember) {
          replacedPerson = existingMember.user;
          await prisma.teamMember.delete({
            where: { id: existingMember.id },
          });
        }
      }
    }

    await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId: newUser.id,
        role: invitation.teamRole,
      },
    });

    if (replacedPerson && team) {
      const teamRoleLabel = invitation.teamRole.replace(/_/g, " ").toLowerCase();
      try {
        await sendReplacementNotification({
          to: replacedPerson.email,
          replacedName: replacedPerson.name,
          newPersonName: name.trim(),
          teamName: team.name,
          role: teamRoleLabel,
        });
      } catch (err) {
        console.error("[EMAIL] Failed to send replacement notification:", err);
      }
    }
  }

  return NextResponse.json({ success: true });
}
