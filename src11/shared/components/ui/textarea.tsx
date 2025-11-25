import * as React from "react"

import { cn } from "@/shared/lib/utils"

interface TextareaProps extends React.ComponentProps<"textarea"> {
  label?: string;
  required?: boolean;
  error?: string;
  labelClassName?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, required, error, labelClassName, ...props }, ref) => {
    const textareaElement = (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-border bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          error && "border-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    );

    if (!label) {
      return textareaElement;
    }

    return (
      <div className="space-y-1.5">
        <label className={cn("block text-sm font-medium text-foreground", labelClassName)}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {textareaElement}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
