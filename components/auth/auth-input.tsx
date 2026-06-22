import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const AuthInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      "h-10 rounded-none border-0 border-b border-auth-form-muted/50 bg-transparent px-0 text-auth-form-fg shadow-none placeholder:text-auth-form-muted focus-visible:border-auth-form-fg focus-visible:ring-0 aria-invalid:border-destructive aria-invalid:focus-visible:border-destructive",
      className,
    )}
    {...props}
  />
));
AuthInput.displayName = "AuthInput";

export { AuthInput };
