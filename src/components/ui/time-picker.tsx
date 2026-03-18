"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = ["00", "15", "30", "45"];

function parse24(time: string): { hour: number; minute: string; period: "AM" | "PM" } | null {
  if (!time) return null;
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour: h, minute: m, period };
}

function to24(hour: number, minute: string, period: "AM" | "PM"): string {
  let h = hour;
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h += 12;
  return `${h.toString().padStart(2, "0")}:${minute}`;
}

function formatDisplay(time: string): string {
  const parsed = parse24(time);
  if (!parsed) return "";
  return `${parsed.hour}:${parsed.minute} ${parsed.period}`;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  disabled,
  className,
  id,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = value ? parse24(value) : null;
  const [selectedHour, setSelectedHour] = React.useState(parsed?.hour ?? 9);
  const [selectedMinute, setSelectedMinute] = React.useState(parsed?.minute ?? "00");
  const [selectedPeriod, setSelectedPeriod] = React.useState<"AM" | "PM">(parsed?.period ?? "AM");

  React.useEffect(() => {
    if (value) {
      const p = parse24(value);
      if (p) {
        setSelectedHour(p.hour);
        setSelectedMinute(p.minute);
        setSelectedPeriod(p.period);
      }
    }
  }, [value]);

  function handleConfirm() {
    onChange?.(to24(selectedHour, selectedMinute, selectedPeriod));
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <Clock className="mr-2 h-4 w-4" />
        {value ? formatDisplay(value) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Hour
            </p>
            <div className="grid grid-cols-3 gap-1 max-h-[180px] overflow-y-auto">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setSelectedHour(h)}
                  className={cn(
                    "h-8 w-10 rounded-lg text-sm font-medium transition-colors",
                    selectedHour === h
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Min
            </p>
            <div className="grid gap-1">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMinute(m)}
                  className={cn(
                    "h-8 w-12 rounded-lg text-sm font-medium transition-colors",
                    selectedMinute === m
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  :{m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              &nbsp;
            </p>
            <div className="grid gap-1">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPeriod(p)}
                  className={cn(
                    "h-8 w-12 rounded-lg text-sm font-medium transition-colors",
                    selectedPeriod === p
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
          <p className="text-sm font-medium">
            {selectedHour}:{selectedMinute} {selectedPeriod}
          </p>
          <Button size="sm" onClick={handleConfirm}>
            Set Time
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
