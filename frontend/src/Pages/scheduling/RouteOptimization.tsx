// frontend/src/pages/scheduling/RouteOptimization.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MapPinIcon,
  ClockIcon,
  TruckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { api } from '../../services/api'

interface Job {
  id: string
  customer_name: string
  address: string
  city: string
  state: string
  zip_code: string
  service_type: string
  estimated_duration: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  time_window?: { start: string; end: string }
  lat?: number
  lng?: number
}

interface Technician {
  id: string
  name: string
  phone: string
  skills: string[]
  current_location?: { lat: number; lng: number; address: string }
}

interface OptimizedRoute {
  technician_id: string
  technician_name: string
  jobs: Job[]
  total_distance: number
  total_drive_time: number
  total_service_time: number
  efficiency_score: number
  estimated_completion: string
}

interface RouteOptimizationResult {
  routes: OptimizedRoute[]
  total_distance: number
  total_time: number
  optimization_savings: {
    distance_saved: number
    time_saved: number
    fuel_cost_saved: number
  }
  unassigned_jobs: Job[]
}

export default function RouteOptimization() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedTechnician, setSelectedTechnician] = useState('all')
  const [optimizationRunning, setOptimizationRunning] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<RouteOptimizationResult | null>(null)

  const queryClient = useQueryClient()

  // Fetch jobs for the selected date
  const { data: jobs, isLoading: loadingJobs } = useQuery({
    queryKey: ['route-jobs', selectedDate],
    queryFn: async () => {
      const response = await api.get(`/jobs/?date=${selectedDate}&status=scheduled`)
      return response.data.jobs
    },
  })

  // Fetch technicians
  const { data: technicians, isLoading: loadingTechnicians } = useQuery({
    queryKey: ['technicians-routes'],
    queryFn: async () => {
      const response = await api.get('/users/?role=technician&active=true')
      return response.data
    },
  })

  // Optimize routes mutation
  // const optimizeRoutesMutation = useMutation({
  //   mutationFn: async (params: { date: string; technician_id?: string }) => {
  //     setOptimizationRunning(true)
  //     const response = await api.post('/scheduling/optimize-routes', params)
  //     return response.data
  //   },
  //   onSuccess: (data) => {
  //     setOptimizationResult(data)
  //     toast.success('Routes optimized successfully!')
  //   },
  //   onError: (error: any) => {
  //     toast.error(error.response?.data?.detail || 'Failed to optimize routes')
  //   },
  //   onSettled: () => {
  //     setOptimizationRunning(false)
  //   }
  // })

// Replace the optimizeRoutesMutation in your RouteOptimization.tsx (around line 88-108):

// Optimize routes mutation
// Replace the optimizeRoutesMutation in your RouteOptimization.tsx (around line 88-108):

// Optimize routes mutation
const optimizeRoutesMutation = useMutation({
  mutationFn: async (params: { date: string; technician_id?: string }) => {
    setOptimizationRunning(true)
    
    // Convert params to query string for GET request
    const queryParams = new URLSearchParams()
    queryParams.append('date', params.date)
    if (params.technician_id) {
      queryParams.append('technician_id', params.technician_id)
    }
    
    // Call the real API
    const response = await api.get(`/scheduling/optimize-routes?${queryParams.toString()}`)
    return response.data
  },
  onSuccess: (data) => {
    setOptimizationResult(data)
    toast.success('Routes optimized successfully!')
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.detail || 'Failed to optimize routes')
  },
  onSettled: () => {
    setOptimizationRunning(false)
  }
})

  // Apply optimized routes mutation
  const applyRoutesMutation = useMutation({
    mutationFn: async (routes: OptimizedRoute[]) => {
      const response = await api.post('/scheduling/apply-routes', { routes, date: selectedDate })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-jobs'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-jobs'] })
      toast.success('Optimized routes applied successfully!')
      setOptimizationResult(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to apply routes')
    }
  })

  const handleOptimizeRoutes = () => {
    const params: { date: string; technician_id?: string } = { date: selectedDate }
    if (selectedTechnician !== 'all') {
      params.technician_id = selectedTechnician
    }
    optimizeRoutesMutation.mutate(params)
  }

  const handleApplyRoutes = () => {
    if (optimizationResult) {
      applyRoutesMutation.mutate(optimizationResult.routes)
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-yellow-600',
      urgent: 'text-red-600'
    }
    return colors[priority as keyof typeof colors] || 'text-gray-600'
  }

  const getPriorityBg = (priority: string) => {
    const colors = {
      low: 'bg-gray-100',
      medium: 'bg-blue-100',
      high: 'bg-yellow-100',
      urgent: 'bg-red-100'
    }
    return colors[priority as keyof typeof colors] || 'bg-gray-100'
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatDistance = (miles: number) => {
    return `${miles.toFixed(1)} mi`
  }

  const getEfficiencyColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 80) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  if (loadingJobs || loadingTechnicians) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gray-200 h-96 rounded-lg"></div>
            <div className="bg-gray-200 h-96 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Route Optimization</h1>
          <p className="mt-1 text-sm text-gray-500">
            Optimize technician routes for maximum efficiency and cost savings
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
          
          <select
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value)}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Technicians</option>
            {technicians?.map((tech: Technician) => (
              <option key={tech.id} value={tech.id}>{tech.name}</option>
            ))}
          </select>
          
          <button
            onClick={handleOptimizeRoutes}
            disabled={optimizationRunning || !jobs?.length}
            className="inline-flex items-center bg-black px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${optimizationRunning ? 'animate-spin' : ''}`} />
            {optimizationRunning ? 'Optimizing...' : 'Optimize Routes'}
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPinIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Jobs</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {jobs?.length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TruckIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Technicians</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {selectedTechnician === 'all' ? technicians?.length || 0 : 1}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Est. Total Time</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {optimizationResult 
                      ? formatTime(optimizationResult.total_time)
                      : formatTime(jobs?.reduce((sum: number, job: Job) => sum + job.estimated_duration, 0) || 0)
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Efficiency Score</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {optimizationResult 
                      ? `${Math.round(optimizationResult.routes.reduce((sum, route) => sum + route.efficiency_score, 0) / optimizationResult.routes.length)}%`
                      : '--'
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Results */}
      {optimizationResult && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Optimization Results</h3>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                Potential savings: {formatDistance(optimizationResult.optimization_savings.distance_saved)} • 
                {formatTime(optimizationResult.optimization_savings.time_saved)} • 
                ${optimizationResult.optimization_savings.fuel_cost_saved.toFixed(2)}
              </div>
              <button
                onClick={handleApplyRoutes}
                disabled={applyRoutesMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Apply Routes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {optimizationResult.routes.map((route) => (
              <div key={route.technician_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-gray-900">{route.technician_name}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEfficiencyColor(route.efficiency_score)}`}>
                    {route.efficiency_score}% efficient
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Jobs:</span>
                    <span>{route.jobs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Distance:</span>
                    <span>{formatDistance(route.total_distance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drive time:</span>
                    <span>{formatTime(route.total_drive_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Service time:</span>
                    <span>{formatTime(route.total_service_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. completion:</span>
                    <span>{new Date(route.estimated_completion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-gray-900 uppercase tracking-wide">Route Order</h5>
                  {route.jobs.map((job, index) => (
                    <div key={job.id} className="flex items-center text-sm">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 truncate">{job.customer_name}</p>
                        <p className="text-gray-500 text-xs">{job.service_type}</p>
                      </div>
                      <div className={`flex-shrink-0 px-2 py-1 text-xs rounded ${getPriorityBg(job.priority)} ${getPriorityColor(job.priority)}`}>
                        {job.priority}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Unassigned Jobs */}
          {optimizationResult.unassigned_jobs.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Unassigned Jobs ({optimizationResult.unassigned_jobs.length})
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p className="mb-2">The following jobs could not be automatically assigned:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {optimizationResult.unassigned_jobs.map((job) => (
                        <li key={job.id}>
                          {job.customer_name} - {job.service_type}
                          {job.time_window && ` (${job.time_window.start} - ${job.time_window.end})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Jobs List */}
      {!optimizationResult && jobs?.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Scheduled Jobs for {new Date(selectedDate).toLocaleDateString()}
            </h3>
            
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Window
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map((job: Job) => (
                    <tr key={job.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {job.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.service_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.city}, {job.state}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(job.estimated_duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBg(job.priority)} ${getPriorityColor(job.priority)}`}>
                          {job.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.time_window 
                          ? `${job.time_window.start} - ${job.time_window.end}`
                          : 'Flexible'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!jobs?.length && !optimizationRunning && (
        <div className="text-center py-12">
          <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs scheduled</h3>
          <p className="text-gray-500">
            There are no jobs scheduled for {new Date(selectedDate).toLocaleDateString()}.
          </p>
        </div>
      )}
    </div>
  )
}