import { z } from "zod";

import { holidayCountrySchema, scheduleMemberSchema } from "./types";

const DRAFT_STORAGE_KEY = "scalify:schedule-draft:v1";

const scheduleDraftSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  holidayCountry: holidayCountrySchema,
  members: z.array(scheduleMemberSchema).min(2),
  colorblindMode: z.boolean().default(false),
});

export type ScheduleDraft = z.infer<typeof scheduleDraftSchema>;

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadScheduleDraft(): ScheduleDraft | null {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = scheduleDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveScheduleDraft(draft: ScheduleDraft): void {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Best effort only. Ignore write failures (e.g. private mode quota restrictions).
  }
}

export function clearScheduleDraft(): void {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Best effort only.
  }
}

