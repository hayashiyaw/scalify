/**
 * In-memory stack of member-array snapshots for roster import undo (no React).
 * Each snapshot is deep-cloned on push and on pop so callers can mutate results safely.
 */

export const DEFAULT_MEMBER_SNAPSHOT_MAX_DEPTH = 10;

function deepCloneSnapshot<T>(members: readonly T[]): T[] {
  return structuredClone(members) as T[];
}

/**
 * Push a snapshot of `membersBeforeReplace` (typically the current roster immediately before import).
 * When depth would exceed `maxDepth`, the oldest snapshots are dropped.
 */
export function pushMemberSnapshot<T>(
  stack: readonly T[][],
  membersBeforeReplace: readonly T[],
  maxDepth: number = DEFAULT_MEMBER_SNAPSHOT_MAX_DEPTH,
): T[][] {
  const snapshot = deepCloneSnapshot(membersBeforeReplace);
  const extended = [...stack, snapshot];
  if (extended.length > maxDepth) {
    return extended.slice(-maxDepth);
  }
  return extended;
}

/**
 * Pop the newest snapshot and return a deep copy to restore as current members.
 * If the stack is empty, returns `restored: null` and the same stack reference content (empty).
 */
export function popMemberSnapshot<T>(stack: readonly T[][]): {
  stack: T[][];
  restored: T[] | null;
} {
  if (stack.length === 0) {
    return { stack: [], restored: null };
  }
  const top = stack[stack.length - 1]!;
  const nextStack = stack.slice(0, -1);
  return { stack: [...nextStack], restored: deepCloneSnapshot(top) };
}

export function clearMemberSnapshots<T>(): T[][] {
  return [];
}

export function memberSnapshotDepth<T>(stack: readonly T[][]): number {
  return stack.length;
}
