// Light shades: white text on top passes WCAG AA (≥ 4.5:1).
// Dark shades: lighter, with dark text on top, so buttons don't glow on a dark screen.
export const PALETTE = {
  indigo: { label: "Indigo", light: "#4F46E5", dark: "#818CF8" },
  teal: { label: "Teal", light: "#0F766E", dark: "#2DD4BF" },
  rose: { label: "Rose", light: "#E11D48", dark: "#FB7185" },
  amber: { label: "Amber", light: "#B45309", dark: "#FBBF24" },
  violet: { label: "Violet", light: "#7C3AED", dark: "#A78BFA" },
  green: { label: "Green", light: "#15803D", dark: "#4ADE80" },
  orange: { label: "Orange", light: "#C2410C", dark: "#FB923C" },
  slate: { label: "Slate", light: "#334155", dark: "#94A3B8" },
} as const;

export type AccentKey = keyof typeof PALETTE;
export const ACCENT_KEYS = Object.keys(PALETTE) as AccentKey[];
export const DEFAULT_ACCENT: AccentKey = "indigo";

export const NEUTRALS = {
  light: {
    background: "#FFFFFF",
    surface: "#F4F4F5",
    text: "#18181B",
    textMuted: "#71717A",
    border: "#E4E4E7",
    danger: "#DC2626",
  },
  dark: {
    background: "#0B0B0F",
    surface: "#18181B",
    text: "#FAFAFA",
    textMuted: "#A1A1AA",
    border: "#27272A",
    danger: "#F87171",
  },
} as const;

export function isAccentKey(
  value: string | null | undefined,
): value is AccentKey {
  return !!value && value in PALETTE;
}
