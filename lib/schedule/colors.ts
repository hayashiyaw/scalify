export type MemberColors = {
  background: string;
  foreground: string;
};

export type MemberColorMode = "normal" | "colorblind";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Fixed palettes of strongly separated colors. These are intentionally
// discrete (no continuous hue wheel) so even when ids hash close together,
// the assigned colors remain clearly distinct.
const NORMAL_PALETTE: MemberColors[] = [
  { background: "oklch(0.93 0.14 25)", foreground: "oklch(0.3 0.12 25)" }, // orange
  { background: "oklch(0.93 0.14 60)", foreground: "oklch(0.3 0.11 60)" }, // yellow
  { background: "oklch(0.93 0.12 130)", foreground: "oklch(0.3 0.09 130)" }, // green
  { background: "oklch(0.93 0.13 200)", foreground: "oklch(0.3 0.1 200)" }, // cyan
  { background: "oklch(0.93 0.14 250)", foreground: "oklch(0.3 0.11 250)" }, // blue
  { background: "oklch(0.93 0.14 300)", foreground: "oklch(0.3 0.11 300)" }, // purple
  { background: "oklch(0.93 0.13 340)", foreground: "oklch(0.3 0.11 340)" }, // magenta
  { background: "oklch(0.93 0.12 10)", foreground: "oklch(0.3 0.1 10)" }, // red
  { background: "oklch(0.9 0.14 40)", foreground: "oklch(0.27 0.12 40)" }, // deeper orange
  { background: "oklch(0.9 0.14 90)", foreground: "oklch(0.27 0.12 90)" }, // deeper yellow-green
  { background: "oklch(0.9 0.14 160)", foreground: "oklch(0.27 0.11 160)" }, // teal-green
  { background: "oklch(0.9 0.14 220)", foreground: "oklch(0.27 0.11 220)" }, // teal-blue
  { background: "oklch(0.9 0.14 270)", foreground: "oklch(0.27 0.11 270)" }, // indigo
  { background: "oklch(0.9 0.14 310)", foreground: "oklch(0.27 0.11 310)" }, // deep purple
  { background: "oklch(0.9 0.13 350)", foreground: "oklch(0.27 0.11 350)" }, // deep magenta
  { background: "oklch(0.9 0.13 5)", foreground: "oklch(0.27 0.11 5)" }, // deep red
];

const COLORBLIND_PALETTE: MemberColors[] = [
  // Okabe–Ito-inspired, tuned for this UI
  { background: "oklch(0.92 0.15 80)", foreground: "oklch(0.32 0.12 80)" }, // bluish
  { background: "oklch(0.92 0.15 20)", foreground: "oklch(0.32 0.12 20)" }, // orange
  { background: "oklch(0.92 0.15 120)", foreground: "oklch(0.32 0.12 120)" }, // green
  { background: "oklch(0.92 0.15 200)", foreground: "oklch(0.32 0.12 200)" }, // sky blue
  { background: "oklch(0.92 0.15 260)", foreground: "oklch(0.32 0.12 260)" }, // blue
  { background: "oklch(0.92 0.15 320)", foreground: "oklch(0.32 0.12 320)" }, // purple
  { background: "oklch(0.9 0.16 50)", foreground: "oklch(0.3 0.13 50)" }, // yellow-orange
  { background: "oklch(0.9 0.16 140)", foreground: "oklch(0.3 0.13 140)" }, // yellow-green
  { background: "oklch(0.9 0.16 210)", foreground: "oklch(0.3 0.13 210)" }, // teal
  { background: "oklch(0.9 0.16 280)", foreground: "oklch(0.3 0.13 280)" }, // violet
  { background: "oklch(0.9 0.16 340)", foreground: "oklch(0.3 0.13 340)" }, // magenta-red
  { background: "oklch(0.9 0.16 10)", foreground: "oklch(0.3 0.13 10)" }, // red
];

/**
 * Distinct, readable HSL backgrounds per member; foreground is dark or light text.
 */
export function getMemberColors(
  memberId: string,
  mode: MemberColorMode = "normal",
): MemberColors {
  const h = hashString(memberId);

  if (mode === "colorblind") {
    const idx = h % COLORBLIND_PALETTE.length;
    return COLORBLIND_PALETTE[idx]!;
  }

  // Normal mode: choose from a fixed palette of high-contrast colors. This
  // guarantees discrete, visually separated colors instead of relying on
  // small hue differences.
  const idx = h % NORMAL_PALETTE.length;
  return NORMAL_PALETTE[idx]!;
}
