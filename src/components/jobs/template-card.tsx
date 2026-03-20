"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Users, Building2, Clock } from "lucide-react";
import { TemplateForm } from "./template-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  scope: string;
  hoursPerGame: number;
  active: boolean;
  organizationId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  _count: { gameJobs: number };
}

interface TemplateCardProps {
  template: TemplateData;
  canManage: boolean;
}

export function TemplateCard({ template, canManage }: TemplateCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/templates/${template.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete template");
      }
      toast.success("Template deleted");
      setDeleteOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setLoading(false);
    }
  }

  const isTeamScope = template.scope === "TEAM";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{template.name}</CardTitle>
            {template.description && (
              <CardDescription className="mt-1">
                {template.description}
              </CardDescription>
            )}
          </div>
          {canManage && (
            <div className="flex gap-1 ml-2 shrink-0">
              <TemplateForm template={template}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TemplateForm>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger render={<span />}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Template</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete{" "}
                      <strong>{template.name}</strong>? This will also remove all
                      associated game jobs.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      {loading ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="rounded-lg text-xs gap-1">
            {isTeamScope ? (
              <Users className="h-3 w-3" />
            ) : (
              <Building2 className="h-3 w-3" />
            )}
            {isTeamScope ? "Team" : "Facility"}
          </Badge>
          <Badge variant="secondary" className="rounded-lg text-xs gap-1">
            <Clock className="h-3 w-3" />
            {template.hoursPerGame}h / event
          </Badge>
          {!template.active && (
            <Badge variant="secondary" className="rounded-lg text-xs bg-muted text-muted-foreground">
              Inactive
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Used in {template._count.gameJobs}{" "}
          {template._count.gameJobs === 1 ? "job" : "jobs"}
        </p>
      </CardContent>
    </Card>
  );
}
