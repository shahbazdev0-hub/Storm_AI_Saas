
// frontend/src/pages/field-service/Jobs.tsx - FIXED DATA MAPPING
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlayIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import moment from 'moment'

import { api } from '../../services/api'
import Modal from '../../components/ui/Modal'

interface Job {
  id: string
  job_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_type: string
  description: string
  address: string
  city: string
  state: string
  zip_code: string
  scheduled_date: string
  start_time: string
  end_time: string
  estimated_duration: number
  actual_duration?: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' | 'confirmed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  technician_id?: string
  technician_name?: string
  technician_phone?: string
  notes?: string
  special_instructions?: string
  equipment_needed: string[]
  photos: string[]
  customer_signature?: string
  completion_notes?: string
  created_at: string
  updated_at: string
}

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  on_hold: 'bg-gray-100 text-gray-800'
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

// 🔧 HELPER FUNCTION: Transform API response to match Job interface
const transformJobData = (apiJob: any): Job => {
  // Extract dates and times from various possible formats
  const scheduledStart = apiJob.scheduled_start || apiJob.time_tracking?.scheduled_start
  const scheduledEnd = apiJob.scheduled_end || apiJob.time_tracking?.scheduled_end
  
  const startMoment = scheduledStart ? moment(scheduledStart) : moment()
  const endMoment = scheduledEnd ? moment(scheduledEnd) : moment()
  
  return {
    id: apiJob.id || apiJob._id,
    job_number: apiJob.job_number || `JOB-${apiJob.id?.slice(-6)}`,
    
    // Customer info - handle nested structure
    customer_name: apiJob.customer?.name || apiJob.customer_name || 'Unknown Customer',
    customer_phone: apiJob.customer?.phone || apiJob.customer_phone || '',
    customer_email: apiJob.customer?.email || apiJob.customer_email || '',
    
    // Service info
    service_type: apiJob.job_type || apiJob.service_type || 'Service Call',
    description: apiJob.description || apiJob.notes || '',
    
    // Location - handle nested structure
    address: apiJob.location?.street || apiJob.address || '',
    city: apiJob.location?.city || apiJob.city || '',
    state: apiJob.location?.state || apiJob.state || '',
    zip_code: apiJob.location?.postal_code || apiJob.zip_code || '',
    
    // Schedule - extract from datetime
    scheduled_date: startMoment.format('YYYY-MM-DD'),
    start_time: startMoment.format('HH:mm'),
    end_time: endMoment.format('HH:mm'),
    
    // Duration
    estimated_duration: apiJob.estimated_duration || 
                       apiJob.time_tracking?.scheduled_duration || 
                       endMoment.diff(startMoment, 'minutes') || 
                       60,
    actual_duration: apiJob.actual_duration || apiJob.time_tracking?.actual_duration,
    
    // Status and priority
    status: (apiJob.status || 'scheduled').toLowerCase(),
    priority: (apiJob.priority || 'medium').toLowerCase(),
    
    // Technician info - handle nested structure
    technician_id: apiJob.technician?.id || apiJob.technician_id,
    technician_name: apiJob.technician?.name || 
                     (apiJob.technician?.first_name && apiJob.technician?.last_name 
                       ? `${apiJob.technician.first_name} ${apiJob.technician.last_name}`
                       : apiJob.technician_name) || '',
    technician_phone: apiJob.technician?.phone || apiJob.technician_phone || '',
    
    // Additional info
    notes: apiJob.notes || apiJob.description || '',
    special_instructions: apiJob.special_instructions || '',
    equipment_needed: apiJob.equipment_needed || [],
    photos: apiJob.photos || [],
    customer_signature: apiJob.customer_signature,
    completion_notes: apiJob.completion_notes,
    
    // Timestamps
    created_at: apiJob.created_at,
    updated_at: apiJob.updated_at
  }
}

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [technicianFilter, setTechnicianFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('today')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // ✅ FIXED: Transform API response to match Job interface
  const { data: jobs, isLoading, error } = useQuery<Job[]>({
    queryKey: ['field-jobs', searchTerm, statusFilter, technicianFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (technicianFilter !== 'all') params.append('technician_id', technicianFilter)
      if (dateFilter !== 'all') params.append('date', dateFilter)
      
      console.log('🔄 Fetching jobs from API...')
      
      const response = await api.get(`/jobs?${params.toString()}`)
      console.log('✅ Raw API Response:', response.data)
      
      // Handle different response structures
      let jobsArray = []
      
      if (Array.isArray(response.data)) {
        jobsArray = response.data
      } else if (response.data.jobs && Array.isArray(response.data.jobs)) {
        jobsArray = response.data.jobs
      } else if (response.data.results && Array.isArray(response.data.results)) {
        jobsArray = response.data.results
      } else if (response.data.data && Array.isArray(response.data.data)) {
        jobsArray = response.data.data
      }
      
      console.log('📋 Found jobs:', jobsArray.length)
      
      // Transform each job to match our interface
      const transformedJobs = jobsArray.map(transformJobData)
      console.log('✅ Transformed jobs:', transformedJobs)
      
      return transformedJobs
    },
    retry: 2,
    onError: (error: any) => {
      console.error('❌ Jobs API Error:', error)
      toast.error(error.response?.data?.detail || 'Failed to fetch jobs')
    }
  })

  // ✅ FIXED: Try both endpoints with fallback
  const { data: technicians } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      try {
        // Try dedicated technicians endpoint first
        const response = await api.get('/technicians/')
        console.log('✅ Fetched from /technicians/', response.data)
        return response.data || []
      } catch (error1) {
        console.warn('⚠️ /technicians/ failed, trying /users/?role=technician')
        try {
          // Fallback to users endpoint with role filter
          const response = await api.get('/users/?role=technician')
          console.log('✅ Fetched from /users/?role=technician', response.data)
          return response.data || []
        } catch (error2) {
          console.error('❌ Both endpoints failed:', error1, error2)
          return []
        }
      }
    },
  })

  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const response = await api.patch(`/jobs/${jobId}`, { 
        status,
        ...(status === 'in_progress' && { actual_start_time: new Date().toISOString() }),
        ...(status === 'completed' && { actual_end_time: new Date().toISOString() })
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-jobs'] })
      toast.success('Job status updated!')
      setSelectedJob(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to update job')
    },
  })

  const handleStatusChange = (jobId: string, status: string) => {
    updateJobStatusMutation.mutate({ jobId, status })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return <ClockIcon className="h-4 w-4" />
      case 'in_progress':
        return <PlayIcon className="h-4 w-4" />
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4" />
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4" />
      case 'on_hold':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return <ClockIcon className="h-4 w-4" />
    }
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A'
    try {
      // Handle both HH:mm and full datetime formats
      if (timeString.includes('T')) {
        return moment(timeString).format('h:mm A')
      }
      return moment(`2000-01-01T${timeString}`).format('h:mm A')
    } catch {
      return timeString
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return moment(dateString).format('MMM DD, YYYY')
    } catch {
      return dateString
    }
  }

  const getJobStats = () => {
    if (!jobs || jobs.length === 0) {
      return { total: 0, scheduled: 0, inProgress: 0, completed: 0, cancelled: 0 }
    }
    
    return {
      total: jobs.length,
      scheduled: jobs.filter((job: Job) => job.status === 'scheduled' || job.status === 'confirmed').length,
      inProgress: jobs.filter((job: Job) => job.status === 'in_progress').length,
      completed: jobs.filter((job: Job) => job.status === 'completed').length,
      cancelled: jobs.filter((job: Job) => job.status === 'cancelled').length
    }
  }

  const stats = getJobStats()

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Field Service Jobs</h1>
            <p className="mt-1 text-sm text-gray-500">Loading jobs...</p>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Field Service Jobs</h1>
            <p className="mt-1 text-sm text-red-500">Error loading jobs</p>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center">
            <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Jobs</h3>
            <p className="text-gray-500 mb-4">
              {(error as any)?.response?.data?.detail || 'An error occurred while loading jobs'}
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['field-jobs'] })}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              Try Again
            </button>
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
          <h1 className="text-2xl font-bold text-gray-900">Field Service Jobs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all field service jobs and assignments ({jobs?.length || 0} jobs)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{stats.total}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Jobs</dt>
                  <dd className="text-lg font-medium text-gray-900">Today</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{stats.scheduled}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                  <dd className="text-lg font-medium text-gray-900">Pending</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{stats.inProgress}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                  <dd className="text-lg font-medium text-gray-900">Active</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{stats.completed}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">Done</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{stats.cancelled}</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Cancelled</dt>
                  <dd className="text-lg font-medium text-gray-900">Issues</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="on_hold">On Hold</option>
          </select>

          <select
            value={technicianFilter}
            onChange={(e) => setTechnicianFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Technicians</option>
            {technicians?.map((tech: any) => (
              <option key={tech.id} value={tech.id}>
                {tech.first_name && tech.last_name 
                  ? `${tech.first_name} ${tech.last_name}` 
                  : tech.name || 'Technician'}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="this_week">This Week</option>
            <option value="next_week">Next Week</option>
            <option value="all">All Dates</option>
          </select>

          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <FunnelIcon className="h-4 w-4 mr-2" />
            More Filters
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {!jobs || jobs.length === 0 ? (
          <div className="p-6 text-center">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Jobs Found</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all' || technicianFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your filters to see more jobs.'
                : 'There are no jobs scheduled for the selected time period.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {jobs.map((job: Job) => (
              <li key={job.id}>
                <div className="px-4 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          job.status === 'scheduled' || job.status === 'confirmed' ? 'bg-blue-500' :
                          job.status === 'in_progress' ? 'bg-yellow-500' :
                          job.status === 'completed' ? 'bg-green-500' :
                          job.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                        } text-white`}>
                          {getStatusIcon(job.status)}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <p className="text-sm font-medium text-gray-900">
                                #{job.job_number} - {job.customer_name}
                              </p>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                statusColors[job.status]
                              }`}>
                                {job.status.replace('_', ' ')}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                priorityColors[job.priority]
                              }`}>
                                {job.priority}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center mt-1 text-sm text-gray-500 gap-4">
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {formatDate(job.scheduled_date)} • {formatTime(job.start_time)} - {formatTime(job.end_time)}
                              </div>
                              
                              {job.technician_name && (
                                <div className="flex items-center">
                                  <UserIcon className="h-4 w-4 mr-1" />
                                  {job.technician_name}
                                </div>
                              )}
                              
                              <div className="flex items-center">
                                <MapPinIcon className="h-4 w-4 mr-1" />
                                {job.city && job.state ? `${job.city}, ${job.state}` : job.address}
                              </div>
                              
                              {job.customer_phone && (
                                <div className="flex items-center">
                                  <PhoneIcon className="h-4 w-4 mr-1" />
                                  {job.customer_phone}
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-1">
                              <span className="text-sm text-gray-600">{job.service_type}</span>
                              {job.description && (
                                <span className="ml-2 text-sm text-gray-500">• {job.description.substring(0, 100)}{job.description.length > 100 ? '...' : ''}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            {(job.status === 'scheduled' || job.status === 'confirmed') && (
                              <button
                                onClick={() => handleStatusChange(job.id, 'in_progress')}
                                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              >
                                Start
                              </button>
                            )}
                            
                            {job.status === 'in_progress' && (
                              <button
                                onClick={() => handleStatusChange(job.id, 'completed')}
                                className="px-3 py-1 text-sm font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                              >
                                Complete
                              </button>
                            )}
                            
                            <button
                              onClick={() => setSelectedJob(job)}
                              className="p-1 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        
                        {job.special_instructions && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                            <strong>Special Instructions:</strong> {job.special_instructions}
                          </div>
                        )}
                        
                        {job.equipment_needed && job.equipment_needed.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-xs text-gray-500 mr-2">Equipment:</span>
                            {job.equipment_needed.map((item, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <Modal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title={`Job #${selectedJob.job_number} - ${selectedJob.customer_name}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span>{selectedJob.customer_name}</span>
                  </div>
                  {selectedJob.customer_phone && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <a href={`tel:${selectedJob.customer_phone}`} className="text-primary-600 hover:text-primary-800">
                        {selectedJob.customer_phone}
                      </a>
                    </div>
                  )}
                  {selectedJob.customer_email && (
                    <div className="flex items-center">
                      <span className="text-sm">📧 {selectedJob.customer_email}</span>
                    </div>
                  )}
                  <div className="flex items-start">
                    <MapPinIcon className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                    <span>{selectedJob.address}{selectedJob.city && `, ${selectedJob.city}`}{selectedJob.state && `, ${selectedJob.state}`} {selectedJob.zip_code}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Job Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Service:</span>
                    <span className="ml-2 font-medium">{selectedJob.service_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[selectedJob.status]
                    }`}>
                      {selectedJob.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Priority:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      priorityColors[selectedJob.priority]
                    }`}>
                      {selectedJob.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Scheduled:</span>
                    <span className="ml-2">{formatDate(selectedJob.scheduled_date)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Time:</span>
                    <span className="ml-2">{formatTime(selectedJob.start_time)} - {formatTime(selectedJob.end_time)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2">{selectedJob.estimated_duration} minutes</span>
                  </div>
                  {selectedJob.technician_name && (
                    <div>
                      <span className="text-gray-500">Technician:</span>
                      <span className="ml-2">{selectedJob.technician_name}</span>
                      {selectedJob.technician_phone && (
                        <a href={`tel:${selectedJob.technician_phone}`} className="ml-2 text-primary-600 hover:text-primary-800">
                          {selectedJob.technician_phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {selectedJob.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{selectedJob.description}</p>
              </div>
            )}
            
            {selectedJob.special_instructions && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Special Instructions</h4>
                <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">{selectedJob.special_instructions}</p>
              </div>
            )}
            
            {selectedJob.equipment_needed && selectedJob.equipment_needed.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Equipment Needed</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.equipment_needed.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {selectedJob.notes && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{selectedJob.notes}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setSelectedJob(null)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            <button 
    onClick={() => {
      navigate('/scheduling/job-scheduler', { 
        state: { job: selectedJob } 
      })
    }}
    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
  >
    Edit Job
  </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}