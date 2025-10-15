# Responsive Design System Guide

This guide covers the comprehensive responsive design system implemented for Storm AI CRM application, supporting all device types from mobile phones to 4K displays and projectors.

## Table of Contents
- [Overview](#overview)
- [Breakpoints](#breakpoints)
- [Layout System](#layout-system)
- [Components](#components)
- [Utilities](#utilities)
- [Best Practices](#best-practices)
- [Testing](#testing)

## Overview

Our responsive design system is built with a mobile-first approach using Tailwind CSS with custom breakpoints and utilities. It provides:

- **Universal Device Support**: Mobile phones, tablets, laptops, desktops, large displays, projectors
- **Touch-Friendly Interfaces**: 44px minimum touch targets
- **Adaptive Typography**: Fluid font sizes using CSS clamp()
- **Flexible Layouts**: CSS Grid and Flexbox with responsive variants
- **Safe Area Support**: iPhone X+ notch and similar device considerations
- **Performance Optimized**: Efficient responsive utilities and hooks

## Breakpoints

### Standard Breakpoints
```typescript
const BREAKPOINTS = {
  xs: 320,      // Small phones
  sm: 640,      // Large phones / small tablets
  md: 768,      // Tablets
  lg: 1024,     // Small laptops
  xl: 1280,     // Desktop
  '2xl': 1536,  // Large desktop
  '3xl': 1920,  // Full HD displays
  '4xl': 2560,  // 2K displays
  '5xl': 3840,  // 4K displays
}
```

### Device-Specific Breakpoints
```css
/* Mobile-first approach */
.mobile { @apply block sm:hidden; }
.tablet-only { @apply hidden sm:block lg:hidden; }
.desktop-only { @apply hidden lg:block; }

/* Orientation breakpoints */
.landscape { /* (orientation: landscape) */ }
.portrait { /* (orientation: portrait) */ }

/* Height-based breakpoints for projectors */
.short { /* (max-height: 600px) */ }
.tall { /* (min-height: 800px) */ }
```

## Layout System

### Container Classes
```css
.container-responsive {
  @apply w-full mx-auto px-4 sm:px-6 lg:px-8;
  max-width: min(100% - 2rem, 1280px);
}

.container-responsive-sm {
  max-width: min(100% - 1.5rem, 768px);
}

.container-responsive-lg {
  max-width: min(100% - 3rem, 1536px);
}
```

### Grid Systems
```css
.grid-responsive-cards {
  @apply grid gap-4 sm:gap-6 lg:gap-8;
  @apply grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
}

.grid-responsive-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: clamp(1rem, 3vw, 2rem);
}
```

## Components

### Button System
```tsx
import Button, { IconButton, FAB, ButtonGroup } from './components/ui/Button'

// Responsive button with automatic sizing
<Button size="default" variant="primary">
  Save Changes
</Button>

// Touch-friendly icon button
<IconButton 
  icon={<PlusIcon />} 
  aria-label="Add item"
  size="default" 
/>

// Floating action button for mobile
<FAB>
  <PlusIcon />
</FAB>
```

### Card System
```tsx
import { Card, StatsCard, MetricCard, FeatureCard } from './components/ui/Card'

// Responsive stats card
<StatsCard
  title="Total Revenue"
  value="$45,231"
  change={12}
  icon={CurrencyDollarIcon}
  color="green"
/>

// Flexible card with responsive padding
<Card size="default" variant="elevated">
  <CardHeader>
    <CardTitle>Dashboard</CardTitle>
    <CardDescription>Your business overview</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Table System
```tsx
import { DataTable, ResponsiveTable, MobileCardTable } from './components/ui/Table'

// Responsive table that switches to cards on mobile
<ResponsiveTable
  columns={columns}
  data={data}
  mobileRenderCard={(record) => (
    <Card>
      <h3>{record.name}</h3>
      <p>{record.email}</p>
    </Card>
  )}
/>
```

### Form System
```tsx
import { Input, Select, Textarea, FormGroup } from './components/ui/Input'

// Touch-friendly form inputs
<FormGroup direction="vertical" gap="default">
  <Input
    label="Full Name"
    placeholder="Enter your name"
    required
  />
  <Select
    label="Country"
    options={countries}
    placeholder="Select country"
  />
  <Textarea
    label="Message"
    placeholder="Your message..."
    resize={false}
  />
</FormGroup>
```

### Modal System
```tsx
import { Modal, ConfirmationModal, DrawerModal } from './components/ui/Modal'

// Responsive modal that goes full-screen on mobile
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Edit Profile"
  size="lg"
  fullScreen={isMobile}
>
  {/* Modal content */}
</Modal>

// Mobile-friendly drawer
<DrawerModal
  isOpen={isDrawerOpen}
  onClose={onDrawerClose}
  side="right"
>
  {/* Drawer content */}
</DrawerModal>
```

## Utilities

### Typography
```css
/* Responsive text sizes using CSS clamp() */
.text-responsive { font-size: clamp(1rem, 4vw, 1.25rem); }
.text-responsive-sm { font-size: clamp(0.875rem, 3vw, 1rem); }
.text-responsive-lg { font-size: clamp(1.125rem, 5vw, 1.5rem); }

/* Semantic heading classes */
.heading-responsive { font-size: clamp(1.5rem, 5vw, 2.25rem); }
.heading-responsive-sm { font-size: clamp(1.125rem, 4vw, 1.5rem); }
.heading-responsive-lg { font-size: clamp(2rem, 6vw, 3rem); }
```

### Spacing
```css
/* Responsive spacing utilities */
.p-responsive { padding: clamp(1rem, 4vw, 2rem); }
.space-responsive > * + * { margin-top: clamp(1rem, 3vw, 2rem); }

/* Safe area support for notched devices */
.pt-safe { padding-top: env(safe-area-inset-top); }
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
```

### Interactive Elements
```css
/* Touch-friendly minimum sizes */
.touch-friendly {
  min-height: 44px;
  min-width: 44px;
}

/* Responsive hover states */
@media (hover: hover) {
  .hover-only:hover {
    /* Hover styles only for devices that support hover */
  }
}
```

## React Hooks

### Breakpoint Detection
```tsx
import { useBreakpoint, useDeviceType, useMinBreakpoint } from './utils/responsive'

function MyComponent() {
  const breakpoint = useBreakpoint() // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  const deviceType = useDeviceType() // 'mobile' | 'tablet' | 'desktop' | 'wide' | 'ultraWide'
  const isDesktop = useMinBreakpoint('lg')
  
  return (
    <div>
      <p>Current breakpoint: {breakpoint}</p>
      <p>Device type: {deviceType}</p>
      {isDesktop && <DesktopOnlyComponent />}
    </div>
  )
}
```

### Media Queries
```tsx
import { useMediaQuery, useOrientation } from './utils/responsive'

function ResponsiveComponent() {
  const isLandscape = useMediaQuery('(orientation: landscape)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const orientation = useOrientation()
  
  return (
    <div className={orientation === 'landscape' ? 'flex-row' : 'flex-col'}>
      {/* Content */}
    </div>
  )
}
```

## Page Templates

### Dashboard Template
```tsx
import { DashboardTemplate } from './components/templates/ResponsivePageTemplate'

<DashboardTemplate
  title="Dashboard"
  stats={[
    {
      title: "Total Users",
      value: "12,345",
      change: 5.2,
      icon: UsersIcon,
      color: "blue"
    }
  ]}
>
  {/* Dashboard content */}
</DashboardTemplate>
```

### List Page Template
```tsx
import { ListPageTemplate } from './components/templates/ResponsivePageTemplate'

<ListPageTemplate
  title="Customers"
  columns={columns}
  data={customers}
  onAdd={() => setShowAddModal(true)}
  mobileRenderCard={(customer) => (
    <Card>
      <h3>{customer.name}</h3>
      <p>{customer.email}</p>
    </Card>
  )}
/>
```

## Best Practices

### 1. Mobile-First Approach
Always start with mobile styles and enhance for larger screens:

```css
/* ✅ Good: Mobile-first */
.component {
  @apply p-4 text-sm;
  @apply sm:p-6 sm:text-base;
  @apply lg:p-8 lg:text-lg;
}

/* ❌ Avoid: Desktop-first */
.component {
  @apply p-8 text-lg;
  @apply lg:p-6 lg:text-base;
  @apply sm:p-4 sm:text-sm;
}
```

### 2. Touch-Friendly Design
Ensure interactive elements are at least 44px in size:

```tsx
// ✅ Good: Touch-friendly button
<button className="btn-responsive touch-friendly">
  Click me
</button>

// ❌ Avoid: Too small for touch
<button className="px-1 py-0.5 text-xs">
  Tiny button
</button>
```

### 3. Content Priority
Hide less important content on smaller screens:

```tsx
// ✅ Good: Progressive disclosure
<div className="flex items-center space-x-4">
  <Avatar />
  <div>
    <h3>{user.name}</h3>
    <p className="hidden sm:block">{user.email}</p>
    <p className="hidden lg:block">{user.department}</p>
  </div>
</div>
```

### 4. Flexible Layouts
Use CSS Grid and Flexbox for adaptive layouts:

```css
/* ✅ Good: Flexible grid */
.grid-responsive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: clamp(1rem, 3vw, 2rem);
}
```

### 5. Performance Optimization
Use responsive images and lazy loading:

```tsx
// ✅ Good: Responsive images
<img
  src={getResponsiveImageSrc(imageSources, breakpoint, fallbackSrc)}
  alt="Description"
  loading="lazy"
  className="w-full h-auto"
/>
```

## Testing

### Manual Testing Checklist
- [ ] Test on actual devices (iPhone, Android, iPad, laptop, desktop)
- [ ] Test in browser dev tools with device emulation
- [ ] Test landscape and portrait orientations
- [ ] Test with different zoom levels (100%, 150%, 200%)
- [ ] Test keyboard navigation
- [ ] Test touch interactions
- [ ] Test with slow network connections

### Automated Testing
```typescript
// Responsive component testing with React Testing Library
import { render, screen } from '@testing-library/react'
import { useBreakpoint } from '../utils/responsive'

// Mock the breakpoint hook for testing
jest.mock('../utils/responsive')

test('shows mobile layout on small screens', () => {
  (useBreakpoint as jest.Mock).mockReturnValue('sm')
  
  render(<ResponsiveComponent />)
  
  expect(screen.getByTestId('mobile-layout')).toBeInTheDocument()
  expect(screen.queryByTestId('desktop-layout')).not.toBeInTheDocument()
})
```

### Browser Testing Matrix
| Device Type | Browsers | Viewport Sizes |
|-------------|----------|----------------|
| Mobile | Chrome, Safari, Firefox | 320px - 767px |
| Tablet | Chrome, Safari, Firefox | 768px - 1023px |
| Desktop | Chrome, Safari, Firefox, Edge | 1024px - 1920px |
| Large Display | Chrome, Firefox | 1920px+ |

## Performance Considerations

### CSS Optimization
- Use `clamp()` for fluid typography and spacing
- Minimize media query breakpoints
- Use CSS Grid for complex layouts
- Leverage CSS custom properties for theming

### JavaScript Optimization
- Debounce resize event listeners
- Use `useCallback` and `useMemo` for expensive calculations
- Lazy load components not immediately visible
- Use `IntersectionObserver` for scroll-based interactions

### Image Optimization
- Use responsive images with `srcset`
- Implement lazy loading
- Use modern image formats (WebP, AVIF)
- Optimize images for different screen densities

## Accessibility

### Screen Reader Support
- Use semantic HTML elements
- Provide proper ARIA labels
- Ensure logical tab order
- Test with screen readers

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Provide visible focus indicators
- Support standard keyboard shortcuts
- Test tab navigation flow

### Color and Contrast
- Maintain WCAG AA contrast ratios
- Don't rely solely on color for information
- Test with color blindness simulators
- Provide high contrast mode support

This responsive design system ensures your application works seamlessly across all devices and screen sizes while maintaining excellent user experience and accessibility standards.