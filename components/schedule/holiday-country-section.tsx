"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HolidayCountry } from "@/lib/schedule/types";

const OPTIONS: { value: HolidayCountry; label: string }[] = [
  { value: "US", label: "United States" },
  { value: "PT", label: "Portugal" },
  { value: "BR", label: "Brazil" },
];

type Props = {
  value: HolidayCountry;
  onChange: (country: HolidayCountry) => void;
};

export function HolidayCountrySection({ value, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Public holidays</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Label htmlFor="holiday-country">Country calendar</Label>
        <Select
          value={value}
          onValueChange={(v) => onChange(v as HolidayCountry)}
        >
          <SelectTrigger id="holiday-country" className="w-full max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">
          Weekday shifts (Mon–Fri, not a public holiday) count as 12 hours
          (pool A). Weekend and public holiday shifts count as 24 hours (pool
          B). Assignments balance each pool fairly across the team.
        </p>
      </CardContent>
    </Card>
  );
}
