import { Spinner } from '../ui/spinner'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg' | 'xl'
  variant?: 'default' | 'secondary' | 'muted' | 'destructive'
  label?: string
  className?: string
  fullScreen?: boolean
  overlay?: boolean
  centered?: boolean
}

export const LoadingSpinner = ({
  size = 'default',
  variant = 'default',
  label = '로딩 중...',
  className,
  fullScreen = false,
  overlay = false,
  centered = true,
}: LoadingSpinnerProps) => {
  const spinnerContent = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-2',
      fullScreen && 'min-h-screen',
      overlay && 'absolute inset-0 bg-background/80 backdrop-blur-sm z-50',
      centered && !fullScreen && !overlay && 'w-full flex-1 min-h-[60vh]',
      className
    )}>
      <Spinner size={size} variant={variant} label={label} />
      {label && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {label}
        </p>
      )}
    </div>
  )

  return spinnerContent
}

export default LoadingSpinner
