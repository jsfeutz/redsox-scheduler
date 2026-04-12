"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function BrandingIconSetting({
  brandingIconVersion,
}: {
  brandingIconVersion: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [version, setVersion] = useState(brandingIconVersion);

  useEffect(() => {
    setVersion(brandingIconVersion);
  }, [brandingIconVersion]);

  const previewSrc =
    version > 0 ? `/api/branding/icons/192?v=${version}` : null;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/organization/branding/icon", {
        method: "POST",
        body: fd,
      });
      const raw = await res.text();
      let data: { error?: string; brandingIconVersion?: number } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }
      if (!res.ok) {
        toast.error(
          data.error ||
            (res.status === 413
              ? "File too large for the server (try under 5 MB)."
              : raw.slice(0, 120) || `Upload failed (${res.status})`)
        );
        return;
      }
      if (typeof data.brandingIconVersion === "number") {
        setVersion(data.brandingIconVersion);
      }
      toast.success("App icon updated — used for PWA, favicon, and headers.");
      router.refresh();
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onRemove() {
    setRemoving(true);
    try {
      const res = await fetch("/api/organization/branding/icon", {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error || "Could not remove icon");
        return;
      }
      setVersion(0);
      toast.message("Custom icon removed — defaults restored.");
      router.refresh();
    } catch {
      toast.error("Could not remove icon");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
            <ImageUp className="h-5 w-5 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">App &amp; browser icon</CardTitle>
            <CardDescription className="text-xs">
              Square image works best (PNG, JPEG, or WebP, max 5 MB). We generate
              PWA install icons, the tab favicon, and the header mark. Transparency
              is kept where your file supports it.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-5">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt=""
              width={192}
              height={192}
              className="h-40 w-40 sm:h-44 sm:w-44 shrink-0 object-contain rounded-xl"
            />
          ) : (
            <div className="flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/30 shrink-0">
              <span className="text-xs text-muted-foreground text-center px-3">
                Default icons
              </span>
            </div>
          )}
          <div className="space-y-2 min-w-[200px]">
            <Label className="text-sm font-medium">Upload</Label>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onFile}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <ImageUp className="h-4 w-4 mr-2" />
                    Choose image
                  </>
                )}
              </Button>
              {version > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl text-destructive hover:text-destructive"
                  disabled={removing}
                  onClick={onRemove}
                >
                  {removing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          After changing the icon, ask users to reinstall or refresh the PWA if the
          old icon is cached.
        </p>
      </CardContent>
    </Card>
  );
}
