"use client";

import { useState } from "react";
import type { Facility, SubFacility } from "@prisma/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  MapPin,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { FacilityForm } from "@/components/facilities/facility-form";
import { SubFacilityForm } from "@/components/facilities/sub-facility-form";
import { DeleteFacilityDialog } from "@/components/facilities/delete-facility-dialog";
import { FacilityJobConfig } from "@/components/facilities/facility-job-config";

interface FacilityCardProps {
  facility: Facility & { subFacilities: SubFacility[] };
  canManage: boolean;
}

export function FacilityCard({ facility, canManage }: FacilityCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            className="flex items-start gap-3 text-left"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="mt-0.5 text-muted-foreground">
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      (facility as unknown as { color?: string }).color ?? "#64748b",
                  }}
                />
                {facility.name}
              </CardTitle>
              {facility.address && (
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {facility.address}
                </CardDescription>
              )}
            </div>
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {facility.subFacilities.length}{" "}
              {facility.subFacilities.length === 1 ? "sub-facility" : "sub-facilities"}
            </Badge>
            {canManage && (
              <div className="flex items-center gap-1">
                <FacilityForm facility={facility}>
                  <Button variant="ghost" size="icon-sm">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </FacilityForm>
                <DeleteFacilityDialog
                  facilityId={facility.id}
                  facilityName={facility.name}
                >
                  <Button variant="ghost" size="icon-sm">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </DeleteFacilityDialog>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {facility.notes && (
            <p className="text-sm text-muted-foreground mb-4">
              {facility.notes}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                Sub-Facilities
              </h4>
              {canManage && (
                <SubFacilityForm facilityId={facility.id}>
                  <Button variant="outline" size="xs">
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </SubFacilityForm>
              )}
            </div>

            {facility.subFacilities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center rounded-lg border border-dashed">
                No sub-facilities yet.{" "}
                {canManage && "Add fields, diamonds, or cages."}
              </p>
            ) : (
              <div className="rounded-lg border divide-y">
                {facility.subFacilities.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{sub.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {sub.type && (
                            <span className="text-xs text-muted-foreground">
                              {sub.type}
                            </span>
                          )}
                          {sub.capacity && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Users className="h-3 w-3" />
                              {sub.capacity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <SubFacilityForm
                          facilityId={facility.id}
                          subFacility={sub}
                        >
                          <Button variant="ghost" size="icon-xs">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </SubFacilityForm>
                        <DeleteFacilityDialog
                          facilityId={facility.id}
                          facilityName={sub.name}
                          type="sub-facility"
                          subFacilityId={sub.id}
                        >
                          <Button variant="ghost" size="icon-xs">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </DeleteFacilityDialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManage && (
            <FacilityJobConfig
              facilityId={facility.id}
              facilityName={facility.name}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}
