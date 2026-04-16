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

const COLORBLIND_PALETTE: MemberColors[] = [
  // Okabe-Ito inspired, adjusted for this UI
  { background: "oklch(0.92 0.15 60)", foreground: "oklch(0.32 0.12 60)" }, // yellow
  { background: "oklch(0.9 0.11 150)", foreground: "oklch(0.3 0.09 150)" }, // bluish green
  { background: "oklch(0.9 0.12 30)", foreground: "oklch(0.3 0.1 30)" }, // orange
  { background: "oklch(0.9 0.14 270)", foreground: "oklch(0.3 0.11 270)" }, // blue
  { background: "oklch(0.9 0.13 330)", foreground: "oklch(0.3 0.11 330)" }, // reddish purple
  { background: "oklch(0.9 0.12 200)", foreground: "oklch(0.3 0.09 200)" }, // sky blue
  { background: "oklch(0.9 0.11 110)", foreground: "oklch(0.3 0.09 110)" }, // green
  { background: "oklch(0.9 0.12 15)", foreground: "oklch(0.3 0.1 15)" }, // vermillion
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

  // Normal mode: spread hues around the wheel in discrete steps for clearer
  // separation, with a light background and dark foreground.
  const hue = (h % 12) * 30; // 12 distinct buckets around the wheel
  const background = `hsl(${hue} 70% 88%)`;
  const foreground = `hsl(${hue} 55% 22%)`;
  return { background, foreground };
}
