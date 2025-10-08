"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/shared/lib/utils"

interface ScrollAreaProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  hideVerticalScrollbar?: boolean
  hideHorizontalScrollbar?: boolean
  overflowX?: 'auto' | 'hidden' | 'scroll' | 'visible'
  overflowY?: 'auto' | 'hidden' | 'scroll' | 'visible'
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ 
  className, 
  children, 
  hideVerticalScrollbar = false,
  hideHorizontalScrollbar = false,
  overflowX = 'auto',
  overflowY = 'auto',
  ...props 
}, ref) => {
  // overflow 클래스 생성
  const overflowClasses = cn(
    {
      'overflow-x-auto': overflowX === 'auto',
      'overflow-x-hidden': overflowX === 'hidden',
      'overflow-x-scroll': overflowX === 'scroll',
      'overflow-x-visible': overflowX === 'visible',
      'overflow-y-auto': overflowY === 'auto',
      'overflow-y-hidden': overflowY === 'hidden',
      'overflow-y-scroll': overflowY === 'scroll',
      'overflow-y-visible': overflowY === 'visible',
    }
  )

  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn("relative overflow-hidden", overflowClasses, className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] [&>[data-radix-scroll-area-viewport]>*]:!static [&>[data-radix-scroll-area-viewport]>*]:!transform-none">
        {children}
      </ScrollAreaPrimitive.Viewport>
      {!hideVerticalScrollbar && <ScrollBar orientation="vertical" />}
      {!hideHorizontalScrollbar && <ScrollBar orientation="horizontal" />}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
})
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-all duration-200 ease-in-out group",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px] hover:w-3",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px] hover:h-3",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-muted-foreground/20 group-hover:bg-muted-foreground/40 transition-all duration-200 ease-in-out" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }