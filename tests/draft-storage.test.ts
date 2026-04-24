import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearScheduleDraft,
  loadScheduleDraft,
  saveScheduleDraft,
} from "@/lib/schedule/draft-storage";

class LocalStorageMock {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function installLocalStorageMock(): LocalStorageMock {
  const localStorage = new LocalStorageMock();
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("schedule draft local persistence", () => {
  it("saves and restores anonymous draft state", () => {
    installLocalStorageMock();

    saveScheduleDraft({
      startDate: "2026-04-01",
      endDate: "2026-04-15",
      holidayCountry: "BR",
      members: [
        { id: "m1", name: "Ana", unavailableDates: ["2026-04-05"] },
        { id: "m2", name: "Bruno", unavailableDates: [] },
      ],
      colorblindMode: true,
    });

    expect(loadScheduleDraft()).toEqual({
      startDate: "2026-04-01",
      endDate: "2026-04-15",
      holidayCountry: "BR",
      members: [
        { id: "m1", name: "Ana", unavailableDates: ["2026-04-05"] },
        { id: "m2", name: "Bruno", unavailableDates: [] },
      ],
      colorblindMode: true,
    });
  });

  it("saves and restores a one-member draft", () => {
    installLocalStorageMock();

    saveScheduleDraft({
      startDate: "2026-04-01",
      endDate: "2026-04-15",
      holidayCountry: "US",
      members: [{ id: "solo", name: "Jordan", unavailableDates: [] }],
      colorblindMode: false,
    });

    expect(loadScheduleDraft()).toEqual({
      startDate: "2026-04-01",
      endDate: "2026-04-15",
      holidayCountry: "US",
      members: [{ id: "solo", name: "Jordan", unavailableDates: [] }],
      colorblindMode: false,
    });
  });

  it("saves and restores an empty-member draft", () => {
    installLocalStorageMock();

    saveScheduleDraft({
      startDate: "2026-05-01",
      endDate: "2026-05-07",
      holidayCountry: "PT",
      members: [],
      colorblindMode: false,
    });

    expect(loadScheduleDraft()).toEqual({
      startDate: "2026-05-01",
      endDate: "2026-05-07",
      holidayCountry: "PT",
      members: [],
      colorblindMode: false,
    });
  });

  it("restores null when persisted data is invalid", () => {
    const localStorage = installLocalStorageMock();
    localStorage.setItem(
      "scalify:schedule-draft:v1",
      JSON.stringify({ startDate: "nope" }),
    );

    expect(loadScheduleDraft()).toBeNull();
  });

  it("clears persisted draft state explicitly", () => {
    installLocalStorageMock();
    saveScheduleDraft({
      startDate: "2026-04-01",
      endDate: "2026-04-15",
      holidayCountry: "US",
      members: [
        { id: "m1", name: "Ana", unavailableDates: [] },
        { id: "m2", name: "Bruno", unavailableDates: [] },
      ],
      colorblindMode: false,
    });

    clearScheduleDraft();
    expect(loadScheduleDraft()).toBeNull();
  });
});

