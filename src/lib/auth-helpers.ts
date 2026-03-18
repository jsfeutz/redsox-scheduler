import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { UserRole } from "@prisma/client";
import { SessionUser } from "@/types";
import { prisma } from "./prisma";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(
  ...roles: UserRole[]
): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}

// --------------- Org-level role checks ---------------

const facilityRoles: UserRole[] = [UserRole.ADMIN, UserRole.FACILITY_MANAGER];
const scheduleRoles: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SCHEDULE_MANAGER,
  UserRole.COACH,
  UserRole.TEAM_ADMIN,
];
const bumpRoles: UserRole[] = [UserRole.ADMIN, UserRole.SCHEDULE_MANAGER];
const volunteerRoles: UserRole[] = [
  UserRole.ADMIN,
  UserRole.TEAM_ADMIN,
  UserRole.COACH,
];

export function canManageFacilities(role: UserRole): boolean {
  return facilityRoles.includes(role);
}

export function canManageSchedule(role: UserRole): boolean {
  return scheduleRoles.includes(role);
}

export function canBumpEvents(role: UserRole): boolean {
  return bumpRoles.includes(role);
}

export function canManageVolunteers(role: UserRole): boolean {
  return volunteerRoles.includes(role);
}

export function canInviteUsers(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

export function isOrgAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}

// --------------- Team-level helpers ---------------

export async function getUserTeamIds(userId: string): Promise<string[]> {
  const [memberships, headCoachTeams] = await Promise.all([
    prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    }),
    prisma.team.findMany({
      where: { headCoachId: userId },
      select: { id: true },
    }),
  ]);

  const idSet = new Set([
    ...memberships.map((m) => m.teamId),
    ...headCoachTeams.map((t) => t.id),
  ]);
  return Array.from(idSet);
}

export async function canManageTeam(
  user: SessionUser,
  teamId: string
): Promise<boolean> {
  if (user.role === UserRole.ADMIN || user.role === UserRole.SCHEDULE_MANAGER) {
    return true;
  }

  const [membership, isHeadCoach] = await Promise.all([
    prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    }),
    prisma.team.findFirst({
      where: { id: teamId, headCoachId: user.id },
      select: { id: true },
    }),
  ]);

  return !!membership || !!isHeadCoach;
}

export async function isTeamMember(
  userId: string,
  teamId: string
): Promise<boolean> {
  const [membership, isHeadCoach] = await Promise.all([
    prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    }),
    prisma.team.findFirst({
      where: { id: teamId, headCoachId: userId },
      select: { id: true },
    }),
  ]);

  return !!membership || !!isHeadCoach;
}

export async function canInviteToTeam(
  user: SessionUser,
  teamId: string
): Promise<boolean> {
  if (user.role === UserRole.ADMIN) return true;

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: user.id } },
  });
  if (!membership) return false;
  return ["HEAD_COACH", "TEAM_MANAGER"].includes(membership.role);
}

export async function getTeamFilterForUser(
  user: SessionUser
): Promise<{ teamId?: string | { in: string[] } } | undefined> {
  if (user.role === UserRole.ADMIN || user.role === UserRole.SCHEDULE_MANAGER) {
    return undefined;
  }
  const teamIds = await getUserTeamIds(user.id);
  if (teamIds.length === 0) return { teamId: "__none__" };
  return { teamId: { in: teamIds } };
}
