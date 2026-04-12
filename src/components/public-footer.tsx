import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mt-10 space-y-3 text-center">
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
        <span className="text-border">·</span>
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        <span className="text-border">·</span>
        <Link href="/sms-consent" className="hover:underline">
          SMS Consent
        </Link>
        <span className="text-border">·</span>
        <Link href="/install" className="hover:underline">
          Install app
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        Rubicon Redsox Baseball Club
      </p>
    </footer>
  );
}
