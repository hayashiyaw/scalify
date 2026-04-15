import Holidays from "date-holidays";
import type { HolidayCountry } from "./types";

export type HolidayChecker = (date: Date) => boolean;

export function createHolidayChecker(country: HolidayCountry): HolidayChecker {
  const hd = new Holidays(country);
  return (date: Date) => Boolean(hd.isHoliday(date));
}
