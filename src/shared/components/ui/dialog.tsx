"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { useMobileBackHandler } from "@/shared/hooks/useMobileBackHandler"
import { VisuallyHidden } from "@/shared/components/ui/visually-hidden"
import { useDeviceType } from "@/shared/hooks/use-device"

// 모바일 뒤로가기 처리를 위한 커스텀 Dialog Root
const Dialog: React.FC<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>> = ({ 
  open, 
  onOpenChange, 
  ...props 
}) => {
  useMobileBackHandler({
    isOpen: !!open,
    onClose: () => onOpenChange?.(false),
    componentType: 'Dialog'
  });

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      {...props}
    />
  );
};

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  // Electron 환경 감지
  const isElectron = typeof window !== 'undefined' && (window as any).electron;
  
  // 타이틀바 영역 클릭 시 모달이 닫히지 않도록 처리
  const handlePointerDown = React.useCallback((e: React.PointerEvent) => {
    if (isElectron && e.clientY < 32) {
      // 타이틀바 영역 (상단 32px) 클릭은 무시
      e.preventDefault();
      e.stopPropagation();
    }
  }, [isElectron]);
  
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/40  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        // Electron 환경에서만 타이틀바 영역 제외 (타이틀바 높이: 32px = 2rem = h-8)
        isElectron && "[clip-path:inset(2rem_0_0_0)]",
        className
      )}
      onPointerDown={handlePointerDown}
      {...props}
    />
  );
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  children: React.ReactNode;
  className?: string;
  stickyHeader?: React.ReactNode;
  stickyFooter?: React.ReactNode;
  /**
   * 모바일에서 전체화면으로 표시할지 여부
   * @default true
   */
  mobileFullscreen?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, stickyHeader, stickyFooter, mobileFullscreen = true, ...props }, ref) => {
  const { isSmartphone } = useDeviceType();
  const isFullscreenOnMobile = mobileFullscreen && isSmartphone;
  
  // Electron 환경 감지
  const isElectron = typeof window !== 'undefined' && (window as any).electron;
  
  // 타이틀바 영역 클릭 시 모달이 닫히지 않도록 처리
  const handleInteractOutside = React.useCallback((e: Event) => {
    if (isElectron) {
      const target = e.target as HTMLElement;
      // 타이틀바 영역 클릭인지 확인
      if (target.closest('.drag-region') || (e as MouseEvent).clientY < 32) {
        e.preventDefault();
      }
    }
  }, [isElectron]);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        onInteractOutside={handleInteractOutside}
        className={cn(
          // 기본: 중앙에 위치한 모달
          !isFullscreenOnMobile && "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          // 모바일 전체화면 모드 (중앙에서 확대)
          isFullscreenOnMobile && "fixed inset-0 z-50 grid w-[100dvw] h-[100dvh] gap-0 bg-background shadow-lg duration-200 pb-[env(safe-area-inset-bottom)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          stickyHeader && stickyFooter ? "max-h-[90vh] grid-rows-[auto_1fr_auto]" : 
          stickyHeader ? "max-h-[90vh] grid-rows-[auto_1fr]" :
          stickyFooter ? "max-h-[90vh] grid-rows-[1fr_auto]" : "",
          isFullscreenOnMobile && "!max-h-none",
          className
        )}
        {...props}
      >
        {/* Hidden DialogTitle for accessibility - only when not using stickyHeader */}
        {!stickyHeader && (
          <VisuallyHidden>
            <DialogPrimitive.Title>
              Dialog
            </DialogPrimitive.Title>
          </VisuallyHidden>
        )}

        {/* Sticky Header */}
        {stickyHeader && (
          <div className={cn(
            "flex-shrink-0 bg-transparent border-b relative",
            isFullscreenOnMobile ? "p-4" : "p-6 pb-4"
          )}>
            {stickyHeader}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
        )}

        {/* Main Content */}
        <div className={cn(
          "overflow-y-auto min-h-0",
          stickyHeader && stickyFooter ? (
            isFullscreenOnMobile ? "p-4" : "p-6 pt-4 pb-4"
          ) :
          stickyHeader ? (
            isFullscreenOnMobile ? "p-4 pt-2" : "p-6 pt-4"
          ) :
          stickyFooter ? (
            isFullscreenOnMobile ? "p-4 pb-2" : "p-6 pb-4"
          ) : (
            isFullscreenOnMobile ? "p-4" : "p-6"
          )
        )}>
          {children}
        </div>

        {/* Sticky Footer */}
        {stickyFooter && (
          <div className={cn(
            "flex-shrink-0 bg-transparent border-t",
            isFullscreenOnMobile ? "p-4" : "p-6 pt-4"
          )}>
            {stickyFooter}
          </div>
        )}

        {/* Close button for non-sticky header */}
        {!stickyHeader && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
