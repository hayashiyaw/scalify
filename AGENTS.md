# Agent notes — Scalify

Use this file with `CLAUDE.md` (which points here) and any other agent rules for this repo.

## Product context

- **Scalify** is a single-page scheduling tool: date range + holiday country + team (names + unavailable dates) → **Calculate shifts** → calendar, per-person report, optional CSV.
- **Business rules** live in `lib/schedule/assign.ts` (pools A/B, fairness ordering, warnings). **Do not** duplicate that logic in the client; keep one source of truth and call `calculateSchedule` from `app/actions/schedule.ts`.
- **Validation**: `scheduleInputSchema` and related Zod types in `lib/schedule/types.ts`. Server action already returns flattened errors; extend schemas there if inputs change.

## Code map

| Area | Location |
| ---- | -------- |
| Main UI | `app/page.tsx` |
| Server entry for schedule | `app/actions/schedule.ts` |
| Assignment algorithm & warnings | `lib/schedule/assign.ts` |
| ISO dates / weekends | `lib/schedule/dates.ts` |
| Public holidays by country | `lib/schedule/holidays.ts` |
| CSV export helpers | `lib/schedule/csv.ts` |
| Deterministic member display order | `lib/schedule/deterministic-shuffle.ts` |
| Schedule UI blocks | `components/schedule/*` |
| Shared primitives | `components/ui/*` |

## Conventions

- Match existing patterns: `"use client"` only where needed; server action stays `"use server"` in `app/actions/schedule.ts`.
- Prefer extending `lib/schedule/types.ts` and reusing Zod schemas over ad-hoc validation.
- After UI or logic changes that affect output, consider `ExportCsvButton` / `lib/schedule/csv.ts` and `ReportDashboard` / `ScheduleCalendar` together so exports and views stay aligned.
- Avoid drive-by refactors outside the task; keep diffs focused.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
