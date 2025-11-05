"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { useMobileBackHandler } from "@/shared/hooks/useMobileBackHandler"

// 모바일 뒤로가기 처리를 위한 커스텀 Sheet Root
const Sheet: React.FC<React.ComponentPropsWithoutRef<typeof SheetPrimitive.Root>> = ({ 
  open, 
  onOpenChange, 
  ...props 
}) => {
  useMobileBackHandler({
    isOpen: !!open,
    onClose: () => onOpenChange?.(false),
    componentType: 'Sheet'
  });

  return (
    <SheetPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      {...props}
    />
  );
};

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
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
    <SheetPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        // Electron 환경에서만 타이틀바 영역 제외 (타이틀바 높이: 32px = 2rem = h-8)
        isElectron && "[clip-path:inset(2rem_0_0_0)]",
        className
      )}
      onPointerDown={handlePointerDown}
      {...props}
      ref={ref}
    />
  );
})
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  overlayClassName?: string;
  hideClose?: boolean;
  fullscreen?: boolean;
  /**
   * 애니메이션 변형: 기본(default), 태블릿 전용(tablet), 애니메이션 없음(none)
   */
  animationVariant?: 'default' | 'tablet' | 'none';
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, overlayClassName, children, hideClose, fullscreen, animationVariant = 'default', ...props }, ref) => {
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
    <SheetPortal>
      <SheetOverlay className={overlayClassName} />
      <SheetPrimitive.Content
        ref={ref}
        onInteractOutside={handleInteractOutside}
        className={(() => {
        if (fullscreen) {
          // Fullscreen 모드: 변형에 따라 애니메이션 세분화
          const base = "fixed inset-0 z-50 bg-background shadow-lg h-[100dvh] w-[100dvw] max-h-[100dvh]";
          const animDefault = "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-500 ease-in-out";
          const animTablet = "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-700 ease-out";
          const animNone = "";
          const anim = animationVariant === 'tablet' ? animTablet : animationVariant === 'none' ? animNone : animDefault;
          return cn(base, anim, className);
        }
        // Variant 모드 유지
        return cn(sheetVariants({ side }), className);
      })()}
      {...props}
    >
      {!hideClose && (
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      )}
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
  );
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
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
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
