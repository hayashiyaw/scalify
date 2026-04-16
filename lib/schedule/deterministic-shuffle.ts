/**
 * Deterministic shuffle for a shift cycle so tie-breaks do not follow form order.
 * Same startDate + endDate + set of member ids always yields the same order.
 */

export function hashStringToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let a = (seed += 0x6d2b79f5);
    a = Math.imul(a ^ (a >>> 15), a | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeterministic<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  const rng = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Scrambled member ids for scheduling and UI table order (not form order). */
export function memberOrderForCycle(
  startDate: string,
  endDate: string,
  memberIds: string[],
): string[] {
  const sortedIds = [...memberIds].sort((a, b) => a.localeCompare(b));
  const seedStr = `${startDate}|${endDate}|${sortedIds.join(",")}`;
  const seed = hashStringToSeed(seedStr);
  return shuffleDeterministic(sortedIds, seed);
}
