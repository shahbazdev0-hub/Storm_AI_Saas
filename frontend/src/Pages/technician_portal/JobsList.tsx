// src/pages/technician_portal/JobsList.tsx
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardDocumentListIcon,
  FunnelIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { api } from '../../services/api'

export default function JobsList() {
  const navigate = useNavigate()
  const [dateFilter, setDateFilter] = useState('today')
  const [statusFilter, setStatusFilter] = useState('all')

  // Fetch jobs data with filters
  const { data, isLoading, error } = useQuery({
    queryKey: ['technician-jobs', dateFilter, statusFilter],
    queryFn: async () => {
      const response = await api.get(`/technician-portal/jobs?date_filter=${dateFilter}&status_filter=${statusFilter}`)
      return response.data
    }
  })

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled'
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-gray-100 text-gray-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'border-l-gray-400',
      medium: 'border-l-yellow-400',
      high: 'border-l-orange-400',
      urgent: 'border-l-red-400',
      emergency: 'border-l-red-600'
    }
    return colors[priority] || 'border-l-gray-400'
  }

  const openNavigation = (location) => {
    if (location.latitude && location.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
      window.open(url, '_blank')
    } else if (location.street) {
      const address = `${location.street}, ${location.city}, ${location.state} ${location.zip_code}`
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      window.open(url, '_blank')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load jobs</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-blue-600 hover:text-blue-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const jobs = data?.jobs || []
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
          <p className="text-gray-600">View and manage your assigned jobs</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="block border border-gray-300 rounded-md p-2 text-sm"
                >
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this_week">This Week</option>
                  <option value="next_week">Next Week</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block border border-gray-300 rounded-md p-2 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No jobs found with the selected filters</p>
              <p className="text-sm text-gray-400 mt-2">Try changing your filters or check back later</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div 
                key={job.id} 
                className={`bg-white rounded-lg shadow-sm border-l-4 ${getPriorityColor(job.priority)}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center">
                        <h3 className="text-lg font-medium text-gray-900 mr-2">
                          {job.title || job.service_type}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {job.job_number} • {job.service_type}
                      </p>
                    </div>
                   <div className="text-right">
  <p className="text-sm font-medium text-gray-900">
    {formatDate(job.time_tracking?.scheduled_start || job.scheduled_date || job.created_at)}
  </p>
  <p className="text-sm text-gray-600">
    {formatTime(job.time_tracking?.scheduled_start || job.start_time || "09:00")} - {formatTime(job.time_tracking?.scheduled_end || job.end_time || "17:00")}
  </p>
</div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex flex-wrap gap-4 mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <UserIcon className="h-4 w-4 mr-1" />
                      {job.customer?.name || 'Unknown Customer'}
                    </div>
                    
                    {job.customer?.phone && (
                      <a 
                        href={`tel:${job.customer.phone}`}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <PhoneIcon className="h-4 w-4 mr-1" />
                        {job.customer.phone}
                      </a>
                    )}

                    {job.location && (
  <div className="flex items-center text-sm text-gray-600">
    <MapPinIcon className="h-4 w-4 mr-1" />
    <span className="truncate max-w-xs">
      {job.location?.street || 'No address'}, {job.location?.city || ''}
    </span>
  </div>
)}

                    {job.time_tracking?.scheduled_duration && (
                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {job.time_tracking.scheduled_duration} min
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/technician-portal/jobs/${job.id}`)}
                      className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                      View Details
                    </button>

                    {(job.status === 'scheduled' || job.status === 'confirmed') && (
                      <button
                        className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                      >
                        <PlayIcon className="h-4 w-4 mr-1" />
                        Start Job
                      </button>
                    )}

                    {job.location && (
                      <button
                        onClick={() => openNavigation(job.location)}
                        className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                        Navigate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Footer */}
        {jobs.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing <span className="font-medium">{jobs.length}</span> jobs
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-1"></div>
                  Medium Priority
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-3 h-3 bg-orange-400 rounded-full mr-1"></div>
                  High Priority
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-3 h-3 bg-red-400 rounded-full mr-1"></div>
                  Urgent
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}