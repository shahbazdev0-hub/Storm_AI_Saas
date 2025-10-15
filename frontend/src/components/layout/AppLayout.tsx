// frontend/src/components/layout/AppLayout.tsx
import React from 'react'

interface AppLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  sidebar, 
  header, 
  footer 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      {header && (
        <div className="flex-shrink-0">
          {header}
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebar && (
          <div className="flex-shrink-0 w-64 bg-white shadow-sm">
            {sidebar}
          </div>
        )}
        
        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="pb-32"> {/* Space for footer */}
            {children}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      {footer && (
        <div className="flex-shrink-0 mt-auto">
          {footer}
        </div>
      )}
    </div>
  )
}

// Alternative simpler layout for pages
export const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-32"> {/* Ensure space for footer */}
        {children}
      </div>
    </div>
  )
}

export default AppLayout