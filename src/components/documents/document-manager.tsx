"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  Link2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Share2,
  Copy,
  Mail,
  Loader2,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DOCUMENT_FILTER_ANY, parseTags } from "@/lib/documents-access";

export interface DocumentRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string;
  type: "FILE" | "LINK";
  visibility: "PUBLIC" | "MEMBERS_ONLY";
  scope: "ORG_WIDE" | "TEAM";
  teamId: string | null;
  team: { id: string; name: string } | null;
  fileName: string | null;
  externalUrl: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedBy: { id: string; name: string } | null;
  createdAt: string;
  sortOrder?: number;
}

function shareUrl(docId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/documents/${docId}`;
}

function ShareMenu({ doc }: { doc: DocumentRow }) {
  const url = shareUrl(doc.id);
  const subject = encodeURIComponent(doc.title);
  const body = encodeURIComponent(`${doc.title}\n\n${url}`);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-9 rounded-lg" type="button" />
        }
      >
        <Share2 className="h-3.5 w-3.5 mr-1" />
        Share
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="end">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              toast.success("Link copied");
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-2" />
            Copy link
          </Button>
          <a
            href={`mailto:?subject=${subject}&body=${body}`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "justify-start")}
          >
            <Mail className="h-3.5 w-3.5 mr-2" />
            Email
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DocumentManagerProps {
  lockedTeamId?: string | null;
  allowOrgWide?: boolean;
  canCreate?: boolean;
  teams?: { id: string; name: string }[];
}

export function DocumentManager({
  lockedTeamId = null,
  allowOrgWide = true,
  canCreate = true,
  teams = [],
}: DocumentManagerProps) {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tagList, setTagList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formVisibility, setFormVisibility] = useState<"PUBLIC" | "MEMBERS_ONLY">("PUBLIC");
  const [formScope, setFormScope] = useState<"ORG_WIDE" | "TEAM">("ORG_WIDE");
  const [formType, setFormType] = useState<"FILE" | "LINK">("FILE");
  const [formUrl, setFormUrl] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formTeamId, setFormTeamId] = useState("");

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (lockedTeamId) p.set("teamId", lockedTeamId);
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    if (tag.trim()) p.set("tag", tag.trim());
    return p.toString();
  }, [lockedTeamId, q, category, tag]);

  const categoryOptions = useMemo(
    () => categories.filter((c) => c !== DOCUMENT_FILTER_ANY),
    [categories]
  );
  const tagOptions = useMemo(() => tagList.filter((t) => t !== DOCUMENT_FILTER_ANY), [tagList]);

  /** Base UI Select: `items` map drives trigger text (keep short so narrow modal never clips). */
  const visibilityItems = useMemo(
    () =>
      ({
        PUBLIC: "Public",
        MEMBERS_ONLY: "Members only",
      }) satisfies Record<string, string>,
    []
  );
  const scopeItems = useMemo(
    () =>
      ({
        ORG_WIDE: "Organization-wide",
        TEAM: "Single team",
      }) satisfies Record<string, string>,
    []
  );
  const typeItems = useMemo(
    () =>
      ({
        FILE: "File upload",
        LINK: "External link",
      }) satisfies Record<string, string>,
    []
  );
  const teamItems = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t.name])) as Record<string, string>,
    [teams]
  );

  const docDialogSelectTriggerClass =
    "h-10 w-full min-w-0 max-w-full justify-between rounded-md text-sm [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = queryString ? `?${queryString}` : "";
      const [dRes, cRes, tRes] = await Promise.all([
        fetch(`/api/documents${qs}`),
        fetch("/api/documents/categories"),
        fetch("/api/documents/tags"),
      ]);
      if (dRes.ok) setDocs(await dRes.json());
      if (cRes.ok) setCategories(await cRes.json());
      if (tRes.ok) setTagList(await tRes.json());
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("");
    setFormTags("");
    setFormVisibility("PUBLIC");
    const scope = lockedTeamId || !allowOrgWide ? "TEAM" : "ORG_WIDE";
    setFormScope(scope);
    const initialTeam =
      lockedTeamId ||
      (!allowOrgWide && teams[0]?.id) ||
      (scope === "TEAM" && teams.length === 1 ? teams[0]!.id : "");
    setFormTeamId(initialTeam);
    setFormType("FILE");
    setFormUrl("");
    setFormFile(null);
    setDialogOpen(true);
  }

  function openEdit(row: DocumentRow) {
    setEditing(row);
    setFormTitle(row.title);
    setFormDescription(row.description || "");
    setFormCategory(row.category || "");
    setFormTags(row.tags);
    setFormVisibility(row.visibility);
    setFormScope(row.scope);
    setFormTeamId(row.teamId || "");
    setFormType(row.type);
    setFormUrl(row.externalUrl || "");
    setFormFile(null);
    setDialogOpen(true);
  }

  async function submitForm() {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/documents/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            description: formDescription.trim() || null,
            category: formCategory.trim() || null,
            tags: formTags,
            visibility: formVisibility,
            sortOrder: typeof editing.sortOrder === "number" ? editing.sortOrder : 0,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Save failed");
        }
        toast.success("Document updated");
      } else {
        const fd = new FormData();
        fd.set("title", formTitle.trim());
        fd.set("description", formDescription.trim());
        fd.set("category", formCategory.trim());
        fd.set("tags", formTags);
        fd.set("visibility", formVisibility);
        const scope = lockedTeamId || !allowOrgWide ? "TEAM" : formScope;
        fd.set("scope", scope);
        const tid = lockedTeamId || (formScope === "TEAM" ? formTeamId : "");
        if (scope === "TEAM") {
          if (!tid) {
            toast.error("Select a team.");
            setSaving(false);
            return;
          }
          fd.set("teamId", tid);
        }
        fd.set("type", formType);
        if (formType === "LINK") {
          fd.set("externalUrl", formUrl.trim());
        } else if (formFile) {
          fd.set("file", formFile);
        } else {
          toast.error("Choose a file or switch to link");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/documents", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Create failed");
        }
        toast.success("Document added");
      }
      setDialogOpen(false);
      await load();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    await load();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, description, tags…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <Select
            value={category || DOCUMENT_FILTER_ANY}
            onValueChange={(v) => setCategory(v === DOCUMENT_FILTER_ANY ? "" : (v ?? ""))}
          >
            <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DOCUMENT_FILTER_ANY}>All categories</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={tag || DOCUMENT_FILTER_ANY}
            onValueChange={(v) => setTag(v === DOCUMENT_FILTER_ANY ? "" : (v ?? ""))}
          >
            <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DOCUMENT_FILTER_ANY}>All tags</SelectItem>
              {tagOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="rounded-xl shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Add document
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No documents match your filters.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <ul className="m-0 list-none divide-y divide-border/60 p-0">
            {docs.map((d) => (
              <li key={d.id} className="px-3 py-3 sm:px-4 sm:py-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="flex shrink-0 gap-3 sm:pt-0.5">
                    {d.type === "LINK" ? (
                      <Link2 className="size-5 text-blue-500 sm:size-5" aria-hidden />
                    ) : (
                      <FileText className="size-5 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {d.category?.trim() ? (
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {d.category.trim()}
                      </p>
                    ) : null}
                    <Link
                      href={`/documents/${d.id}`}
                      className="block font-semibold leading-snug text-foreground hover:text-primary hover:underline"
                    >
                      {d.title}
                    </Link>
                    {d.description?.trim() ? (
                      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 sm:line-clamp-3">
                        {d.description.trim()}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {d.visibility === "PUBLIC" ? (
                        <Badge variant="outline" className="text-[10px] gap-0.5 font-normal">
                          <Globe className="h-2.5 w-2.5" /> Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-0.5 font-normal">
                          <Lock className="h-2.5 w-2.5" /> Members
                        </Badge>
                      )}
                      {d.scope === "TEAM" && d.team ? (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {d.team.name}
                        </Badge>
                      ) : null}
                      {parseTags(d.tags).map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {d.type === "LINK" ? (
                        <a
                          href={d.externalUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "default", size: "sm" }),
                            "h-9 justify-center sm:min-w-[7.5rem]"
                          )}
                        >
                          Open link
                        </a>
                      ) : (
                        <a
                          href={`/api/documents/${d.id}?download=1`}
                          className={cn(
                            buttonVariants({ variant: "default", size: "sm" }),
                            "h-9 justify-center sm:min-w-[7.5rem]"
                          )}
                        >
                          Download
                        </a>
                      )}
                      <ShareMenu doc={d} />
                      {canCreate ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-lg px-3"
                            onClick={() => openEdit(d)}
                            aria-label="Edit document"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-lg px-3 text-destructive hover:text-destructive"
                            onClick={() => remove(d.id)}
                            aria-label="Delete document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={cn(
            "flex w-[min(100%,28rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 shadow-lg",
            "max-h-[min(94dvh,46rem)] sm:max-h-[min(90vh,46rem)]",
            "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[92dvh] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:border-x-0 max-sm:border-b-0"
          )}
        >
          <DialogHeader className="shrink-0 space-y-0.5 border-b border-border/60 px-4 py-2.5 pr-14 text-left sm:px-5 sm:py-3">
            <DialogTitle className="text-lg font-semibold leading-tight sm:text-xl">
              {editing ? "Edit document" : "Add document"}
            </DialogTitle>
            <DialogDescription className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
              {editing ? "Update title, description, and visibility." : "File or link, then save."}
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "min-h-0 flex-1 overscroll-y-contain px-4 py-3 sm:px-5",
              "overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            )}
          >
            <div className="mx-auto grid max-w-full gap-3 pb-0.5">
              <div className="grid gap-1">
                <Label htmlFor="doc-form-title" className="text-xs font-medium text-muted-foreground">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="doc-form-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  autoComplete="off"
                  className="h-10 rounded-md text-sm"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="doc-form-desc" className="text-xs font-medium text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  id="doc-form-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="min-h-[4.25rem] resize-y rounded-md text-sm"
                />
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="grid min-w-0 gap-1">
                  <Label htmlFor="doc-form-cat" className="text-xs font-medium text-muted-foreground">
                    Category
                  </Label>
                  <Input
                    id="doc-form-cat"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Forms"
                    className="h-10 min-w-0 rounded-md text-sm"
                  />
                </div>
                <div className="grid min-w-0 gap-1">
                  <Label htmlFor="doc-form-tags" className="text-xs font-medium text-muted-foreground">
                    Tags
                  </Label>
                  <Input
                    id="doc-form-tags"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="Optional"
                    className="h-10 min-w-0 rounded-md text-sm"
                  />
                </div>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-2">
                <div className="grid min-w-0 gap-1">
                  <Label className="text-xs font-medium text-muted-foreground">Visibility</Label>
                  <Select
                    value={formVisibility}
                    onValueChange={(v) => setFormVisibility((v as "PUBLIC" | "MEMBERS_ONLY") ?? "PUBLIC")}
                    items={visibilityItems}
                  >
                    <SelectTrigger className={docDialogSelectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      <SelectItem value="PUBLIC" label="Public (anyone with link)">
                        Public (anyone with link)
                      </SelectItem>
                      <SelectItem value="MEMBERS_ONLY" label="Members only (login required)">
                        Members only (login required)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!editing && !lockedTeamId && allowOrgWide ? (
                  <div className="grid min-w-0 gap-1">
                    <Label className="text-xs font-medium text-muted-foreground">Scope</Label>
                    <Select
                      value={formScope}
                      onValueChange={(v) => {
                        const s = (v as "ORG_WIDE" | "TEAM") ?? "ORG_WIDE";
                        setFormScope(s);
                        if (s === "ORG_WIDE") setFormTeamId("");
                        else if (teams.length === 1) setFormTeamId(teams[0]!.id);
                      }}
                      items={scopeItems}
                    >
                      <SelectTrigger className={docDialogSelectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <SelectItem value="ORG_WIDE" label={scopeItems.ORG_WIDE}>
                          {scopeItems.ORG_WIDE}
                        </SelectItem>
                        <SelectItem value="TEAM" label={scopeItems.TEAM}>
                          {scopeItems.TEAM}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              {!editing && !lockedTeamId && !allowOrgWide ? (
                <p className="text-xs text-muted-foreground">Team document — pick the team below.</p>
              ) : null}
              {!editing && (formScope === "TEAM" || !allowOrgWide) && teams.length > 0 ? (
                <div className="grid gap-1">
                  <Label className="text-xs font-medium text-muted-foreground">Team</Label>
                  <Select
                    value={formTeamId || null}
                    onValueChange={(v) => setFormTeamId(typeof v === "string" ? v : "")}
                    items={teamItems}
                  >
                    <SelectTrigger className={docDialogSelectTriggerClass}>
                      <SelectValue placeholder="Choose a team" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id} label={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {!editing && (
                <div className="grid gap-3 border-t border-border/50 pt-3">
                  <div className="grid gap-1 sm:max-w-[50%]">
                    <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                    <Select
                      value={formType}
                      onValueChange={(v) => setFormType((v as "FILE" | "LINK") ?? "FILE")}
                      items={typeItems}
                    >
                      <SelectTrigger className={docDialogSelectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-64 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <SelectItem value="FILE" label={typeItems.FILE}>
                          {typeItems.FILE}
                        </SelectItem>
                        <SelectItem value="LINK" label={typeItems.LINK}>
                          {typeItems.LINK}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formType === "LINK" ? (
                    <div className="grid gap-1">
                      <Label htmlFor="doc-form-url" className="text-xs font-medium text-muted-foreground">
                        URL
                      </Label>
                      <Input
                        id="doc-form-url"
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        placeholder="https://..."
                        inputMode="url"
                        autoCapitalize="off"
                        autoCorrect="off"
                        className="h-10 rounded-md text-sm"
                      />
                    </div>
                  ) : (
                    <div className="grid gap-1">
                      <Label htmlFor="doc-form-file" className="text-xs font-medium text-muted-foreground">
                        File
                      </Label>
                      <Input
                        id="doc-form-file"
                        type="file"
                        onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                        className="h-10 cursor-pointer rounded-md border-dashed text-xs file:mr-2 file:rounded-md file:border file:border-border file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-medium"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 gap-2 border-t border-border/60 bg-muted/30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:gap-3 sm:p-4 sm:px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-10 w-full touch-manipulation rounded-md sm:w-auto sm:min-w-[7rem]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitForm}
              disabled={saving}
              className="h-10 w-full touch-manipulation rounded-md sm:w-auto sm:min-w-[7rem]"
            >
              {saving ? "Saving…" : editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
