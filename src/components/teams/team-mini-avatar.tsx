import { cn } from "@/lib/utils";

export function TeamMiniAvatar({
  name,
  color,
  icon,
  size = "md",
  className,
}: {
  name: string;
  color: string;
  icon?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .split(/\s|-/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sizeCls =
    size === "sm"
      ? "h-5 w-5 min-h-5 min-w-5 rounded text-[9px]"
      : size === "lg"
        ? "h-9 w-9 min-h-9 min-w-9 rounded-lg text-xl"
        : "h-7 w-7 min-h-7 min-w-7 rounded-md text-base";
  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 font-bold text-white leading-none shadow-sm",
        sizeCls,
        className
      )}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {icon ? (
        <span className="select-none leading-none">{icon}</span>
      ) : (
        <span className="leading-tight tracking-tighter">{initials}</span>
      )}
    </div>
  );
}
