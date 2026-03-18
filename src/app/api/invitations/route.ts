import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentUser,
  canInviteUsers,
  canInviteToTeam,
  isOrgAdmin,
} from "@/lib/auth-helpers";
import { sendInvitation } from "@/lib/email";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canInviteUsers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invitations = await prisma.invitation.findMany({
    where: { organizationId: user.organizationId },
    include: {
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { email, role, teamId, teamRole } = body;

  if (teamId) {
    if (!(await canInviteToTeam(user, teamId))) {
      return NextResponse.json(
        { error: "You cannot invite to this team" },
        { status: 403 }
      );
    }
  } else {
    if (!canInviteUsers(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 }
    );
  }

  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  let replacingName: string | null = null;

  if (teamId && teamRole) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        headCoach: { select: { name: true } },
        members: {
          where: { role: teamRole },
          select: { user: { select: { name: true } } },
        },
      },
    });
    if (team) {
      if (teamRole === "HEAD_COACH" && team.headCoach) {
        replacingName = team.headCoach.name;
      } else if (team.members.length > 0) {
        replacingName = team.members[0].user.name;
      }
    }
  }

  const invitation = await prisma.invitation.create({
    data: {
      email: email.toLowerCase().trim(),
      role,
      teamId: teamId || null,
      teamRole: teamRole || null,
      organizationId: user.organizationId,
      invitedById: user.id,
      expiresAt,
    },
    include: {
      team: { select: { name: true } },
    },
  });

  try {
    await sendInvitation({
      to: invitation.email,
      inviterName: user.name || "An administrator",
      role: invitation.role,
      teamName: invitation.team?.name,
      teamRole: teamRole || null,
      replacingName,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    });
  } catch (err) {
    console.error("[EMAIL] Failed to send invitation email:", err);
  }

  return NextResponse.json(invitation, { status: 201 });
}
