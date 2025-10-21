"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/shared/lib/utils"

// 모바일 뒤로가기 처리를 위한 커스텀 Dialog Root
const Dialog: React.FC<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root>> = ({ 
  open, 
  onOpenChange, 
  ...props 
}) => {
  const [historyStateAdded, setHistoryStateAdded] = React.useState(false);
  
  // 모바일 환경 감지
  const isMobile = React.useMemo(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768;
  }, []);
  
  // 모바일 뒤로가기 처리 (모바일 환경에서만)
  React.useEffect(() => {
    if (!open || !isMobile) {
      setHistoryStateAdded(false);
      return;
    }

    const handlePopState = (event: PopStateEvent) => {
      // 모달이 열려있고, 히스토리 상태가 모달과 관련된 경우에만 닫기
      if (open && event.state?.modalOpen === true) {
        console.log('🔍 [Dialog] 모바일 뒤로가기로 인한 모달 닫기');
        onOpenChange?.(false);
      }
    };

    // 히스토리에 상태 추가 (모달이 열렸음을 표시) - 한 번만 실행
    if (!historyStateAdded) {
      window.history.pushState({ modalOpen: true }, '');
      setHistoryStateAdded(true);
    }
    
    // popstate 이벤트 리스너 추가
    window.addEventListener('popstate', handlePopState);

    return () => {
      // 정리 함수에서 이벤트 리스너 제거
      window.removeEventListener('popstate', handlePopState);
      
      // 모달이 닫힐 때 히스토리 상태 정리
      if (window.history.state?.modalOpen && historyStateAdded) {
        window.history.back();
      }
    };
  }, [open, onOpenChange, historyStateAdded, isMobile]);

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
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  stickyHeader?: React.ReactNode;
  stickyFooter?: React.ReactNode;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, stickyHeader, stickyFooter, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-0 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        stickyHeader && stickyFooter ? "max-h-[90vh] grid-rows-[auto_1fr_auto]" : 
        stickyHeader ? "max-h-[90vh] grid-rows-[auto_1fr]" :
        stickyFooter ? "max-h-[90vh] grid-rows-[1fr_auto]" : "",
        className
      )}
      {...props}
    >
      {/* Sticky Header */}
      {stickyHeader && (
        <div className="flex-shrink-0 bg-transparent border-b p-6 pb-4 relative">
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
        stickyHeader && stickyFooter ? "p-6 pt-4 pb-4" :
        stickyHeader ? "p-6 pt-4" :
        stickyFooter ? "p-6 pb-4" : "p-6"
      )}>
        {children}
      </div>

      {/* Sticky Footer */}
      {stickyFooter && (
        <div className="flex-shrink-0 bg-transparent border-t p-6 pt-4">
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
))
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
