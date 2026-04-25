import { describe, expect, it } from "vitest";

import {
  clearMemberSnapshots,
  DEFAULT_MEMBER_SNAPSHOT_MAX_DEPTH,
  memberSnapshotDepth,
  popMemberSnapshot,
  pushMemberSnapshot,
} from "@/lib/schedule/member-snapshot-stack";

type Row = { id: string; name: string; unavailableDates: string[] };

function row(id: string, name: string): Row {
  return { id, name, unavailableDates: [] };
}

describe("memberSnapshotStack", () => {
  it("pushes and pops in LIFO order", () => {
    let stack = clearMemberSnapshots<Row>();
    stack = pushMemberSnapshot(stack, [row("1", "A"), row("2", "B")]);
    stack = pushMemberSnapshot(stack, [row("1", "X")]);
    expect(memberSnapshotDepth(stack)).toBe(2);

    const first = popMemberSnapshot(stack);
    expect(first.restored).toEqual([row("1", "X")]);
    stack = first.stack;

    const second = popMemberSnapshot(stack);
    expect(second.restored).toEqual([
      { id: "1", name: "A", unavailableDates: [] },
      { id: "2", name: "B", unavailableDates: [] },
    ]);
    stack = second.stack;

    const third = popMemberSnapshot(stack);
    expect(third.restored).toBeNull();
    expect(third.stack).toEqual([]);
  });

  it("drops oldest snapshots when depth exceeds maxDepth", () => {
    const max = 3;
    let stack = clearMemberSnapshots<Row>();
    for (let i = 0; i < 5; i += 1) {
      stack = pushMemberSnapshot(stack, [row("a", `snap-${i}`)], max);
    }
    expect(memberSnapshotDepth(stack)).toBe(max);

    // Oldest dropped: stack holds snap-2, snap-3, snap-4
    let popped = popMemberSnapshot(stack);
    expect(popped.restored).toEqual([row("a", "snap-4")]);
    stack = popped.stack;

    popped = popMemberSnapshot(stack);
    expect(popped.restored).toEqual([row("a", "snap-3")]);
    stack = popped.stack;

    popped = popMemberSnapshot(stack);
    expect(popped.restored).toEqual([row("a", "snap-2")]);
    stack = popped.stack;

    expect(popMemberSnapshot(stack).restored).toBeNull();
  });

  it("uses DEFAULT_MEMBER_SNAPSHOT_MAX_DEPTH when maxDepth omitted", () => {
    let stack = clearMemberSnapshots<Row[]>();
    for (let i = 0; i < DEFAULT_MEMBER_SNAPSHOT_MAX_DEPTH + 3; i += 1) {
      stack = pushMemberSnapshot(stack, [row("x", `n${i}`)]);
    }
    expect(memberSnapshotDepth(stack)).toBe(DEFAULT_MEMBER_SNAPSHOT_MAX_DEPTH);
  });

  it("pop on empty stack is a no-op", () => {
    const stack = clearMemberSnapshots<Row>();
    const out = popMemberSnapshot(stack);
    expect(out.restored).toBeNull();
    expect(out.stack).toEqual([]);
  });

  it("isolates snapshots from later in-place edits to the source array", () => {
    const live: Row[] = [row("1", "A")];
    const stack = pushMemberSnapshot(clearMemberSnapshots<Row>(), live);
    live[0] = { ...live[0], name: "Mutated" };

    const popped = popMemberSnapshot(stack);
    expect(popped.restored).toEqual([row("1", "A")]);
  });

  it("isolates restored members from the stack (mutate restore does not affect next pop)", () => {
    let stack = clearMemberSnapshots<Row>();
    stack = pushMemberSnapshot(stack, [row("1", "A")]);
    stack = pushMemberSnapshot(stack, [row("1", "B")]);

    const outer = popMemberSnapshot(stack);
    expect(outer.restored?.[0].name).toBe("B");
    outer.restored![0].name = "Hacked";
    stack = outer.stack;

    const inner = popMemberSnapshot(stack);
    expect(inner.restored?.[0].name).toBe("A");
  });

  it("deep-copies unavailableDates arrays per row", () => {
    const live: Row[] = [{ id: "1", name: "A", unavailableDates: ["2026-05-01"] }];
    const stack = pushMemberSnapshot(clearMemberSnapshots<Row>(), live);
    live[0].unavailableDates.push("2026-05-02");

    const popped = popMemberSnapshot(stack);
    expect(popped.restored).toEqual([
      { id: "1", name: "A", unavailableDates: ["2026-05-01"] },
    ]);
  });
});
