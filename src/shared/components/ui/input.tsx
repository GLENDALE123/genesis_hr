import * as React from "react"

import { cn } from "@/shared/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  label?: string;
  required?: boolean;
  error?: string;
  labelClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, required, error, labelClassName, ...props }, ref) => {
    const inputElement = (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          error && "border-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    );

    if (!label) {
      return inputElement;
    }

    return (
      <div className="space-y-1.5">
        <label className={cn("block text-sm font-medium text-foreground", labelClassName)}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {inputElement}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
)
Input.displayName = "Input"

export { Input }

