import * as React from "react"
import { isTabletDevice } from "@/shared/utils/platform"

// Breakpoints (대형 태블릿 지원)
// smartphone: < 768
// tablet: 768 - 1439
// desktop: >= 1440

export function useDeviceType() {
  const [mounted, setMounted] = React.useState(false)
  const [width, setWidth] = React.useState(0)

  React.useEffect(() => {
    setMounted(true)
    const handle = () => setWidth(window.innerWidth)
    handle()
    window.addEventListener("resize", handle)
    return () => window.removeEventListener("resize", handle)
  }, [])

  if (!mounted) {
    return { isSmartphone: false, isTablet: false, isDesktop: false, width: 0 }
  }

  // User-Agent 기반 태블릿 감지
  const isTabletDeviceDetected = isTabletDevice();
  
  // 화면 크기 기반 감지
  const isTabletByWidth = width >= 768 && width < 1440;
  
  // 실제 태블릿 기기이거나 태블릿 크기 화면인 경우
  const isTablet = isTabletDeviceDetected || isTabletByWidth;
  const isSmartphone = !isTablet && width < 768;
  const isDesktop = !isTablet && width >= 1440;
  
  return { isSmartphone, isTablet, isDesktop, width }
}

export function useIsSmartphone() {
  const { isSmartphone } = useDeviceType()
  return isSmartphone
}

export function useIsTablet() {
  const { isTablet } = useDeviceType()
  return isTablet
}


