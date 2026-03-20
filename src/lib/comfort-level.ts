/** Stored on JobAssignment.comfortLevel when template has askComfortLevel */
export const COMFORT_LEVEL_VALUES = [
  "new_family",
  "comfortable_with_help",
  "very_comfortable_independent",
] as const;

export type ComfortLevelValue = (typeof COMFORT_LEVEL_VALUES)[number];

export const COMFORT_LEVEL_OPTIONS: { value: ComfortLevelValue; label: string }[] = [
  { value: "new_family", label: "New family" },
  { value: "comfortable_with_help", label: "Comfortable with some help needed" },
  {
    value: "very_comfortable_independent",
    label: "Very comfortable — can set up without help",
  },
];

export function comfortLevelLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return COMFORT_LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function isValidComfortLevel(value: unknown): value is ComfortLevelValue {
  return typeof value === "string" && COMFORT_LEVEL_VALUES.includes(value as ComfortLevelValue);
}
