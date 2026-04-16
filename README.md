# Scalify

Web app for **balancing weekday and weekend or holiday shifts** across a team. You set a date range, pick a country for public holidays, enter team members with optional unavailable dates, and get a fair assignment with a calendar view, summary report, and CSV export.

## Features

- **Date range** — Schedule across any contiguous range; end date must be on or after the start date.
- **Holidays** — Public holidays for **US**, **PT**, or **BR** (via `date-holidays`) combine with weekends to define “heavy” shift days.
- **Shift pools** — Weekdays (non-holiday) use pool **A** (12 hours). Weekends and public holidays use pool **B** (24 hours). Assignment logic balances load within each pool and across calendar months where possible.
- **Availability** — Per-person blocked dates; if everyone is blocked on a day, that day surfaces as a **warning** for manual follow-up.
- **Export** — Download the schedule as CSV when you have a calculated result.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- Validation: [Zod](https://zod.dev)
- UI: [Base UI](https://base-ui.com/react/overview/quick-start)–style primitives under `components/ui/`, Lucide icons, `next-themes` for light/dark

## Getting started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Edit the main screen in `app/page.tsx`; schedule calculation runs through the server action in `app/actions/schedule.ts`.

### Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Development server       |
| `npm run build`| Production build         |
| `npm run start`| Start production server  |
| `npm run lint` | ESLint                   |

## Project layout (high level)

| Path | Role |
| ---- | ---- |
| `app/page.tsx` | Main UI: range, holidays, team, calculate, results |
| `app/actions/schedule.ts` | Server action: validates input, runs `assignShifts` |
| `lib/schedule/` | Types/schemas, assignment (`assign.ts`), dates, holidays, CSV, shuffle order |
| `components/schedule/` | Calendar, report, team/date/holiday sections, CSV button |
| `components/ui/` | Shared UI primitives |
| `components/theme-*.tsx` | Theme provider and selector |

Core types and the request schema live in `lib/schedule/types.ts` (`scheduleInputSchema`, `ScheduleResult`, etc.).

## Next.js in this repo

This project tracks a **current** Next.js major release. APIs and conventions can differ from older tutorials. When changing routing, data fetching, or config, prefer the docs that ship with your installed version (see `node_modules/next/dist/docs/` locally or the [Next.js documentation](https://nextjs.org/docs) for your version).

## Deploy

A typical deployment is [Vercel](https://vercel.com) or any host that supports Node for Next.js. See the [Next.js deployment guide](https://nextjs.org/docs/app/building-your-application/deploying) for details.
