"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

function absoluteUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${window.location.origin}${path}`;
}

export function CopyDocumentLinkButton({ url }: { url: string }) {
  const [label, setLabel] = useState("Copy link");

  async function copy() {
    const text = absoluteUrl(url);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setLabel("Copied");
      setTimeout(() => setLabel("Copy link"), 2000);
    } catch {
      setLabel("Copy failed");
      setTimeout(() => setLabel("Copy link"), 2000);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" className="h-9" onClick={copy} disabled={!url}>
      {label}
    </Button>
  );
}
