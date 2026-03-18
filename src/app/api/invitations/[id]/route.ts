import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canInviteUsers } from "@/lib/auth-helpers";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canInviteUsers(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const invitation = await prisma.invitation.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  await prisma.invitation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
