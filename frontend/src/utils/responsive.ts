// src/utils/responsive.ts - Responsive Design Utilities and Helpers

import { useEffect, useState } from 'react'

// Breakpoint definitions matching Tailwind config
export const BREAKPOINTS = {
  xs: 320,      // Small phones
  sm: 640,      // Large phones / small tablets
  md: 768,      // Tablets
  lg: 1024,     // Small laptops
  xl: 1280,     // Desktop
  '2xl': 1536,  // Large desktop
  '3xl': 1920,  // Full HD displays
  '4xl': 2560,  // 2K displays
  '5xl': 3840,  // 4K displays
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

// Device type detection
export const DEVICE_TYPES = {
  mobile: { max: 767 },
  tablet: { min: 768, max: 1023 },
  desktop: { min: 1024 },
  wide: { min: 1440 },
  ultraWide: { min: 2560 },
} as const

export type DeviceType = keyof typeof DEVICE_TYPES

// Hook to get current breakpoint
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('sm')

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      
      if (width >= BREAKPOINTS['5xl']) setBreakpoint('5xl')
      else if (width >= BREAKPOINTS['4xl']) setBreakpoint('4xl')
      else if (width >= BREAKPOINTS['3xl']) setBreakpoint('3xl')
      else if (width >= BREAKPOINTS['2xl']) setBreakpoint('2xl')
      else if (width >= BREAKPOINTS.xl) setBreakpoint('xl')
      else if (width >= BREAKPOINTS.lg) setBreakpoint('lg')
      else if (width >= BREAKPOINTS.md) setBreakpoint('md')
      else if (width >= BREAKPOINTS.sm) setBreakpoint('sm')
      else setBreakpoint('xs')
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  return breakpoint
}

// Hook to get current device type
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>('mobile')

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth
      
      if (width >= DEVICE_TYPES.ultraWide.min) setDeviceType('ultraWide')
      else if (width >= DEVICE_TYPES.wide.min) setDeviceType('wide')
      else if (width >= DEVICE_TYPES.desktop.min) setDeviceType('desktop')
      else if (width >= DEVICE_TYPES.tablet.min && width <= DEVICE_TYPES.tablet.max) setDeviceType('tablet')
      else setDeviceType('mobile')
    }

    updateDeviceType()
    window.addEventListener('resize', updateDeviceType)
    return () => window.removeEventListener('resize', updateDeviceType)
  }, [])

  return deviceType
}

// Hook to check if current screen is at least a certain breakpoint
export const useMinBreakpoint = (minBreakpoint: Breakpoint) => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const checkBreakpoint = () => {
      setMatches(window.innerWidth >= BREAKPOINTS[minBreakpoint])
    }

    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [minBreakpoint])

  return matches
}

// Hook to check if current screen is at most a certain breakpoint
export const useMaxBreakpoint = (maxBreakpoint: Breakpoint) => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const checkBreakpoint = () => {
      setMatches(window.innerWidth <= BREAKPOINTS[maxBreakpoint])
    }

    checkBreakpoint()
    window.addEventListener('resize', checkBreakpoint)
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [maxBreakpoint])

  return matches
}

// Hook for media queries
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [query])

  return matches
}

// Responsive utility functions
export const getResponsiveValue = <T>(
  values: Partial<Record<Breakpoint, T>>,
  currentBreakpoint: Breakpoint,
  fallback: T
): T => {
  // Try current breakpoint first
  if (values[currentBreakpoint] !== undefined) {
    return values[currentBreakpoint]!
  }

  // Fall back to smaller breakpoints
  const breakpointOrder: Breakpoint[] = ['5xl', '4xl', '3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint)
  
  for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i]
    if (values[bp] !== undefined) {
      return values[bp]!
    }
  }

  return fallback
}

// Touch device detection
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Screen orientation detection
export const useOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    updateOrientation()
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)
    
    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  return orientation
}

// Safe area detection for devices with notches
export const useSafeArea = () => {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
      })
    }

    updateSafeArea()
    window.addEventListener('resize', updateSafeArea)
    return () => window.removeEventListener('resize', updateSafeArea)
  }, [])

  return safeArea
}

// Viewport size hook
export const useViewportSize = () => {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  useEffect(() => {
    const updateSize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  return size
}

// Responsive grid calculator
export const calculateGridColumns = (
  containerWidth: number,
  itemMinWidth: number,
  gap: number = 16
): number => {
  const availableWidth = containerWidth - gap
  const itemWidthWithGap = itemMinWidth + gap
  const maxColumns = Math.floor(availableWidth / itemWidthWithGap)
  return Math.max(1, maxColumns)
}

// Responsive font size calculator
export const calculateResponsiveFontSize = (
  baseSize: number,
  minSize: number,
  maxSize: number,
  viewportWidth: number,
  minViewport: number = 320,
  maxViewport: number = 1200
): number => {
  if (viewportWidth <= minViewport) return minSize
  if (viewportWidth >= maxViewport) return maxSize
  
  const ratio = (viewportWidth - minViewport) / (maxViewport - minViewport)
  return minSize + (maxSize - minSize) * ratio
}

// Responsive spacing calculator
export const calculateResponsiveSpacing = (
  baseSpacing: number,
  scaleFactor: number = 1.5,
  breakpoint: Breakpoint
): number => {
  const multipliers: Record<Breakpoint, number> = {
    xs: 0.75,
    sm: 1,
    md: 1.25,
    lg: 1.5,
    xl: 1.75,
    '2xl': 2,
    '3xl': 2.25,
    '4xl': 2.5,
    '5xl': 3,
  }
  
  return baseSpacing * (multipliers[breakpoint] || 1) * scaleFactor
}

// Component visibility helpers
export const shouldShowOnBreakpoint = (
  showOn: Breakpoint[],
  currentBreakpoint: Breakpoint
): boolean => {
  return showOn.includes(currentBreakpoint)
}

export const shouldHideOnBreakpoint = (
  hideOn: Breakpoint[],
  currentBreakpoint: Breakpoint
): boolean => {
  return hideOn.includes(currentBreakpoint)
}

// Responsive image source selector
export const getResponsiveImageSrc = (
  sources: Partial<Record<Breakpoint, string>>,
  currentBreakpoint: Breakpoint,
  fallback: string
): string => {
  return getResponsiveValue(sources, currentBreakpoint, fallback)
}

// Performance optimization for responsive updates
export const useThrottledResize = (callback: () => void, delay: number = 100) => {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(callback, delay)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(timeoutId)
    }
  }, [callback, delay])
}

// Responsive table column manager
export const useResponsiveTableColumns = <T extends { key: string; hideOnMobile?: boolean; hideOnTablet?: boolean }>(
  columns: T[],
  deviceType: DeviceType
): T[] => {
  return columns.filter(column => {
    if (deviceType === 'mobile' && column.hideOnMobile) return false
    if (deviceType === 'tablet' && column.hideOnTablet) return false
    return true
  })
}

// Export all utilities
export default {
  BREAKPOINTS,
  DEVICE_TYPES,
  useBreakpoint,
  useDeviceType,
  useMinBreakpoint,
  useMaxBreakpoint,
  useMediaQuery,
  useOrientation,
  useSafeArea,
  useViewportSize,
  useThrottledResize,
  getResponsiveValue,
  isTouchDevice,
  calculateGridColumns,
  calculateResponsiveFontSize,
  calculateResponsiveSpacing,
  shouldShowOnBreakpoint,
  shouldHideOnBreakpoint,
  getResponsiveImageSrc,
  useResponsiveTableColumns,
}