import { Spinner } from '../ui/spinner'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg' | 'xl' | '2xl'
  variant?: 'default' | 'secondary' | 'muted' | 'destructive' | 'success' | 'warning'
  icon?: 'loader2' | 'loader'
  className?: string
  label?: string
  fullScreen?: boolean
  overlay?: boolean
  centered?: boolean
  loadingVariant?: 'default' | 'minimal' | 'card'
}

export const LoadingSpinner = ({
  size = 'default',
  variant = 'default',
  icon = 'loader2',
  label = '로딩 중...',
  className,
  fullScreen = false,
  overlay = false,
  centered = true,
  loadingVariant = 'default',
}: LoadingSpinnerProps) => {
  const variantClasses = {
    default: 'flex flex-col items-center justify-center gap-2',
    minimal: 'flex items-center justify-center gap-2',
    card: 'flex flex-col items-center justify-center gap-3 p-6 rounded-lg border bg-card',
  }

  const containerClasses = cn(
    variantClasses[loadingVariant],
    fullScreen && 'min-h-screen',
    overlay && 'absolute inset-0 bg-background/80 backdrop-blur-sm z-50',
    centered && !fullScreen && !overlay && 'w-full flex-1 min-h-[60vh]',
    className
  )

  const spinnerContent = (
    <div className={containerClasses}>
      <Spinner 
        size={size} 
        variant={variant} 
        icon={icon}
        label={label}
      />
      {label && (
        <p className={cn(
          'text-sm text-muted-foreground',
          loadingVariant === 'minimal' ? 'animate-pulse' : 'animate-pulse'
        )}>
          {label}
        </p>
      )}
    </div>
  )

  return spinnerContent
}

export default LoadingSpinner
