"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ParsedRecord {
  email: string;
  name?: string;
}

interface CsvImportDialogProps {
  children: React.ReactNode;
}

export function CsvImportDialog({ children }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setCsvText("");
    setRecords([]);
    setParsed(false);
  }

  function parseCSV(text: string) {
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    const parsed: ParsedRecord[] = [];
    for (const row of result.data) {
      const email = row["email"]?.trim();
      if (!email) continue;
      parsed.push({
        email,
        name: row["name"]?.trim() || undefined,
      });
    }

    setRecords(parsed);
    setParsed(true);

    if (parsed.length === 0) {
      toast.error("No valid records found. Make sure your CSV has an 'email' column.");
    }
  }

  function handleParse() {
    if (!csvText.trim()) {
      toast.error("Please paste CSV data or upload a file");
      return;
    }
    parseCSV(csvText);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (records.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/volunteers/parents/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to import");
      }

      const data = await res.json();
      toast.success(`Imported ${data.imported} parent(s)`);
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger render={<span />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Parents from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV data with &quot;email&quot; and
            optional &quot;name&quot; columns.
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Upload CSV File</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="csv-paste">Or Paste CSV Data</Label>
              <Textarea
                id="csv-paste"
                placeholder={"email,name\njane@example.com,Jane Smith\njohn@example.com,John Doe"}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="min-h-[120px] font-mono text-xs"
              />
            </div>

            <DialogFooter>
              <Button type="button" onClick={handleParse} disabled={!csvText.trim()}>
                Preview
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Found <strong>{records.length}</strong> record(s) to import:
            </p>

            <div className="max-h-60 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">
                        {r.email}
                      </TableCell>
                      <TableCell>{r.name || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {records.length > 50 && (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-center text-muted-foreground"
                      >
                        ...and {records.length - 50} more
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setParsed(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={loading || records.length === 0}
              >
                {loading ? "Importing..." : `Import ${records.length} Parents`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
