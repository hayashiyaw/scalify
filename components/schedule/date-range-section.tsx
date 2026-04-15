"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseISODateOnly } from "@/lib/schedule/dates";
import { cn } from "@/lib/utils";

type Props = {
  startDate: string;
  endDate: string;
  onStartDateChange: (iso: string) => void;
  onEndDateChange: (iso: string) => void;
};

function toISOLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const date = parseISODateOnly(value);

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-start text-left font-normal md:w-[240px]",
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {format(date, "PPP")}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) onChange(toISOLocal(d));
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DateRangeSection({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Shift cycle</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
        <DatePickerField
          label="Start date"
          value={startDate}
          onChange={onStartDateChange}
        />
        <DatePickerField
          label="End date"
          value={endDate}
          onChange={onEndDateChange}
        />
      </CardContent>
    </Card>
  );
}
