"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Link2,
  Loader2,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";
import { CopyDocumentLinkButton } from "@/components/documents/copy-document-link-button";
import type { DocumentRow } from "@/components/documents/document-manager";
import { DOCUMENT_FILTER_ANY, parseTags } from "@/lib/documents-access";

const PAGE_SIZE = 20;

type ListResponse = { items: DocumentRow[]; total: number; page: number; pageSize: number };

function DocumentListRow({ doc }: { doc: DocumentRow }) {
  const [open, setOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const tags = parseTags(doc.tags);

  useEffect(() => {
    setPageUrl(`${window.location.origin}/documents/${doc.id}`);
  }, [doc.id]);

  const mailto = pageUrl
    ? `mailto:?subject=${encodeURIComponent(doc.title)}&body=${encodeURIComponent(`${doc.title}\n\n${pageUrl}`)}`
    : "";
  const hasDetails =
    tags.length > 0 || Boolean(doc.description?.trim()) || Boolean(doc.team?.name);

  return (
    <li className="border-b border-border/60 last:border-b-0">
      <div className="flex gap-2 sm:gap-3 px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
          {hasDetails ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
              aria-expanded={open}
              aria-controls={`doc-details-${doc.id}`}
              id={`doc-expand-${doc.id}`}
              onClick={() => setOpen((v) => !v)}
            >
              <ChevronDown
                className={cn("size-5 transition-transform duration-200", open && "rotate-180")}
                aria-hidden
              />
              <span className="sr-only">{open ? "Hide" : "Show"} details</span>
            </Button>
          ) : (
            <span className="size-9 shrink-0" aria-hidden />
          )}
          {doc.type === "LINK" ? (
            <Link2 className="size-5 text-blue-500 sm:size-5" aria-hidden />
          ) : (
            <FileText className="size-5 text-muted-foreground" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-1">
              {doc.category?.trim() ? (
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {doc.category.trim()}
                </p>
              ) : null}
              <Link
                href={`/documents/${doc.id}`}
                className="block font-semibold text-base leading-snug text-foreground hover:text-primary hover:underline"
              >
                {doc.title}
              </Link>
              {doc.description?.trim() ? (
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2 sm:line-clamp-3">
                  {doc.description.trim()}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {doc.type === "LINK" ? (
                <a
                  href={doc.externalUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "h-9 w-full justify-center sm:w-auto sm:min-w-[7.5rem] touch-manipulation"
                  )}
                >
                  Open link
                </a>
              ) : (
                <a
                  href={`/api/documents/${doc.id}?download=1`}
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "h-9 w-full justify-center sm:w-auto sm:min-w-[7.5rem] touch-manipulation"
                  )}
                >
                  Download
                </a>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <span className="text-xs font-medium text-muted-foreground sm:mr-1">Share</span>
                <div className="flex flex-wrap items-center gap-2">
                  <CopyDocumentLinkButton url={pageUrl || `/documents/${doc.id}`} />
                  <a
                    href={mailto || "#"}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "h-9 inline-flex",
                      !mailto && "pointer-events-none opacity-40"
                    )}
                    aria-disabled={!mailto}
                    onClick={(e) => {
                      if (!mailto) e.preventDefault();
                    }}
                  >
                    Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {open && hasDetails ? (
        <div
          id={`doc-details-${doc.id}`}
          role="region"
          aria-labelledby={`doc-expand-${doc.id}`}
          className="border-t border-border/40 bg-muted/25 px-3 py-3 sm:px-4 sm:pl-[4.25rem]"
        >
          <div className="space-y-3 text-sm">
            {doc.description?.trim() ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Full description</p>
                <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{doc.description.trim()}</p>
              </div>
            ) : null}
            {tags.length > 0 ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {doc.team?.name ? (
                <>
                  Team: {doc.team.name}
                  {" · "}
                </>
              ) : null}
              <Link href={`/documents/${doc.id}`} className="text-primary underline">
                Open full page
              </Link>
            </p>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export default function PublicDocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");

  const filterKey = useMemo(
    () => `${q.trim()}\t${category}\t${tag.trim()}`,
    [q, category, tag]
  );

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const listQs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("public", "1");
    p.set("page", String(page));
    p.set("pageSize", String(PAGE_SIZE));
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    if (tag.trim()) p.set("tag", tag.trim());
    return p.toString();
  }, [q, category, tag, page]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const [dRes, cRes, tRes] = await Promise.all([
          fetch(`/api/documents?${listQs}`),
          fetch("/api/documents/categories?public=1"),
          fetch("/api/documents/tags?public=1"),
        ]);
        if (cancelled) return;
        if (dRes.ok) {
          const data: ListResponse | DocumentRow[] = await dRes.json();
          if (Array.isArray(data)) {
            setDocs(data);
            setTotal(data.length);
          } else {
            setDocs(data.items);
            setTotal(data.total);
          }
        }
        if (cRes.ok) setCategories(await cRes.json());
        if (tRes.ok) setTags(await tRes.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [listQs]);

  const categoryOptions = useMemo(
    () => categories.filter((c) => c !== DOCUMENT_FILTER_ANY),
    [categories]
  );
  const tagOptions = useMemo(() => tags.filter((t) => t !== DOCUMENT_FILTER_ANY), [tags]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-h-dvh bg-background px-3 py-6 sm:px-4 sm:py-10 pb-20 md:pb-0">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-3">
          <PublicNav />
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Documents &amp; Resources</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Public club documents and resources.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 rounded-xl pl-9 text-base sm:text-sm"
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              enterKeyHint="search"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              value={category || DOCUMENT_FILTER_ANY}
              onValueChange={(v) => setCategory(v === DOCUMENT_FILTER_ANY ? "" : (v ?? ""))}
            >
              <SelectTrigger className="h-11 w-full rounded-xl">
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
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DOCUMENT_FILTER_ANY}>All tags</SelectItem>
                {tagOptions.map((tg) => (
                  <SelectItem key={tg} value={tg}>
                    {tg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!loading && total > 0 ? (
          <p className="text-xs text-muted-foreground">
            Showing {from}–{to} of {total}
          </p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="size-9 animate-spin sm:size-10" />
          </div>
        ) : docs.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No public documents yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <ul className="m-0 list-none p-0">
              {docs.map((d) => (
                <DocumentListRow key={d.id} doc={d} />
              ))}
            </ul>
          </div>
        )}

        {!loading && total > PAGE_SIZE ? (
          <nav
            className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Pagination"
          >
            <p className="text-center text-xs text-muted-foreground sm:text-left">
              Page {page} of {totalPages}
            </p>
            <div className="flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 min-w-[5.5rem] touch-manipulation"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4 sm:mr-1" />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 min-w-[5.5rem] touch-manipulation"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="size-4 sm:ml-1" />
              </Button>
            </div>
          </nav>
        ) : null}

        <PublicFooter />
      </div>
    </div>
  );
}
