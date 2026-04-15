"use client";

import { format } from "date-fns";
import { CalendarPlus, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseISODateOnly } from "@/lib/schedule/dates";
import type { ScheduleMember } from "@/lib/schedule/types";
import { cn } from "@/lib/utils";

export type TeamMemberForm = ScheduleMember;

type Props = {
  members: TeamMemberForm[];
  onAddMember: () => void;
  onRemoveMember: (id: string) => void;
  onNameChange: (id: string, name: string) => void;
  onUnavailableChange: (id: string, dates: string[]) => void;
};

function toISOLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function MemberCard({
  member,
  canRemove,
  onRemove,
  onNameChange,
  onUnavailableChange,
}: {
  member: TeamMemberForm;
  canRemove: boolean;
  onRemove: () => void;
  onNameChange: (name: string) => void;
  onUnavailableChange: (dates: string[]) => void;
}) {
  const selectedDates = member.unavailableDates.map((s) => parseISODateOnly(s));

  return (
    <Card className="border-muted">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor={`name-${member.id}`}>Name</Label>
          <Input
            id={`name-${member.id}`}
            value={member.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Team member name"
          />
        </div>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground shrink-0"
            onClick={onRemove}
            aria-label={`Remove ${member.name || "member"}`}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <CalendarPlus className="mr-1 size-4" />
              Block dates
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => {
                  if (!dates?.length) {
                    onUnavailableChange([]);
                    return;
                  }
                  const sorted = [...dates]
                    .map((d) => toISOLocal(d))
                    .sort();
                  onUnavailableChange(sorted);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        {member.unavailableDates.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {member.unavailableDates.map((d) => (
              <li key={d}>
                <Badge variant="secondary" className="font-normal">
                  {format(parseISODateOnly(d), "MMM d, yyyy")}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No blocked dates.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function TeamSection({
  members,
  onAddMember,
  onRemoveMember,
  onNameChange,
  onUnavailableChange,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-lg">Team</CardTitle>
        <Button type="button" variant="secondary" size="sm" onClick={onAddMember}>
          <UserPlus className="mr-1 size-4" />
          Add member
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          Add at least two people. Use <strong>Block dates</strong> to mark days
          off; those days will not be assigned. When the schedule ties, earlier
          people in this list are preferred (add order).
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              canRemove={members.length > 2}
              onRemove={() => onRemoveMember(m.id)}
              onNameChange={(name) => onNameChange(m.id, name)}
              onUnavailableChange={(dates) =>
                onUnavailableChange(m.id, dates)
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
