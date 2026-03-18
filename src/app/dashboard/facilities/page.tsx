export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, canManageFacilities } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacilityForm } from "@/components/facilities/facility-form";
import { FacilityCard } from "./facility-card";

export default async function FacilitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const facilities = await prisma.facility.findMany({
    where: { organizationId: user.organizationId },
    include: {
      subFacilities: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const canManage = canManageFacilities(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facilities</h1>
          <p className="text-muted-foreground mt-1">
            Manage your fields and venues
          </p>
        </div>
        {canManage && (
          <FacilityForm>
            <Button className="rounded-xl shadow-md shadow-primary/15 active:scale-95 transition-all">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Facility
            </Button>
          </FacilityForm>
        )}
      </div>

      {facilities.length === 0 ? (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 mb-4">
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
            <CardTitle className="text-lg">No facilities yet</CardTitle>
            <CardDescription className="mt-1 text-center max-w-xs">
              Add your first facility to start scheduling games and practices.
            </CardDescription>
            {canManage && (
              <FacilityForm>
                <Button className="mt-6 rounded-xl shadow-md shadow-primary/15">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Facility
                </Button>
              </FacilityForm>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {facilities.map((facility) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground font-medium px-1">
        {facilities.length}{" "}
        {facilities.length === 1 ? "facility" : "facilities"} &middot;{" "}
        {facilities.reduce((sum, f) => sum + f.subFacilities.length, 0)}{" "}
        sub-facilities total
      </div>
    </div>
  );
}
