// 5. frontend/src/hooks/useServiceManagement.ts
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { serviceManagementService, Service, ServiceFlow } from '../services/serviceManagement.service'
import toast from 'react-hot-toast'

export const useServices = (activeOnly: boolean = false) => {
  return useQuery({
    queryKey: ['services', activeOnly],
    queryFn: () => serviceManagementService.getServices(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useCreateService = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: serviceManagementService.createService,
    onSuccess: () => {
      queryClient.invalidateQueries(['services'])
      toast.success('Service created successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create service')
    }
  })
}

export const useUpdateService = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: string, data: Partial<Service> }) =>
      serviceManagementService.updateService(serviceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['services'])
      toast.success('Service updated successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update service')
    }
  })
}

export const useDeleteService = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: serviceManagementService.deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries(['services'])
      toast.success('Service deleted successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete service')
    }
  })
}

export const useToggleService = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: serviceManagementService.toggleServiceStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['services'])
      toast.success('Service status updated!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to toggle service status')
    }
  })
}

export const useServiceFlows = () => {
  return useQuery({
    queryKey: ['service-flows'],
    queryFn: serviceManagementService.getFlows,
    staleTime: 5 * 60 * 1000,
  })
}

export const useSaveFlow = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: serviceManagementService.saveFlow,
    onSuccess: () => {
      queryClient.invalidateQueries(['service-flows'])
      toast.success('Flow saved successfully!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save flow')
    }
  })
}

export const useServiceAnalytics = (days: number = 30) => {
  return useQuery({
    queryKey: ['service-analytics', days],
    queryFn: () => serviceManagementService.getServiceAnalytics(days),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}