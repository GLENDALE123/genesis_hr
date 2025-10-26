import * as React from "react"

// Breakpoints (12-inch class 기준 반영)
// smartphone: < 768
// tablet: 768 - 1279
// desktop: >= 1280

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

  const isSmartphone = width < 768
  const isTablet = width >= 768 && width < 1280
  const isDesktop = width >= 1280
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


