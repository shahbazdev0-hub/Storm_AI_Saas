// 1. frontend/src/pages/admin/ServiceManagement.tsx
import React from 'react'
import ServiceBuilderCanvas from '../../components/ai/ServiceBuilderCanvas'

const ServiceManagement: React.FC = () => {
  return (
    <div className="h-screen">
      <ServiceBuilderCanvas />
    </div>
  )
}

export default ServiceManagement