export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, Link2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { findDocumentVisible, parseTags } from "@/lib/documents-access";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PublicFooter } from "@/components/public-footer";
import { CopyDocumentLinkButton } from "@/components/documents/copy-document-link-button";

type Props = { params: Promise<{ id: string }> };

export default async function DocumentDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  const doc = await findDocumentVisible(id, user);

  if (!doc) {
    const stub = await prisma.document.findUnique({
      where: { id },
      select: { visibility: true },
    });
    if (stub?.visibility === "MEMBERS_ONLY") {
      const path = `/documents/${id}`;
      redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
    }
    notFound();
  }

  const base =
    process.env.NEXTAUTH_URL ||
    process.env.APP_URL ||
    "";
  const shareUrl = base ? `${base.replace(/\/$/, "")}/documents/${doc.id}` : `/documents/${doc.id}`;
  const subject = encodeURIComponent(doc.title);
  const body = encodeURIComponent(`${doc.title}\n\n${shareUrl}`);

  return (
    <div className="min-h-dvh bg-background px-3 py-6 sm:px-4 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/documents" className="text-sm text-muted-foreground hover:text-primary">
          ← All documents
        </Link>

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
          <div className="divide-y divide-border/60">
            <div className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
              {doc.type === "LINK" ? (
                <Link2 className="size-6 shrink-0 text-blue-500 sm:size-7" aria-hidden />
              ) : (
                <FileText className="size-6 shrink-0 text-muted-foreground sm:size-7" aria-hidden />
              )}
              <div className="min-w-0 flex-1 space-y-2">
                {doc.category?.trim() ? (
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {doc.category.trim()}
                  </p>
                ) : null}
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{doc.title}</h1>
                <div className="flex flex-wrap gap-1.5">
                  {doc.visibility === "PUBLIC" ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Members only
                    </Badge>
                  )}
                  {doc.team?.name ? (
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {doc.team.name}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            {doc.description?.trim() ? (
              <div className="px-4 py-4 sm:px-5">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {doc.description.trim()}
                </p>
              </div>
            ) : null}

            {parseTags(doc.tags).length > 0 ? (
              <div className="px-4 py-4 sm:px-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {parseTags(doc.tags).map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
              {doc.type === "LINK" ? (
                <a
                  href={doc.externalUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}
                >
                  Open link
                </a>
              ) : (
                <a
                  href={`/api/documents/${doc.id}?download=1`}
                  className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}
                >
                  Download file
                </a>
              )}
            </div>

            <div className="space-y-3 bg-muted/20 px-4 py-4 sm:px-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Share</p>
              <div className="flex flex-wrap items-center gap-2">
                <CopyDocumentLinkButton url={shareUrl} />
                <a
                  href={`mailto:?subject=${subject}&body=${body}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 inline-flex")}
                >
                  Email
                </a>
              </div>
              <p className="break-all font-mono text-xs text-muted-foreground">{shareUrl}</p>
            </div>
          </div>
        </div>

        <PublicFooter />
      </div>
    </div>
  );
}
