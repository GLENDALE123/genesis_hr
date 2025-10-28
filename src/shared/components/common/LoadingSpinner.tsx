import { Spinner } from '../ui/spinner'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  label?: string
  fullScreen?: boolean
  overlay?: boolean
  centered?: boolean
  loadingVariant?: 'default' | 'minimal' | 'card'
  size?: 'sm' | 'default' | 'lg' | 'xl'
}

export const LoadingSpinner = ({
  label = '로딩 중...',
  className,
  fullScreen = false,
  overlay = false,
  centered = true,
  loadingVariant = 'default',
  size = 'default',
}: LoadingSpinnerProps) => {
  const variantClasses = {
    default: 'flex flex-col items-center justify-center gap-2',
    minimal: 'flex items-center justify-center gap-2',
    card: 'flex flex-col items-center justify-center gap-3 p-6 rounded-lg border bg-card',
  }

  const sizeClasses = {
    sm: 'size-3',
    default: 'size-5',
    lg: 'size-6',
    xl: 'size-8',
  }

  const containerClasses = cn(
    variantClasses[loadingVariant],
    fullScreen && 'min-h-screen',
    overlay && 'absolute inset-0 bg-background/80 backdrop-blur-sm z-50',
    centered && !fullScreen && !overlay && 'w-full flex-1 min-h-[60vh]',
    className
  )

  return (
    <div className={containerClasses}>
      <Spinner className={cn(sizeClasses[size], 'text-primary')} />
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
}

export default LoadingSpinner
