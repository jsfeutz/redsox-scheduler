"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CsvImportDialog } from "./csv-import-dialog";

interface Parent {
  id: string;
  name: string | null;
  email: string;
  signupCount: number;
  scheduledHours: number;
  completedHours: number;
}

interface ParentListProps {
  isAdmin: boolean;
}

export function ParentList({ isAdmin }: ParentListProps) {
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParents();
  }, []);

  async function fetchParents() {
    try {
      const res = await fetch("/api/volunteers/parents");
      if (!res.ok) throw new Error("Failed to load parents");
      const data = await res.json();
      setParents(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading parents...
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {parents.length} parent(s) registered
        </p>
        {isAdmin && (
          <CsvImportDialog>
            <Button size="sm" variant="outline">
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Import CSV
            </Button>
          </CsvImportDialog>
        )}
      </div>

      {parents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No parents yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Import parents from a CSV or they&apos;ll be added when they sign
              up for volunteer slots.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Scheduled Hours</TableHead>
                <TableHead className="text-right">Completed Hours</TableHead>
                <TableHead className="text-right">Signups</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parents.map((parent) => (
                <TableRow key={parent.id}>
                  <TableCell className="font-medium">
                    {parent.name || "—"}
                  </TableCell>
                  <TableCell>{parent.email}</TableCell>
                  <TableCell className="text-right">
                    {parent.scheduledHours.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {parent.completedHours.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right">
                    {parent.signupCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
