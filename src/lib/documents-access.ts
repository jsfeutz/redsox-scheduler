import type { Prisma } from "@prisma/client";
import { UserRole } from "@prisma/client";
import type { SessionUser } from "@/types";
import { getUserTeamIds } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/** Reserved `<Select>` value for “any category/tag”; never sent to the API as a filter. */
export const DOCUMENT_FILTER_ANY = "*";

export function canManageOrgWideDocuments(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SCHEDULE_MANAGER;
}

/** Documents intended for the public catalog (ignores session). */
export function publicDocumentsWhere(orgId: string): Prisma.DocumentWhereInput {
  return { organizationId: orgId, visibility: "PUBLIC" };
}

/** Where clause for documents visible to the viewer (org-scoped). */
export async function documentsVisibleWhere(
  orgId: string,
  user: SessionUser | null
): Promise<Prisma.DocumentWhereInput> {
  if (!user || user.organizationId !== orgId) {
    return { organizationId: orgId, visibility: "PUBLIC" };
  }

  const wide = canManageOrgWideDocuments(user.role);
  const teamIds = wide ? null : await getUserTeamIds(user.id);

  return {
    organizationId: orgId,
    OR: [
      { visibility: "PUBLIC" },
      {
        visibility: "MEMBERS_ONLY",
        OR: [
          { scope: "ORG_WIDE" },
          ...(wide
            ? [{ scope: "TEAM" as const }]
            : teamIds != null && teamIds.length > 0
              ? [{ scope: "TEAM" as const, teamId: { in: teamIds } }]
              : []),
        ],
      },
    ],
  };
}

export function normalizeTagsInput(raw: string | undefined | null): string {
  if (!raw?.trim()) return "";
  const parts = raw
    .split(/[,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).join(",");
}

export function parseTags(tags: string): string[] {
  if (!tags.trim()) return [];
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

export function searchWhere(q: string): Prisma.DocumentWhereInput {
  const s = q.trim();
  if (!s) return {};
  return {
    OR: [
      { title: { contains: s, mode: "insensitive" } },
      { description: { contains: s, mode: "insensitive" } },
      { tags: { contains: s, mode: "insensitive" } },
      { fileName: { contains: s, mode: "insensitive" } },
      { category: { contains: s, mode: "insensitive" } },
    ],
  };
}

export async function findDocumentVisible(
  id: string,
  user: SessionUser | null
) {
  const org = await prisma.organization.findFirst({ select: { id: true } });
  if (!org) return null;
  const base = await documentsVisibleWhere(org.id, user);
  return prisma.document.findFirst({
    where: { AND: [{ id }, base] },
    include: {
      team: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  });
}
