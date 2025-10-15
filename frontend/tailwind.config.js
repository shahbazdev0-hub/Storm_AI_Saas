// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    screens: {
      // Mobile devices
      'xs': '320px',    // Small phones
      'sm': '640px',    // Large phones / small tablets
      // Tablet devices
      'md': '768px',    // Tablets
      'lg': '1024px',   // Small laptops
      // Desktop devices
      'xl': '1280px',   // Desktop
      '2xl': '1536px',  // Large desktop
      // Extra large displays
      '3xl': '1920px',  // Full HD displays
      '4xl': '2560px',  // 2K displays
      '5xl': '3840px',  // 4K displays
      // Custom breakpoints for specific use cases
      'mobile': {'max': '767px'},     // Mobile-first approach
      'tablet': {'min': '768px', 'max': '1023px'}, // Tablet only
      'desktop': {'min': '1024px'},   // Desktop and up
      'wide': {'min': '1440px'},      // Wide screens
      'ultra-wide': {'min': '2560px'}, // Ultra-wide monitors
      // Height-based breakpoints for projectors and unusual aspect ratios
      'short': {'raw': '(max-height: 600px)'},
      'tall': {'raw': '(min-height: 800px)'},
      'ultra-tall': {'raw': '(min-height: 1200px)'},
      // Orientation breakpoints
      'landscape': {'raw': '(orientation: landscape)'},
      'portrait': {'raw': '(orientation: portrait)'},
      // High DPI displays
      'retina': {'raw': '(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)'},
    },
    extend: {
      // Enhanced spacing system for responsive design
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
        '144': '36rem',
      },
      // Responsive font sizes
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
        // Responsive text sizes
        'responsive-xs': 'clamp(0.75rem, 2vw, 0.875rem)',
        'responsive-sm': 'clamp(0.875rem, 2.5vw, 1rem)',
        'responsive-base': 'clamp(1rem, 3vw, 1.125rem)',
        'responsive-lg': 'clamp(1.125rem, 3.5vw, 1.25rem)',
        'responsive-xl': 'clamp(1.25rem, 4vw, 1.5rem)',
        'responsive-2xl': 'clamp(1.5rem, 5vw, 2rem)',
        'responsive-3xl': 'clamp(1.875rem, 6vw, 3rem)',
      },
      // Container queries support
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },
      // Enhanced grid system
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
        '14': 'repeat(14, minmax(0, 1fr))',
        '15': 'repeat(15, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
        'auto-fit': 'repeat(auto-fit, minmax(250px, 1fr))',
        'auto-fill': 'repeat(auto-fill, minmax(250px, 1fr))',
        'responsive': 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
      },
      // Responsive animations
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
          '40%, 43%': { transform: 'translate3d(0, -8px, 0)' },
          '70%': { transform: 'translate3d(0, -4px, 0)' },
          '90%': { transform: 'translate3d(0, -2px, 0)' },
        },
      },
      // Enhanced color system with better contrast ratios
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#0038FF', // Your brand color
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      // Responsive shadows
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'responsive': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [
    // Add responsive utilities plugin
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Responsive text utilities
        '.text-responsive': {
          'font-size': 'clamp(1rem, 4vw, 1.25rem)',
        },
        '.text-responsive-sm': {
          'font-size': 'clamp(0.875rem, 3vw, 1rem)',
        },
        '.text-responsive-lg': {
          'font-size': 'clamp(1.125rem, 5vw, 1.5rem)',
        },
        '.text-responsive-xl': {
          'font-size': 'clamp(1.25rem, 6vw, 2rem)',
        },
        // Responsive spacing utilities
        '.p-responsive': {
          'padding': 'clamp(1rem, 4vw, 2rem)',
        },
        '.px-responsive': {
          'padding-left': 'clamp(1rem, 4vw, 2rem)',
          'padding-right': 'clamp(1rem, 4vw, 2rem)',
        },
        '.py-responsive': {
          'padding-top': 'clamp(1rem, 4vw, 2rem)',
          'padding-bottom': 'clamp(1rem, 4vw, 2rem)',
        },
        // Responsive grid utilities
        '.grid-responsive': {
          'display': 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          'gap': 'clamp(1rem, 3vw, 2rem)',
        },
        '.grid-responsive-sm': {
          'display': 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          'gap': 'clamp(0.5rem, 2vw, 1rem)',
        },
        '.grid-responsive-lg': {
          'display': 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
          'gap': 'clamp(1.5rem, 4vw, 3rem)',
        },
        // Safe area utilities for mobile devices
        '.pt-safe': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        '.pb-safe': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.pl-safe': {
          'padding-left': 'env(safe-area-inset-left)',
        },
        '.pr-safe': {
          'padding-right': 'env(safe-area-inset-right)',
        },
        // Aspect ratio utilities
        '.aspect-responsive': {
          'aspect-ratio': 'var(--aspect-ratio, 16/9)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}
