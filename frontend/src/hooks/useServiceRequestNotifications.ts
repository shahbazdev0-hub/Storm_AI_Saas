// frontend/src/hooks/useServiceRequestNotifications.ts - NEW FILE
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { serviceRequestsService } from '../services/serviceRequests.service'

export function useServiceRequestNotifications() {
  const [lastRequestCount, setLastRequestCount] = useState<number | null>(null)
  const queryClient = useQueryClient()

  // Poll for new service requests every 30 seconds
  const { data: stats } = useQuery({
    queryKey: ['service-requests-stats'],
    queryFn: () => serviceRequestsService.getServiceRequestsStats(),
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: true
  })

  useEffect(() => {
    if (stats && lastRequestCount !== null) {
      const currentCount = stats.total_requests
      const newRequestsCount = currentCount - lastRequestCount

      if (newRequestsCount > 0) {
        // Show notification for new requests
        toast.success(
          `${newRequestsCount} new service request${newRequestsCount > 1 ? 's' : ''} received!`,
          {
            duration: 5000,
            position: 'top-right',
            icon: '📋'
          }
        )

        // Invalidate related queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['service-requests'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      }
    }

    if (stats) {
      setLastRequestCount(stats.total_requests)
    }
  }, [stats, lastRequestCount, queryClient])

  return {
    pendingCount: stats?.pending_requests || 0,
    totalCount: stats?.total_requests || 0
  }
}