import * as React from "react"
import { isTabletDevice } from "@/shared/utils/platform/platform"

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

  // 터치 지원 여부 체크 (태블릿 감지에 사용)
  const hasTouchSupport = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || 
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }, []);

  if (!mounted) {
    // 마운트 전: SSR 환경에서는 기본값 반환
    if (typeof window === 'undefined') {
      return { 
        isSmartphone: false, 
        isTablet: false, 
        isDesktop: true, 
        width: 0 
      };
    }
    
    // 마운트 전: User-Agent 기반으로만 감지 (화면 크기는 아직 모름)
    const isTabletDeviceDetected = isTabletDevice();
    const currentWidth = window.innerWidth || 0;
    
    // 터치 지원 + 태블릿 크기 화면인 경우
    const isTabletByTouch = hasTouchSupport && currentWidth >= 768 && currentWidth < 1600;
    const isTablet = isTabletDeviceDetected || isTabletByTouch;
    const isSmartphone = !isTablet && currentWidth < 768;
    const isDesktop = !isTablet && currentWidth >= 1600;
    
    return { 
      isSmartphone, 
      isTablet, 
      isDesktop, 
      width: currentWidth 
    }
  }

  // User-Agent 기반 태블릿 감지
  const isTabletDeviceDetected = isTabletDevice();
  
  // 화면 크기 기반 감지 (더 넓은 범위 허용)
  const isTabletByWidth = width >= 768 && width < 1600;
  
  // 터치 지원 + 태블릿 크기 화면인 경우
  // 또는 작은 태블릿 크기(1200px 미만)인 경우도 태블릿으로 간주
  const isTabletByTouch = hasTouchSupport && width >= 768 && width < 1600;
  
  // 실제 태블릿 기기이거나, 태블릿 크기 화면이면서 터치 지원인 경우
  // 또는 작은 태블릿 크기(1200px 미만)인 경우도 태블릿으로 간주
  const isTablet = isTabletDeviceDetected || (isTabletByWidth && isTabletByTouch) || (isTabletByWidth && width < 1200);
  const isSmartphone = !isTablet && width < 768;
  const isDesktop = !isTablet && width >= 1600;
  
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


