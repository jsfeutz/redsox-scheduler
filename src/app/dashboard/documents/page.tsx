export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getUserTeamIds } from "@/lib/auth-helpers";
import { canManageOrgWideDocuments } from "@/lib/documents-access";
import { DocumentManager } from "@/components/documents/document-manager";

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const canOrg = canManageOrgWideDocuments(user.role as UserRole);
  const canTeam =
    user.role === UserRole.COACH || user.role === UserRole.TEAM_ADMIN;

  const teamIds = canOrg ? null : await getUserTeamIds(user.id);
  const teams = await prisma.team.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      ...(teamIds && teamIds.length > 0 ? { id: { in: teamIds } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const canCreate = canOrg || (canTeam && teams.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground mt-1">
          Club resources, forms, and links. Public documents are also listed on the{" "}
          <a href="/documents" className="text-primary underline">
            public documents page
          </a>
          .
        </p>
      </div>
      <DocumentManager
        allowOrgWide={canOrg}
        teams={teams}
        canCreate={canCreate}
      />
    </div>
  );
}
