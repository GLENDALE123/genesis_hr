import { Loader2Icon, LoaderIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/utils"

const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        sm: "size-3",
        default: "size-4", 
        lg: "size-6",
        xl: "size-8",
        "2xl": "size-12",
      },
      variant: {
        default: "text-primary",
        secondary: "text-secondary-foreground",
        muted: "text-muted-foreground",
        destructive: "text-destructive",
        success: "text-green-500",
        warning: "text-yellow-500",
      },
      icon: {
        loader2: "Loader2Icon",
        loader: "LoaderIcon",
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default",
      icon: "loader2",
    },
  }
)

export interface SpinnerProps
  extends React.ComponentProps<"svg">,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

function Spinner({ 
  className, 
  size, 
  variant, 
  icon = "loader2",
  label,
  ...props 
}: SpinnerProps) {
  const IconComponent = icon === "loader" ? LoaderIcon : Loader2Icon
  
  return (
    <IconComponent
      role="status"
      aria-label={label || "Loading"}
      className={cn(spinnerVariants({ size, variant }), className)}
      {...props}
    />
  )
}

export { Spinner, spinnerVariants }
