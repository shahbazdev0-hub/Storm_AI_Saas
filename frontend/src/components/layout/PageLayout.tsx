// frontend/src/components/layout/PageLayout.tsx
import React from 'react'

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Main content area with proper spacing */}
      <div className="pb-32">
        {children}
      </div>
    </div>
  )
}

export default PageLayout