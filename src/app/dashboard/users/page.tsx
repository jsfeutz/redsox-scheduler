export const dynamic = "force-dynamic";

import { getCurrentUser, canInviteUsers } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { UserManager } from "@/components/settings/user-manager";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!canInviteUsers(user.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">
          Manage users, invitations, and team assignments
        </p>
      </div>
      <UserManager currentUserId={user.id} />
    </div>
  );
}
