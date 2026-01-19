export const DECLINE_REASONS = [
  { value: "OUT_OF_DELIVERY_RANGE", label: "Out of delivery range" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "TOO_BUSY", label: "Too busy / insufficient staffing" },
  { value: "WEATHER_ISSUE", label: "Weather or delivery conditions" },
  { value: "OTHER", label: "Other (add note)" },
] as const;

export type DeclineReason =
  (typeof DECLINE_REASONS)[number]["value"];
