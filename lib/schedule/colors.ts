export type MemberColors = {
  background: string;
  foreground: string;
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Distinct, readable HSL backgrounds per member; foreground is dark or light text.
 */
export function getMemberColors(memberId: string): MemberColors {
  const hue = hashString(memberId) % 360;
  const background = `hsl(${hue} 55% 88%)`;
  const foreground = `hsl(${hue} 45% 22%)`;
  return { background, foreground };
}
