import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

type AuthFieldProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
};

export function AuthField({ id, label, error, children }: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm text-auth-form-fg">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
