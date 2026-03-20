"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface FacilityOptionFacility {
  id: string;
  name: string;
  subFacilities: { id: string; name: string }[];
}

interface FacilityFilterComboboxProps {
  facilities: FacilityOptionFacility[];
  /** Selected sub-facility id, or "" for all */
  value: string;
  onValueChange: (subFacilityId: string) => void;
  /** Match main schedule mobile filter row */
  size?: "default" | "sm";
  className?: string;
  triggerClassName?: string;
}

/**
 * Searchable facility / sub-facility filter. Popover is wider than the trigger so full labels stay visible.
 */
export function FacilityFilterCombobox({
  facilities,
  value,
  onValueChange,
  size = "default",
  className,
  triggerClassName,
}: FacilityFilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [menuKey, setMenuKey] = useState(0);

  const options = useMemo(() => {
    const out: { id: string; label: string; keywords: string }[] = [
      { id: "__all__", label: "All Facilities", keywords: "all facilities every" },
    ];
    for (const f of facilities) {
      for (const sf of f.subFacilities) {
        const label = `${f.name} – ${sf.name}`;
        out.push({
          id: sf.id,
          label,
          keywords: `${f.name} ${sf.name} ${label}`.toLowerCase(),
        });
      }
    }
    return out;
  }, [facilities]);

  const selected =
    options.find((o) => (value ? o.id === value : o.id === "__all__")) ?? options[0];

  return (
    <div className={cn("min-w-0", className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setMenuKey((k) => k + 1);
        }}
      >
        <PopoverTrigger
          className={cn(
            "flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-background px-2.5 text-sm font-medium outline-none transition-colors",
            "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "dark:bg-input/30 dark:hover:bg-input/50",
            size === "sm" ? "h-9 text-xs" : "h-8",
            triggerClassName
          )}
          aria-expanded={open}
        >
          <span className="truncate text-left font-normal" title={selected.label}>
            {selected.label}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 w-[min(100vw-1rem,28rem)] sm:min-w-80 sm:w-auto"
        sideOffset={4}
      >
        <Command key={menuKey}>
          <CommandInput placeholder="Search facilities…" className="h-9" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.label} ${o.keywords}`}
                  onSelect={() => {
                    onValueChange(o.id === "__all__" ? "" : o.id);
                    setOpen(false);
                  }}
                  className="items-start gap-2 py-2"
                >
                  <span className="min-w-0 flex-1 whitespace-normal break-words text-left leading-snug">
                    {o.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
  );
}
